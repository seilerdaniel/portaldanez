-- =============================================================
-- Rate limiting simple, sin depender de un servicio externo (Redis/Upstash).
--
-- Implementa un limitador de ventana fija: por cada "clave" (por ejemplo,
-- "checkout:<user_id>" o "retiro:<user_id>"), cuenta cuántas veces se llamó
-- dentro de la ventana de tiempo actual, y lo incrementa de forma atómica
-- con un upsert. Es una solución que alcanza perfectamente para el
-- volumen de un proyecto de este tamaño, sin sumar infraestructura nueva.
-- =============================================================

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 1,
  primary key (key, window_start)
);

-- Sin RLS visible al cliente: esto solo lo usan Route Handlers server-side
-- con la service role key.
alter table public.rate_limits enable row level security;

-- Limpieza automática de ventanas viejas para que la tabla no crezca sin
-- límite (se llama de forma oportunista dentro de la misma función).
create or replace function public.check_rate_limit(
  _key text,
  _max_requests integer,
  _window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  _window_start timestamptz;
  _count integer;
begin
  -- Bucket de tiempo fijo: todas las llamadas dentro de la misma ventana
  -- de _window_seconds caen en el mismo _window_start.
  _window_start := to_timestamp(floor(extract(epoch from now()) / _window_seconds) * _window_seconds);

  insert into public.rate_limits (key, window_start, count)
  values (_key, _window_start, 1)
  on conflict (key, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into _count;

  -- Limpieza oportunista de ventanas viejas (más de 1 hora), para que la
  -- tabla no crezca indefinidamente sin necesitar un cron job aparte.
  delete from public.rate_limits where window_start < now() - interval '1 hour';

  return _count <= _max_requests;
end;
$$;
