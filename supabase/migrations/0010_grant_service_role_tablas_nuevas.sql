-- =============================================================
-- Otorga permisos explícitos a `service_role` sobre las tablas creadas
-- después de la migración 0005.
--
-- Mismo motivo que el bug de permisos de `user_roles` (ver 0005): al
-- recrear el schema `public` a mano en su momento, el rol `service_role`
-- se quedó sin el GRANT automático que Supabase normalmente aplica a
-- tablas nuevas. `service_role` bypassea RLS, pero sigue necesitando el
-- permiso de tabla base — son dos capas distintas de Postgres.
--
-- Se detectó primero con `mercadopago_oauth_states`
-- ("permission denied for table mercadopago_oauth_states" al intentar
-- guardar el state de OAuth), pero por las dudas se cubren acá todas las
-- tablas creadas desde la 0006 en adelante, para no repetir este mismo
-- problema una por una a medida que se empiecen a usar.
-- =============================================================

grant select, insert, update, delete on
  public.writer_mercadopago_accounts,
  public.rate_limits,
  public.mercadopago_oauth_states
to service_role;
