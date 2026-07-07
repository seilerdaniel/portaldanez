import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth";
import { PurchasePanel } from "@/components/libros/purchase-panel";
import { ReseñaForm } from "@/components/libros/resena-form";
import { BotonFavorito } from "@/components/libros/boton-favorito";

interface LibroPageProps {
  params: { slug: string };
}

async function getLibro(slug: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("books")
    .select(
      "id, title, description, synopsis, price, cover_url, page_count, language, average_rating, review_count, author_id, profiles:author_id(id, display_name, avatar_url), genres:genre_id(name, slug)"
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  return data;
}

export async function generateMetadata({ params }: LibroPageProps): Promise<Metadata> {
  const libro = await getLibro(params.slug);
  if (!libro) return { title: "Libro no encontrado" };

  return {
    title: libro.title,
    description: libro.description.slice(0, 155),
    openGraph: {
      title: libro.title,
      description: libro.description.slice(0, 155),
      images: libro.cover_url ? [libro.cover_url] : [],
    },
  };
}

export default async function LibroPage({ params }: LibroPageProps) {
  const libro = await getLibro(params.slug);
  if (!libro) notFound();

  const supabase = createClient();
  const actual = await getUsuarioActual();

  const [{ data: reseñas }, { data: compra }, { data: miReseña }] = await Promise.all([
    supabase
      .from("reviews")
      .select("rating, comment, created_at, is_verified_purchase, profiles:user_id(display_name)")
      .eq("book_id", libro.id)
      .order("created_at", { ascending: false })
      .limit(10),
    actual
      ? supabase
          .from("purchases")
          .select("id")
          .eq("book_id", libro.id)
          .eq("user_id", actual.user.id)
          .eq("payment_status", "completed")
          .maybeSingle()
      : Promise.resolve({ data: null }),
    actual
      ? supabase
          .from("reviews")
          .select("rating, comment")
          .eq("book_id", libro.id)
          .eq("user_id", actual.user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const { data: favorito } = actual
    ? await supabase
        .from("favorites")
        .select("id")
        .eq("book_id", libro.id)
        .eq("user_id", actual.user.id)
        .maybeSingle()
    : { data: null };

  const autor = libro.profiles as unknown as {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  const genero = libro.genres as unknown as { name: string; slug: string } | null;

  return (
    <div className="container mx-auto max-w-5xl px-6 py-12">
      <div className="grid gap-10 md:grid-cols-[280px_1fr]">
        <div>
          <div className="relative aspect-[2/3] overflow-hidden rounded-book bg-ink/5 shadow-cover">
            {libro.cover_url ? (
              <Image src={libro.cover_url} alt={`Portada de ${libro.title}`} fill className="object-cover" sizes="280px" priority />
            ) : (
              <div className="flex h-full items-center justify-center p-4 text-center font-display italic text-ink-soft">
                {libro.title}
              </div>
            )}
          </div>

          <div className="mt-6 md:hidden">
            <PurchasePanel
              bookId={libro.id}
              price={libro.price}
              estaAutenticado={!!actual}
              yaComprado={!!compra}
            />
          </div>
        </div>

        <div>
          {genero && (
            <Link
              href={`/catalogo?genero=${genero.slug}`}
              className="font-mono text-xs uppercase tracking-widest text-pine hover:underline"
            >
              {genero.name}
            </Link>
          )}

          <h1 className="mt-2 font-display text-3xl font-semibold">{libro.title}</h1>

          {autor && (
            <Link href={`/autor/${autor.id}`} className="mt-2 inline-block text-sm text-wine hover:underline">
              por {autor.display_name}
            </Link>
          )}

          {libro.review_count > 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 fill-mustard text-mustard" />
              <span className="font-medium">{libro.average_rating.toFixed(1)}</span>
              <span className="text-ink-soft">
                ({libro.review_count} {libro.review_count === 1 ? "reseña" : "reseñas"})
              </span>
            </div>
          )}

          <div className="mt-4">
            <BotonFavorito
              bookId={libro.id}
              estaAutenticado={!!actual}
              esFavoritoInicial={!!favorito}
            />
          </div>

          <p className="mt-6 whitespace-pre-line leading-relaxed text-ink-soft">
            {libro.description}
          </p>

          {libro.synopsis && (
            <>
              <h2 className="mt-8 font-display text-lg font-semibold">Sinopsis</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-soft">{libro.synopsis}</p>
            </>
          )}

          <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-ink/10 pt-6 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-ink-soft">Idioma</dt>
              <dd className="font-medium">{libro.language}</dd>
            </div>
            {libro.page_count && (
              <div>
                <dt className="text-ink-soft">Páginas</dt>
                <dd className="font-medium">{libro.page_count}</dd>
              </div>
            )}
          </dl>

          <div className="mt-10 hidden md:block md:max-w-xs">
            <PurchasePanel
              bookId={libro.id}
              price={libro.price}
              estaAutenticado={!!actual}
              yaComprado={!!compra}
            />
          </div>
        </div>
      </div>

      <section className="mt-16 border-t border-ink/10 pt-10">
        <h2 className="font-display text-2xl font-semibold">Reseñas de lectores</h2>

        {compra && actual && (
          <div className="mt-6">
            <ReseñaForm bookId={libro.id} userId={actual.user.id} reseñaExistente={miReseña} />
          </div>
        )}

        {reseñas && reseñas.length > 0 ? (
          <ul className="mt-6 space-y-6">
            {reseñas.map((reseña, i) => {
              const perfil = reseña.profiles as unknown as { display_name: string } | null;
              return (
                <li key={i} className="border-b border-ink/10 pb-6">
                  <div className="flex items-center gap-2">
                    <div className="flex" aria-label={`${reseña.rating} de 5 estrellas`}>
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={`h-4 w-4 ${
                            idx < reseña.rating ? "fill-mustard text-mustard" : "text-ink/20"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">{perfil?.display_name ?? "Lector"}</span>
                    {reseña.is_verified_purchase && (
                      <span className="text-xs text-pine">Compra verificada</span>
                    )}
                  </div>
                  {reseña.comment && <p className="mt-2 text-ink-soft">{reseña.comment}</p>}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-6 text-ink-soft">Todavía no hay reseñas para este libro.</p>
        )}
      </section>
    </div>
  );
}
