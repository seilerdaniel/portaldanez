-- =============================================================
-- Conexión de cuentas de Mercado Pago por escritor (Split de pagos).
--
-- Reemplaza el modelo de "saldo acumulado + retiro manual" por el split
-- automático de Mercado Pago: cada escritor conecta su propia cuenta vía
-- OAuth, y en cada venta Mercado Pago le acredita el 80% DIRECTO a esa
-- cuenta y nos retiene el 20% (marketplace_fee) a nosotros, en la misma
-- transacción. Portal Danez deja de "tener" en algún momento la plata del
-- escritor — nunca la toca.
--
-- Los tokens de OAuth (access_token / refresh_token) son extremadamente
-- sensibles: quien los tenga puede operar la cuenta de Mercado Pago del
-- escritor. Por eso viven en una tabla aparte, SIN ninguna política RLS
-- que le dé acceso a anon/authenticated — solo la service role key (usada
-- exclusivamente en Route Handlers server-side) puede leerlos o escribirlos.
-- =============================================================

create table public.writer_mercadopago_accounts (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  mp_user_id text not null,
  access_token text not null,
  refresh_token text not null,
  public_key text,
  scope text,
  expires_at timestamptz not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.writer_mercadopago_accounts enable row level security;
-- A propósito: ninguna política = nadie con la anon/authenticated key puede
-- tocar esta tabla, ni siquiera el propio dueño del perfil. Solo la service
-- role key (que bypassea RLS) la usa, desde rutas server-side puntuales.

-- Estado de conexión, sin datos sensibles: esto sí lo puede leer el dueño
-- del perfil (para mostrar "Conectado ✓" en su propio dashboard).
alter table public.profiles
  add column mercadopago_connected boolean not null default false,
  add column mercadopago_collector_id text,
  add column mercadopago_connected_at timestamptz;

create or replace function public.set_updated_at_writer_mp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_writer_mp_accounts_updated_at
  before update on public.writer_mercadopago_accounts
  for each row execute function public.set_updated_at_writer_mp();
