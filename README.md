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

## Split de pagos: cada escritor cobra directo (Mercado Pago Marketplace)

Se reemplazó el modelo de "saldo acumulado + retiro manual" por el split
automático de pagos de Mercado Pago:

- Cada escritor conecta su propia cuenta desde `/escritor/pagos` (botón
  "Conectar con Mercado Pago" → OAuth → vuelve conectado).
- El checkout ahora crea la preferencia de pago con el `access_token` **del
  escritor** (no el de la plataforma) y el campo `marketplace_fee` (el 20%,
  en pesos). Mercado Pago divide el pago automáticamente: el 80% se
  acredita **directo** en la cuenta del escritor, el 20% en la nuestra — en
  la misma operación. Portal Danez nunca llega a tener la plata del
  escritor en el medio.
- Un libro **no se puede comprar** si su autor todavía no conectó Mercado
  Pago — el checkout lo bloquea con un mensaje claro en vez de fallar
  a mitad de camino.
- El sistema viejo (`writer_payouts`, retiro manual, panel de admin para
  procesar retiros) se mantiene como respaldo, mostrado como "sistema
  anterior" en `/escritor/pagos`, para cualquier ajuste puntual que haga
  falta hacer a mano — pero ya no es el flujo principal.

### Nuevas variables de entorno necesarias

```
MERCADOPAGO_CLIENT_ID="..."
MERCADOPAGO_CLIENT_SECRET="..."
```

Se consiguen en el panel de desarrolladores de Mercado Pago → tu
aplicación → **OAuth** (son credenciales distintas del `Access Token`
simple que ya tenías). Al crear la app, elegí el modelo de integración
**Marketplace**.

### Cosas para verificar probando en sandbox

- **Elegibilidad de la cuenta**: el split de pagos ("Split de Pagos" /
  modelo marketplace vía OAuth) puede requerir habilitación específica
  según el tipo de cuenta de Mercado Pago Argentina. Probá el flujo
  completo en sandbox antes de asumir que funciona en producción tal cual.
- **Lectura del pago en el webhook**: el webhook sigue usando el
  `MERCADOPAGO_ACCESS_TOKEN` de la plataforma para consultar el detalle del
  pago (`GET /v1/payments/{id}`). Según la documentación, una app de
  marketplace puede leer los pagos de sus vendedores conectados — pero si
  en la práctica da 401/403, hay que cambiar esa consulta para usar el
  `access_token` del escritor en vez del de la plataforma (queda comentado
  en el código exactamente dónde).
- **Vencimiento de credenciales**: los tokens de cada escritor duran 6
  meses y se renuevan solos con el `refresh_token` (con margen de 1 día
  antes de vencer). Si un escritor revoca el acceso desde su propia cuenta
  de Mercado Pago, el checkout de sus libros va a fallar hasta que vuelva
  a conectar.

## Fase 3 completada: CI, rate limiting, paginación y tests de integración

- **CI en GitHub Actions** (`.github/workflows/ci.yml`): corre lint,
  typecheck, tests y un build completo en cada push/PR a `main`.
- **Rate limiting** en `/api/checkout` (10 intentos/minuto por usuario) y
  `/api/pagos/retiro` (5 cada 5 minutos), implementado en Postgres
  (`check_rate_limit()`, migración `0007`) — sin depender de un servicio
  externo como Redis, ya que el volumen de este proyecto no lo justifica.
- **Paginación real** (con `.range()`, no solo cortar en el frontend) en
  catálogo, autores, notificaciones y libros del escritor. De paso se
  corrigió el filtro de género del catálogo, que antes filtraba en
  JavaScript después de traer todos los libros — incompatible con
  paginación real, porque la página 2 podía quedarse sin resultados que en
  realidad existían.
- **Tests de integración** de `/api/checkout` (7 casos: sin sesión, rate
  limit, body inválido, libro inexistente, autor sin conectar, compra
  duplicada, y que la preferencia se arme con el token del escritor +
  `marketplace_fee` correcto) y **tests de seguridad** de la verificación
  de firma del webhook (11 casos, incluyendo rechazo de firmas fabricadas,
  replay attacks, y fail-closed sin secreto configurado). Total: 33 tests.

## Moderación de contenido para el admin

Desde la primera auditoría quedó marcado como hueco: cualquiera puede
publicar sin revisión previa, y no había ninguna forma de bajar un libro
problemático. Se agregó:

