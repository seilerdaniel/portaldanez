import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { BookCard } from "@/components/libros/book-card";
import { Paginador } from "@/components/ui/paginador";

export const metadata: Metadata = {
  title: "Catálogo",
};

const POR_PAGINA = 20;

interface CatalogoPageProps {
  searchParams: { genero?: string; buscar?: string; pagina?: string };
}

async function getGeneros() {
  const supabase = createClient();
  const { data } = await supabase.from("genres").select("id, name, slug").order("name");
  return data ?? [];
}

async function getLibros(searchParams: CatalogoPageProps["searchParams"], generoId: string | null) {
  const supabase = createClient();
  const pagina = Math.max(1, parseInt(searchParams.pagina ?? "1", 10) || 1);
  const desde = (pagina - 1) * POR_PAGINA;
  const hasta = desde + POR_PAGINA - 1;

  let query = supabase
    .from("books")
    .select(
      "slug, title, cover_url, price, average_rating, review_count, profiles:author_id(display_name), genres:genre_id(name, slug)",
      { count: "exact" }
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

  // Filtro por género a nivel de base de datos (no en JS después de traer
  // todo) — es lo que permite que la paginación por rango sea correcta:
  // si filtráramos en memoria después del .range(), la página 2 podría
  // faltarle libros que quedaron descartados en la página 1.
  if (generoId) {
    query = query.eq("genre_id", generoId);
  }

  const { data, count } = await query.range(desde, hasta);

  const libros = (data ?? []).map((libro) => ({
    ...libro,
    autor: (libro.profiles as unknown as { display_name: string } | null)?.display_name ?? "—",
  }));

  return { libros, total: count ?? 0, pagina };
}

export default async function CatalogoPage({ searchParams }: CatalogoPageProps) {
  const generos = await getGeneros();
  const generoSeleccionado = searchParams.genero
    ? generos.find((g) => g.slug === searchParams.genero)
    : null;

  const { libros, total, pagina } = await getLibros(searchParams, generoSeleccionado?.id ?? null);
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <div className="container mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold">Catálogo</h1>
      <p className="mt-2 text-ink-soft">
        {total} {total === 1 ? "libro publicado" : "libros publicados"}
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

      <Paginador
        paginaActual={pagina}
        totalPaginas={totalPaginas}
        basePath="/catalogo"
        searchParams={{ genero: searchParams.genero, buscar: searchParams.buscar }}
      />
    </div>
  );
}
