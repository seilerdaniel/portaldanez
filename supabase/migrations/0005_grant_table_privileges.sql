-- =============================================================
-- Otorga los permisos base de tabla a los roles anon/authenticated.
--
-- RLS controla QUÉ FILAS puede ver/tocar cada quien, pero antes de eso
-- Postgres exige un permiso más básico: que el rol pueda operar sobre la
-- tabla en absoluto (GRANT SELECT/INSERT/UPDATE/DELETE). Normalmente
-- Supabase configura esto automáticamente para tablas nuevas, pero al
-- recrear el schema `public` desde cero a mano (`drop schema public cascade`)
-- durante la corrección del orden de las migraciones, el `grant` que se dio
-- en ese momento solo cubrió el USAGE del schema, no los privilegios sobre
-- las tablas — de ahí el error "permission denied for table user_roles".
--
-- Esta migración lo deja explícito para todas las tablas, así no vuelve a
-- depender de qué haya hecho o no el comando que creó el schema.
-- =============================================================

grant select, insert, update, delete on
  public.genres,
  public.profiles,
  public.user_roles,
  public.books,
  public.purchases,
  public.reviews,
  public.favorites,
  public.notifications,
  public.writer_payouts
to authenticated;

grant select on public.genres, public.books, public.reviews to anon;

grant select on public.public_profiles to anon, authenticated;

-- webhook_events NO se otorga a anon/authenticated a propósito: solo la
-- service role key (que bypassea privilegios y RLS) debe poder tocarla.

-- Las funciones y secuencias usadas por las tablas de arriba (para
-- gen_random_uuid() en los defaults, y cualquier secuencia asociada).
grant usage on schema public to authenticated, anon;