- `/admin/libros`: listado de todos los libros (publicados y borradores),
  con búsqueda por título y paginación.
- Acción de **despublicar con motivo**: el admin escribe un motivo breve,
  el libro deja de aparecer en el catálogo, y el autor recibe una
  notificación con el motivo exacto.
- Migración `0008_admin_moderacion.sql`: agrega el permiso de UPDATE que
  le faltaba al admin sobre la tabla `books` (antes solo tenía SELECT).

- Migración `0009_mercadopago_oauth_state.sql`: agrega otra tabla al
  patrón anterior, para el "state" del flujo OAuth (protección CSRF). La
  primera versión lo guardaba en una cookie httpOnly del navegador, pero
  en la práctica esa cookie no siempre sobrevivía el viaje de ida y vuelta
  a Mercado Pago en algunos entornos de desarrollo (Windows/Git Bash).
  Como el usuario ya está autenticado en Portal Danez tanto al iniciar
  como al volver, se guarda el "state" del lado del servidor atado a su
  `profile_id` en vez de depender de una cookie — más robusto y sin
  ninguna dependencia del comportamiento de cookies del navegador.

## Panel por rol, menú de cuenta y Configuración

- **Menú desplegable en el header** (click en el avatar): Mi perfil,
  Favoritos, Notificaciones, Configuración, Cerrar sesión — y "Panel de
  administración" también ahí si el usuario es admin.
- **Pestañas por rol** (`PanelTabs`), agregadas en la parte de arriba de
  cada panel:
  - Lector: Mi biblioteca · Favoritos · Perfil · Configuración
  - Escritor: Resumen · Mis libros · Pagos · Perfil · Configuración
  - Admin: Resumen · Moderar libros · Perfil · Configuración
- **`/configuracion`** (nueva, común a los tres roles): actualizar
  contraseña, cerrar sesión, y eliminar cuenta (con confirmación explícita
  escribiendo "ELIMINAR" — advierte a los escritores que borrar la cuenta
  también borra sus libros publicados y el historial de ventas asociado,
  por cómo están definidas las foreign keys en cascada desde la migración
  inicial).
- `/perfil` ahora también sugiere activar el rol de escritor a los
  lectores que todavía no lo tienen.

- **`INSERT ... RETURNING` chocando con RLS en `books`**: publicar un libro
  fallaba con "new row violates row-level security policy" — pero solo
  cuando el código pedía `.select("id").single()` encadenado al insert. Se
  confirmó con pruebas manuales en SQL: el mismo insert sin pedir el
  `RETURNING` funcionaba siempre; con `RETURNING`, Postgres evalúa la
  política de SELECT sobre la fila recién insertada en un momento de la
  transacción donde se comporta distinto a una lectura posterior separada
  (que sí funciona). Corregido separando el insert de la lectura del id en
  dos pasos, tanto en la publicación de libros como en el checkout
  (`purchases`, por las dudas, aunque ahí no se confirmó el mismo síntoma).

- **El checkout rechazaba TODAS las compras, no solo las de autores sin
  conectar**: la verificación de "¿el autor conectó Mercado Pago?" leía el
  campo `mercadopago_connected` directo de la tabla `profiles` del autor,
  pero usando los permisos del **comprador** — y RLS en `profiles` (a
  propósito) no deja que un usuario lea el perfil de otro. Esa lectura
  devolvía vacío siempre, así que el checkout bloqueaba la compra de
  cualquier libro, sin importar si el autor estaba realmente conectado.
  Corregido: se sacó esa verificación rota y se dejó como única fuente de
  verdad la que ya existía más abajo (`getValidAccessTokenParaEscritor`,
  que corre con permisos de servidor y sí es correcta). El nombre del
  autor para el resumen de la compra ahora se lee de `public_profiles`
  (la vista pensada para exactamente este caso).

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
   6. `supabase/migrations/0006_mercadopago_marketplace.sql`
   7. `supabase/migrations/0007_rate_limiting.sql`
   8. `supabase/migrations/0008_admin_moderacion.sql`
   9. `supabase/migrations/0009_mercadopago_oauth_state.sql`
   10. `supabase/migrations/0010_grant_service_role_tablas_nuevas.sql`
   11. `supabase/migrations/0011_grant_service_role_todas_las_tablas.sql`
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
