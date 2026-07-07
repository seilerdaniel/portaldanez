-- =============================================================
-- Permite reintentar una compra que quedó en "pending" o "failed".
--
-- El checkout ahora usa upsert (ver /api/checkout) para no bloquear al
-- usuario si un intento anterior falló a mitad de camino. Un upsert con
-- conflicto ejecuta un UPDATE por dentro, así que la política
-- "purchases_no_update" (using (false)) lo bloqueaba por completo.
--
-- Esta política reemplaza esa restricción con una más específica:
--   - El usuario solo puede tocar SU PROPIA compra.
--   - Solo si todavía NO está "completed" (evita que alguien reabra o
--     manipule una compra ya pagada).
--   - Y el resultado de la actualización tiene que seguir siendo "pending"
--     (evita que el usuario se marque a sí mismo la compra como pagada;
--     eso lo sigue haciendo únicamente el webhook con la service role key,
--     que bypassea RLS).
-- =============================================================

drop policy if exists "purchases_no_update" on public.purchases;

create policy "purchases_retry_own_pending"
  on public.purchases for update
  using (auth.uid() = user_id and payment_status <> 'completed')
  with check (auth.uid() = user_id and payment_status = 'pending');
