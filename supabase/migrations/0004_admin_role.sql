-- =============================================================
-- Políticas para el rol "admin".
--
-- El rol ya existía en app_role desde la migración inicial, pero no había
-- ninguna política RLS que le diera visibilidad más allá de sus propios
-- datos, ni forma de procesar los retiros de los escritores. Esta
-- migración agrega exactamente eso, sin tocar el resto de las políticas.
-- =============================================================

create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, 'admin');
$$;

-- Visibilidad de solo lectura para estadísticas de la plataforma.
create policy "profiles_select_admin"
  on public.profiles for select
  using (public.is_admin(auth.uid()));

create policy "books_select_admin"
  on public.books for select
  using (public.is_admin(auth.uid()));

create policy "purchases_select_admin"
  on public.purchases for select
  using (public.is_admin(auth.uid()));

-- Retiros: el admin necesita verlos todos y poder cambiarles el estado
-- (pending -> processing -> completed/failed) a medida que los procesa
-- manualmente contra Mercado Pago.
create policy "payouts_select_admin"
  on public.writer_payouts for select
  using (public.is_admin(auth.uid()));

create policy "payouts_update_admin"
  on public.writer_payouts for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
