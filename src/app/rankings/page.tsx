import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { BookCard } from "@/components/libros/book-card";

export const metadata: Metadata = { title: "Rankings" };

type LibroRanking = {
  slug: string;
  title: string;
  cover_url: string | null;
  price: number;
  average_rating: number;
  review_count: number;
  total_sales: number;
  profiles: { display_name: string } | null;
};

async function getMasVendidos() {
  const supabase = createClient();
  const { data } = await supabase
    .from("books")
    .select(
      "slug, title, cover_url, price, average_rating, review_count, total_sales, profiles:author_id(display_name)"
    )
    .eq("is_published", true)
    .gt("total_sales", 0)
    .order("total_sales", { ascending: false })
    .limit(10);

  return (data ?? []) as unknown as LibroRanking[];
}

async function getMejorCalificados() {
  const supabase = createClient();
  const { data } = await supabase
    .from("books")
    .select(
      "slug, title, cover_url, price, average_rating, review_count, total_sales, profiles:author_id(display_name)"
    )
    .eq("is_published", true)
    // Al menos 3 reseñas para que el promedio no lo defina una sola persona.
    .gte("review_count", 3)
    .order("average_rating", { ascending: false })
    .limit(10);

  return (data ?? []) as unknown as LibroRanking[];
}

export default async function RankingsPage() {
  const [masVendidos, mejorCalificados] = await Promise.all([
    getMasVendidos(),
    getMejorCalificados(),
  ]);

  return (
    <div className="container mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold">Rankings</h1>
      <p className="mt-2 text-ink-soft">Lo que más se está leyendo en Portal Danez.</p>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-wine">Más vendidos</h2>
        {masVendidos.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
            {masVendidos.map((libro, i) => (
              <div key={libro.slug} className="relative">
                <span className="sello absolute -left-2 -top-2 z-10 !h-10 !w-10 rotate-[-8deg] !text-[0.55rem]">
                  #{i + 1}
                </span>
                <BookCard book={{ ...libro, autor: libro.profiles?.display_name ?? "—" }} />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-ink-soft">Todavía no hay ventas suficientes para armar un ranking.</p>
        )}
      </section>

      <section className="mt-14 border-t border-ink/10 pt-10">
        <h2 className="font-display text-xl font-semibold text-pine">Mejor calificados</h2>
        {mejorCalificados.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
            {mejorCalificados.map((libro) => (
              <BookCard key={libro.slug} book={{ ...libro, autor: libro.profiles?.display_name ?? "—" }} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-ink-soft">
            Todavía no hay libros con suficientes reseñas para armar este ranking.
          </p>
        )}
      </section>
    </div>
  );
}
