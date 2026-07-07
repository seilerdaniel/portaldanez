-- =============================================================
-- Portal Danez — esquema inicial
--
-- Este archivo reemplaza el historial de 15 migraciones incrementales
-- del proyecto original (hecho en Lovable). Se consolida en una sola
-- migración legible y se aplican desde el día uno las correcciones de
-- seguridad que en el proyecto original se descubrieron y parchearon
-- después de haber estado expuestas en producción:
--
--   1. Los emails de cobro (Mercado Pago / PayPal) y el balance nunca
--      se exponen vía SELECT público — solo el dueño del perfil y una
--      vista pública explícita sin esos campos.
--   2. La política de storage para descargar libros comprados usa
--      coincidencia EXACTA de archivo, no LIKE (evita wildcard injection).
--   3. Un escritor NUNCA puede leer el archivo de un libro que no es
--      suyo, aunque tenga rol "writer". La política original permitía
--      esto por error (bug real encontrado en la auditoría del proyecto
--      anterior). Acá is_book_author() se evalúa contra el libro dueño
--      del archivo, no solo "es escritor".
--   4. Las compras son inmutables (sin UPDATE/DELETE por el usuario).
--   5. Se agrega un flujo de retiro real (writer_payouts) con estados
--      y una función que descuenta el balance de forma atómica.
-- =============================================================

-- ---------- Extensiones ----------
create extension if not exists "pgcrypto";

-- ---------- Tipos ----------
create type public.app_role as enum ('reader', 'writer', 'admin');
create type public.payment_status as enum ('pending', 'completed', 'failed', 'refunded');
create type public.payout_status as enum ('pending', 'processing', 'completed', 'failed');
create type public.file_type as enum ('pdf', 'epub');

-- ---------- Géneros ----------
create table public.genres (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

alter table public.genres enable row level security;

create policy "genres_select_public"
  on public.genres for select
  using (true);

insert into public.genres (name, slug) values
  ('Ficción', 'ficcion'),
  ('No ficción', 'no-ficcion'),
  ('Poesía', 'poesia'),
  ('Ensayo', 'ensayo'),
  ('Novela', 'novela'),
  ('Cuento', 'cuento'),
  ('Terror', 'terror'),
  ('Romance', 'romance'),
  ('Ciencia ficción', 'ciencia-ficcion'),
  ('Fantasía', 'fantasia'),
  ('Historia', 'historia'),
  ('Biografía', 'biografia'),
  ('Autoayuda', 'autoayuda'),
  ('Infantil', 'infantil'),
  ('Juvenil', 'juvenil');

-- ---------- Perfiles ----------
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text not null,
  bio text,
  avatar_url text,
  website text,
  location text,
  social_links jsonb not null default '{}'::jsonb,
  mercadopago_email text,
  balance numeric(10, 2) not null default 0 check (balance >= 0),
  total_earnings numeric(10, 2) not null default 0 check (total_earnings >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Solo el dueño ve la fila completa (incluye balance y email de cobro).
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Vista pública: nunca expone balance / total_earnings / mercadopago_email.
create view public.public_profiles
  with (security_invoker = true) as
select
  id,
  display_name,
  bio,
  avatar_url,
  website,
  location,
  social_links,
  created_at
from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- ---------- Roles ----------
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create policy "user_roles_select_own"
  on public.user_roles for select
  using (auth.uid() = user_id);

create policy "user_roles_insert_self_writer"
  on public.user_roles for insert
  with check (
    auth.uid() = user_id
    and role = 'writer'
  );

-- ---------- Funciones helper (SECURITY DEFINER, search_path fijo) ----------
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace function public.is_writer(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, 'writer');
$$;

create or replace function public.get_profile_id(_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where user_id = _user_id limit 1;
$$;

-- ---------- Libros ----------
create table public.books (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  genre_id uuid references public.genres (id),
  title text not null,
  slug text not null unique,
  description text not null,
  synopsis text,
  price numeric(10, 2) not null check (price >= 0),
  cover_url text,
  file_url text,
  file_type public.file_type,
  page_count integer check (page_count is null or page_count > 0),
  language text not null default 'Español',
  isbn text,
  is_published boolean not null default false,
  is_featured boolean not null default false,
  total_sales integer not null default 0,
  total_revenue numeric(10, 2) not null default 0,
  average_rating numeric(2, 1) not null default 0,
  review_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.books enable row level security;

-- Se define acá (y no junto al resto de las funciones helper más arriba)
-- porque hace referencia a esta misma tabla: Postgres valida que las
-- relaciones referenciadas por una función `language sql` existan en el
-- momento de crearla, así que tiene que ir después del `create table`.
create or replace function public.is_book_author(_user_id uuid, _book_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.books b
    join public.profiles p on p.id = b.author_id
    where b.id = _book_id and p.user_id = _user_id
  );
$$;

create policy "books_select_published_or_own"
  on public.books as permissive for select
  using (is_published = true or public.is_book_author(auth.uid(), id));

create policy "books_insert_own_as_writer"
  on public.books as permissive for insert
  to authenticated
  with check (
    public.is_writer(auth.uid())
    and author_id = public.get_profile_id(auth.uid())
  );

create policy "books_update_own"
  on public.books as permissive for update
  to authenticated
  using (public.is_book_author(auth.uid(), id))
  with check (public.is_book_author(auth.uid(), id));

create policy "books_delete_own"
  on public.books as permissive for delete
  to authenticated
  using (public.is_book_author(auth.uid(), id));

-- ---------- Compras ----------
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  amount numeric(10, 2) not null,
  platform_fee numeric(10, 2) not null,
  author_earning numeric(10, 2) not null,
  payment_method text not null default 'mercadopago',
  payment_id text,
  payment_status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, book_id)
);

alter table public.purchases enable row level security;

create policy "purchases_select_own"
  on public.purchases for select
  using (auth.uid() = user_id);

create policy "purchases_select_as_author"
  on public.purchases for select
  using (public.is_book_author(auth.uid(), book_id));

create policy "purchases_insert_own"
  on public.purchases for insert
  with check (auth.uid() = user_id);

-- Inmutables: solo las modifica el webhook con la service role key (bypassea RLS).
create policy "purchases_no_update"
  on public.purchases for update
  using (false);

create policy "purchases_no_delete"
  on public.purchases for delete
  using (false);

-- Mismo motivo que is_book_author(): necesita que public.purchases ya exista.
create or replace function public.has_purchased(_user_id uuid, _book_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.purchases
    where user_id = _user_id
      and book_id = _book_id
      and payment_status = 'completed'
  );
$$;

-- ---------- Reseñas ----------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  is_verified_purchase boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, book_id)
);

