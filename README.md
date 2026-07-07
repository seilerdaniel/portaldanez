# Portal Danez

Plataforma de autopublicación y venta de libros digitales para escritoras y
escritores independientes de Argentina. Reescritura completa del proyecto
original (hecho en Lovable) sin esa herramienta, con arquitectura y
prácticas de un proyecto Next.js productivo.

## Stack

- **Next.js 14** (App Router) + TypeScript estricto
- **Supabase**: Postgres + Auth + Storage + RLS (ver justificación abajo)
- **Tailwind CSS** con un sistema de diseño propio (ver `tailwind.config.ts`)
- **React Hook Form + Zod** para validación de formularios, compartida entre
  cliente y servidor
- **Mercado Pago** para cobros (Checkout Pro)
- **Vitest** + Testing Library para tests unitarios reales

### ¿Por qué se mantuvo Supabase?

Los problemas encontrados en la auditoría del proyecto original (acceso
cruzado entre escritores, inyección vía `LIKE` en storage, emails de cobro
expuestos) eran errores de las *políticas RLS*, no limitaciones de la
plataforma. Reimplementar auth/storage/permisos en un backend a medida
habría sido más trabajo por el mismo resultado, con más superficie para
cometer los mismos errores. La migración `supabase/migrations/0001_init.sql`
aplica las correcciones desde el día uno.

## Qué está resuelto de punta a punta

- Esquema SQL consolidado en una sola migración legible, con RLS corregida:
  - Un escritor **ya no puede** leer el archivo de un libro que no es suyo
    (el bug real del proyecto anterior).
  - Storage con políticas exactas por carpeta de dueño, no por patrón `LIKE`.
  - `profiles` nunca expone `balance` / `mercadopago_email` fuera del dueño;
    existe `public_profiles` para lo que sí es público.
  - Compras inmutables (sin `UPDATE`/`DELETE` desde el cliente).
- **Flujo de retiro real para escritores** (`request_payout()` +
  `/api/pagos/retiro` + UI en `/escritor/pagos`) — en el proyecto original
  el saldo se acumulaba pero no había forma de cobrarlo.
- Checkout y webhook de Mercado Pago con verificación de firma HMAC,
  fail-closed si falta el secreto, e idempotencia contra reintentos.
- Protección de rutas de escritor **en el servidor** (`requireEscritor()` en
  `lib/auth.ts`), no solo con un guard de React del lado del cliente.
- Catálogo, ficha de libro y perfil de autor con metadata dinámica para SEO
  (Next.js App Router renderiza esto en el servidor, a diferencia de la SPA
  original).
- Edición completa de libros (`/escritor/libros/[id]/editar`): publicar,
  reemplazar archivo/portada, o eliminar.
- Reseñas con estrellas (crear/editar), solo para compradores verificados.
- Favoritos, con botón en la ficha de libro y página `/favoritos`.
- Centro de notificaciones: campanita con contador en el header +
  página `/notificaciones` con "marcar todas como leídas".
- Rankings (`/rankings`): más vendidos y mejor calificados.
- Búsqueda de catálogo con **full-text search** de Postgres en español
  (título + descripción + sinopsis), no un `ilike` simple sobre el título.
- Tests unitarios reales sobre la lógica que más importa: el reparto de
  comisión (`lib/constants.test.ts`), los esquemas de validación
  (`lib/validation/schemas.test.ts`), y un test de regresión sobre el
  formulario de registro (`registro-form.test.tsx`) que hubiera atrapado
  el bug de `Campo` sin `forwardRef` que rompía TODOS los formularios del
  sitio (los inputs se veían completos pero el submit siempre tiraba
  "Required" en todos los campos).

## Qué queda como base para extender

Para no inflar el alcance de esta primera pasada, se dejaron sin construir
(pero con el mismo patrón ya establecido en el resto del código):

- Favoritos/notificaciones en tiempo real: hoy la campanita hace polling
  cada 60 segundos; se puede migrar a `supabase.channel(...)` para push
  instantáneo.
- Cupones de descuento, bundles, regalar un libro.
- Reprocesamiento real de `writer_payouts` (hoy quedan en estado `pending`
  a la espera de que alguien del equipo procese la transferencia — falta el
  job o integración que los mueva a `completed`).

## Auditoría de errores y panel de admin (segunda pasada)

Se hizo una revisión completa del proyecto buscando bugs reales y features
faltantes. Esto es lo que se encontró y se corrigió:

- **Webhook de Mercado Pago podía perder ventas o duplicar el pago al
  autor.** Marcaba el evento como "procesado" antes de terminar de
  procesarlo — si la llamada a la API de MP fallaba después, el reintento
  legítimo de Mercado Pago quedaba ignorado para siempre (la compra se
  quedaba en `pending` eternamente). Y si llegaban dos webhooks casi
  simultáneos, ambos podían pasar el chequeo de duplicado antes de que el
  primero terminara, acreditando el saldo del autor dos veces. Se corrigió
  basando la idempotencia en el estado real de la fila de `purchases`
  (`update ... where payment_status = 'pending'`), no en una tabla aparte.
