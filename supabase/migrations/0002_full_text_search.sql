-- =============================================================
-- Búsqueda de texto completo para libros.
--
-- Reemplaza el `ilike` simple del catálogo (que solo buscaba por título)
-- por full-text search de Postgres sobre título + descripción + sinopsis,
-- con soporte de acentos y stemming en español.
-- =============================================================

alter table public.books
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(synopsis, '')), 'C')
  ) stored;

create index idx_books_search_vector on public.books using gin (search_vector);
