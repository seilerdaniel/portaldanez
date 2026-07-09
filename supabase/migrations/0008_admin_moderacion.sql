-- =============================================================
-- Permite al admin despublicar (o editar) cualquier libro.
--
-- La política "books_select_admin" (migración 0004) ya le daba al admin
-- visibilidad de todos los libros para las estadísticas del panel, pero
-- faltaba el permiso de UPDATE — necesario para la herramienta de
-- moderación de contenido: hoy cualquiera puede publicar sin revisión
-- previa, así que el admin necesita poder bajar un libro problemático.
-- =============================================================

create policy "books_update_admin"
  on public.books for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