alter table public.reviews enable row level security;

create policy "reviews_select_public"
  on public.reviews for select
  using (true);

create policy "reviews_insert_if_purchased"
  on public.reviews for insert
  with check (
    auth.uid() = user_id
    and public.has_purchased(auth.uid(), book_id)
  );

create policy "reviews_update_own"
  on public.reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "reviews_delete_own"
  on public.reviews for delete
  using (auth.uid() = user_id);

-- ---------- Favoritos ----------
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, book_id)
);

alter table public.favorites enable row level security;

create policy "favorites_select_own"
  on public.favorites for select
  using (auth.uid() = user_id);

create policy "favorites_insert_own"
  on public.favorites for insert
  with check (auth.uid() = user_id);

create policy "favorites_delete_own"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- ---------- Notificaciones ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('purchase', 'sale', 'payout', 'new_release', 'system')),
  title text not null,
  message text not null,
  data jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------- Retiros de escritores (flujo real, no solo la tabla) ----------
create table public.writer_payouts (
  id uuid primary key default gen_random_uuid(),
  writer_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  destination_email text not null,
  status public.payout_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.writer_payouts enable row level security;

create policy "payouts_select_own"
  on public.writer_payouts for select
  using (writer_id = public.get_profile_id(auth.uid()));

-- Las inserciones de retiro NO se hacen directo por el cliente: pasan por
-- request_payout() (abajo), que valida el balance de forma atómica.
create policy "payouts_no_direct_insert"
  on public.writer_payouts for insert
  with check (false);

-- Función que solicita un retiro: descuenta el balance y crea el registro
-- en una sola transacción, evitando condiciones de carrera entre dos
-- solicitudes simultáneas del mismo autor.
create or replace function public.request_payout(_amount numeric, _destination_email text)
returns public.writer_payouts
language plpgsql
security definer
set search_path = public
as $$
declare
  _profile_id uuid;
  _current_balance numeric;
  _payout public.writer_payouts;
begin
  if _amount <= 0 then
    raise exception 'El monto a retirar debe ser mayor a cero';
  end if;

  select id, balance into _profile_id, _current_balance
  from public.profiles
  where user_id = auth.uid()
  for update;

  if _profile_id is null then
    raise exception 'Perfil no encontrado';
  end if;

  if _current_balance < _amount then
    raise exception 'Saldo insuficiente para retirar ese monto';
  end if;

  update public.profiles
  set balance = balance - _amount
  where id = _profile_id;

  insert into public.writer_payouts (writer_id, amount, destination_email, status)
  values (_profile_id, _amount, _destination_email, 'pending')
  returning * into _payout;

  return _payout;
end;
$$;

-- ---------- Triggers ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_books_updated_at
  before update on public.books
  for each row execute function public.set_updated_at();

create trigger trg_reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- Perfil + rol de lector automáticos al registrarse.
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));

  insert into public.user_roles (user_id, role)
  values (new.id, 'reader');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Recalcula rating y cantidad de reseñas del libro.
