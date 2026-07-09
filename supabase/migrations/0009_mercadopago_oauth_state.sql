-- =============================================================
-- Reemplaza la cookie de "state" del flujo OAuth de Mercado Pago por un
-- registro server-side, asociado directamente al perfil del escritor.
--
-- El flujo original guardaba el "state" en una cookie httpOnly del
-- navegador y lo comparaba al volver del login de Mercado Pago. En la
-- práctica, esa cookie no estaba sobreviviendo el viaje de ida y vuelta en
-- algunos entornos de desarrollo (posiblemente por configuración de
-- localhost/proxy/navegador). Como en este flujo el usuario YA está
-- autenticado en Portal Danez tanto al iniciar como al volver, no hace
-- falta una cookie para la protección CSRF: alcanza con guardar el state
-- del lado del servidor, atado a su profile_id.
-- =============================================================

create table public.mercadopago_oauth_states (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  state text not null,
  expires_at timestamptz not null
);

alter table public.mercadopago_oauth_states enable row level security;
-- Sin políticas a propósito: solo la service role key (server-side) opera
-- esta tabla, igual que writer_mercadopago_accounts.
