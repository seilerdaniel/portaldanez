import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { BookCard } from "@/components/libros/book-card";

export const metadata: Metadata = {
  title: "Catálogo",
};

interface CatalogoPageProps {
  searchParams: { genero?: string; buscar?: string };
}

async function getLibros(searchParams: CatalogoPageProps["searchParams"]) {
  const supabase = createClient();

  let query = supabase
    .from("books")
    .select(
      "slug, title, cover_url, price, average_rating, review_count, genre_id, profiles:author_id(display_name), genres:genre_id(name, slug)"
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (searchParams.buscar) {
    // Full-text search en español sobre título + descripción + sinopsis,
    // en vez del ilike anterior que solo buscaba coincidencias en el título.
    query = query.textSearch("search_vector", searchParams.buscar, {
      type: "websearch",
      config: "spanish",
    });
  }

  const { data } = await query;

  let libros = (data ?? []).map((libro) => ({
    ...libro,
    autor: (libro.profiles as unknown as { display_name: string } | null)?.display_name ?? "—",
    genero: (libro.genres as unknown as { name: string; slug: string } | null) ?? null,
  }));

  if (searchParams.genero) {
    libros = libros.filter((libro) => libro.genero?.slug === searchParams.genero);
  }

  return libros;
}

async function getGeneros() {
  const supabase = createClient();
  const { data } = await supabase.from("genres").select("name, slug").order("name");
  return data ?? [];
}

export default async function CatalogoPage({ searchParams }: CatalogoPageProps) {
  const [libros, generos] = await Promise.all([getLibros(searchParams), getGeneros()]);

  return (
    <div className="container mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold">Catálogo</h1>
      <p className="mt-2 text-ink-soft">
        {libros.length} {libros.length === 1 ? "libro publicado" : "libros publicados"}
      </p>

      <form className="mt-8 flex flex-wrap gap-3" role="search">
        <input
          type="search"
          name="buscar"
          defaultValue={searchParams.buscar}
          placeholder="Buscar por título…"
          className="h-11 min-w-[240px] flex-1 rounded border border-ink/20 bg-paper-card px-4 text-sm"
          aria-label="Buscar libros por título"
        />
        <select
          name="genero"
          defaultValue={searchParams.genero ?? ""}
          className="h-11 rounded border border-ink/20 bg-paper-card px-4 text-sm"
          aria-label="Filtrar por género"
        >
          <option value="">Todos los géneros</option>
          {generos.map((genero) => (
            <option key={genero.slug} value={genero.slug}>
              {genero.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-11 rounded bg-wine px-5 text-sm font-medium text-paper-card hover:bg-wine-dark"
        >
          Filtrar
        </button>
      </form>

      {libros.length > 0 ? (
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {libros.map((libro) => (
            <BookCard key={libro.slug} book={libro} />
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded border border-dashed border-ink/20 p-10 text-center text-ink-soft">
          No encontramos libros con esos filtros. Probá con otra búsqueda.
        </p>
      )}
    </div>
  );
}