create or replace function public.update_book_rating()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare
  _book_id uuid := coalesce(new.book_id, old.book_id);
begin
  update public.books
  set
    average_rating = (select coalesce(round(avg(rating)::numeric, 1), 0) from public.reviews where book_id = _book_id),
    review_count = (select count(*) from public.reviews where book_id = _book_id)
  where id = _book_id;

  return coalesce(new, old);
end;
$$;

create trigger trg_update_book_rating
  after insert or update or delete on public.reviews
  for each row execute function public.update_book_rating();

-- ---------- Storage ----------
insert into storage.buckets (id, name, public) values
  ('book-covers', 'book-covers', true),
  ('book-files', 'book-files', false),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Portadas y avatares: lectura pública, escritura solo en la carpeta propia.
create policy "book_covers_select_public"
  on storage.objects for select
  using (bucket_id = 'book-covers');

create policy "book_covers_insert_own_folder"
  on storage.objects for insert
  with check (
    bucket_id = 'book-covers'
    and public.is_writer(auth.uid())
    and (storage.foldername(name))[1] = public.get_profile_id(auth.uid())::text
    and storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp')
  );

create policy "avatars_select_public"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_insert_own_folder"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = public.get_profile_id(auth.uid())::text
    and storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp')
  );

-- Archivos de libros: privados. Solo el AUTOR DE ESE LIBRO específico
-- (no "cualquier escritor") o quien lo compró puede leerlo.
-- Esta es la corrección directa del bug encontrado en el proyecto anterior,
-- donde "is_writer(auth.uid())" alcanzaba para leer el archivo de CUALQUIER
-- libro de CUALQUIER autor.
create policy "book_files_select_owner_or_buyer"
  on storage.objects for select
  using (
    bucket_id = 'book-files'
    and (
      exists (
        select 1 from public.books b
        join public.profiles p on p.id = b.author_id
        where b.file_url = name and p.user_id = auth.uid()
      )
      or exists (
        select 1 from public.books b
        join public.purchases pu on pu.book_id = b.id
        where b.file_url = name
          and pu.user_id = auth.uid()
          and pu.payment_status = 'completed'
      )
    )
  );

create policy "book_files_insert_own_folder"
  on storage.objects for insert
  with check (
    bucket_id = 'book-files'
    and public.is_writer(auth.uid())
    and (storage.foldername(name))[1] = public.get_profile_id(auth.uid())::text
    and storage.extension(name) in ('pdf', 'epub')
  );

-- ---------- Webhook idempotency ----------
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  payment_id text not null unique,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.webhook_events enable row level security;

-- Sin políticas de acceso: solo la service role key (usada por el webhook)
-- puede leer/escribir esta tabla, porque esa key bypassea RLS por diseño.

-- ---------- Índices ----------
create index idx_books_author on public.books (author_id);
create index idx_books_genre on public.books (genre_id);
create index idx_books_published on public.books (is_published) where is_published = true;
create index idx_purchases_user on public.purchases (user_id);
create index idx_purchases_book on public.purchases (book_id);
create index idx_reviews_book on public.reviews (book_id);
create index idx_notifications_user_unread on public.notifications (user_id) where is_read = false;