- **Un pago fallido bloqueaba al comprador para siempre.** El checkout
  hacía un `insert` directo; si un primer intento fallaba después de crear
  la fila (por ejemplo, se caía la conexión con Mercado Pago), cualquier
  intento futuro de comprar ese mismo libro chocaba contra la restricción
  `unique(user_id, book_id)`. Se cambió a `upsert`, con una migración nueva
  (`0003_allow_purchase_retry.sql`) que ajusta la política RLS para permitir
  reintentar sin abrir la puerta a que alguien marque su propia compra como
  pagada.
- **Portadas de libro con `alt=""`** (tratadas como decorativas) — se
  corrigió a un texto descriptivo real para lectores de pantalla.
- **No existía ningún panel de administrador**, a pesar de que el rol
  `admin` ya estaba definido en la base desde el principio. Se agregó:
  `/admin/dashboard` con estadísticas de la plataforma (usuarios, libros
  publicados, ventas, comisión acumulada) y la gestión de retiros
  pendientes de escritores (pending → processing → completed/failed).
  **Importante**: no hay forma de auto-asignarse el rol admin desde la UI
  (a propósito). Para dar de alta al primer administrador, hacelo a mano
  desde el SQL Editor de Supabase:
  ```sql
  insert into public.user_roles (user_id, role)
  values ('<uuid-del-usuario>', 'admin');
  ```
- **No existía recuperación de contraseña.** Se agregó el flujo completo:
  `/auth/recuperar` (pedir el email) → `/auth/restablecer` (elegir nueva
  contraseña desde el link del email).
- Dashboards de escritor y lector con más contexto: saldo "en camino"
  (retiros en proceso), libro más vendido, borradores sin publicar,
  estadísticas de biblioteca del lector (libros comprados, favoritos,
  notificaciones sin leer, total invertido).
- Subida de foto de perfil (avatar real, no solo un círculo con la
  inicial) desde `/perfil`, visible en el header, en `/autor/[id]` y en
  el listado de `/autores`.

### Pendiente, sin resolver todavía

- Sin paginación en catálogo, autores, notificaciones ni libros del
  escritor — con cientos de libros esas páginas van a cargar todo de una.
- El manejo de `refunded`/`charged_back` de Mercado Pago no está
  implementado — el webhook los ignora a propósito hasta que se defina si
  el saldo se le revierte al autor automáticamente o queda para revisión
  manual desde `/admin/dashboard`.
- El panel de admin no ejecuta transferencias reales, solo lleva el
  registro de estado — falta decidir e integrar el mecanismo de pago
  real (manual vs. API de Payouts de Mercado Pago), tal como se dejó
  anotado en la Fase 2 del roadmap.

## Bugs encontrados durante la puesta a punto en Supabase real

- **Orden de funciones en la migración inicial**: `is_book_author()` y
  `has_purchased()` se definían antes de que existieran las tablas
  `books`/`purchases` que consultan. Ya corregido en `0001_init.sql`
  (las funciones ahora se definen justo después de sus tablas).
- **Permisos de tabla faltantes en `user_roles`**: al recrear el schema
  `public` a mano durante la corrección anterior, el rol `authenticated`
  se quedó sin privilegios básicos de `SELECT`/`INSERT`/etc. sobre las
  tablas (RLS controla qué filas se ven, pero antes de eso Postgres exige
  el permiso de tabla en sí). Se manifestaba como roles de usuario que
  parecían no existir en la app aunque estuvieran bien en la base — el
  usuario tenía el rol `admin` asignado correctamente, pero la consulta
  fallaba con `permission denied for table user_roles` (código `42501`) y
  el código lo interpretaba como "sin roles". Corregido en
  `0005_grant_table_privileges.sql`, que otorga los permisos explícitos en
  todas las tablas.
- **Caché de `fetch` de Next.js sirviendo datos de roles/sesión viejos**:
  Next cachea las respuestas de `fetch` en Server Components por defecto;
  como el cliente de Supabase usa `fetch` por debajo, un cambio en la base
  (como asignar un rol) podía no reflejarse hasta reiniciar el servidor.
  Corregido pasando `cache: "no-store"` explícito en los clientes
  server-side (`lib/supabase/server.ts` y `lib/supabase/middleware.ts`).

## Setup

```bash
npm install
cp .env.example .env.local   # completar con tus credenciales
```

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. Corré las migraciones, en orden (con `supabase db push` usando la CLI de
   Supabase, o pegando cada archivo en el SQL Editor en este orden):
   1. `supabase/migrations/0001_init.sql`
   2. `supabase/migrations/0002_full_text_search.sql`
   3. `supabase/migrations/0003_allow_purchase_retry.sql`
   4. `supabase/migrations/0004_admin_role.sql`
   5. `supabase/migrations/0005_grant_table_privileges.sql`
3. Completá `.env.local` con las claves de Supabase y Mercado Pago.
4. `npm run dev` y abrí `http://localhost:3000`.

### Scripts

```bash
npm run dev        # desarrollo
npm run build      # build de producción
npm run lint       # ESLint
npm run typecheck  # TypeScript sin emitir archivos
npm test           # Vitest
```
