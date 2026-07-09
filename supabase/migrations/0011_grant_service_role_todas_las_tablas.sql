-- =============================================================
-- Otorga permisos a `service_role` sobre TODAS las tablas del proyecto,
-- de una sola vez.
--
-- Ya nos encontramos este mismo bug dos veces (primero con
-- mercadopago_oauth_states, después silenciosamente con el UPDATE a
-- profiles dentro de la conexión OAuth): tablas donde `service_role` no
-- tenía el permiso base, probablemente desde que se recreó el schema
-- `public` a mano hace un tiempo. En vez de seguir encontrándolo tabla por
-- tabla a medida que se usan, se otorga acá de una vez sobre todas.
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
  public.writer_payouts,
  public.webhook_events,
  public.writer_mercadopago_accounts,
  public.rate_limits,
  public.mercadopago_oauth_states
to service_role;

grant select on public.public_profiles to service_role;

grant usage on schema public to service_role;
