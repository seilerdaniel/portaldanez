import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { BookCard } from "@/components/libros/book-card";
import { COMISION_PLATAFORMA } from "@/lib/constants";

async function getLibrosDestacados() {
  const supabase = createClient();
  const { data } = await supabase
    .from("books")
    .select("slug, title, cover_url, price, average_rating, review_count, profiles:author_id(display_name)")
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("total_sales", { ascending: false })
    .limit(6);

  return (data ?? []).map((libro) => ({
    ...libro,
    autor: (libro.profiles as unknown as { display_name: string } | null)?.display_name ?? "Autor desconocido",
  }));
}

export default async function HomePage() {
  const libros = await getLibrosDestacados();

  return (
    <>
      {/* Hero: estantería de kiosco, no el gradiente-con-número genérico. */}
      <section className="border-b border-ink/10 bg-paper">
        <div className="container mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-pine">
              Editorial independiente · 100% argentina
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold italic leading-[1.1] md:text-5xl">
              Cada libro acá tiene un{" "}
              <span className="not-italic text-wine">sello</span> propio.
            </h1>
            <p className="mt-5 max-w-md text-ink-soft">
              Portal Danez es el kiosco digital de la literatura independiente
              argentina: publicá tu libro sin editorial, y llegá directo a
              quien te quiere leer.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/catalogo">
                <Button tamaño="lg">Explorar el catálogo</Button>
              </Link>
              <Link href="/convertirse-escritor">
                <Button tamaño="lg" variant="secundario">
                  Publicar mi libro
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-xs text-ink-soft">
              Sin costos fijos. Solo el {COMISION_PLATAFORMA * 100}% de comisión por
              venta — vos te quedás con el resto.
            </p>
          </div>

          {/* Estantería fanned de portadas, con el sello flotando sobre la destacada. */}
          <div className="relative mx-auto flex h-72 w-full max-w-sm items-end justify-center md:h-96">
            {libros.slice(0, 3).map((libro, i) => (
              <div
                key={libro.slug}
                className="absolute h-56 w-40 rounded-book bg-paper-card shadow-cover md:h-72 md:w-52"
                style={{
                  transform: `rotate(${(i - 1) * 8}deg) translateX(${(i - 1) * 70}px)`,
                  zIndex: i === 1 ? 2 : 1,
                }}
              >
                <div className="flex h-full items-center justify-center p-4 text-center font-display text-sm italic text-ink-soft">
                  {libro.title}
                </div>
              </div>
            ))}
            <div className="sello absolute -right-2 top-2 rotate-12 md:right-4">
              Nuevo
              <br />
              en el kiosco
            </div>
          </div>
        </div>
      </section>

      {/* Destacados */}
      <section className="container mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-semibold">Destacados esta semana</h2>
          <Link href="/catalogo" className="text-sm font-medium text-wine hover:underline">
            Ver todo el catálogo →
          </Link>
        </div>

        {libros.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
            {libros.map((libro) => (
              <BookCard key={libro.slug} book={libro} />
            ))}
          </div>
        ) : (
          <p className="mt-8 text-ink-soft">
            Todavía no hay libros publicados — sé el primer sello del catálogo.
          </p>
        )}
      </section>
    </>
  );
}
