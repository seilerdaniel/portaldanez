import type { Metadata } from "next";
import Link from "next/link";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BookCard } from "@/components/libros/book-card";
import { PanelTabs } from "@/components/layout/panel-tabs";

export const metadata: Metadata = { title: "Mis favoritos" };

type LibroFavorito = {
  slug: string;
  title: string;
  cover_url: string | null;
  price: number;
  average_rating: number;
  review_count: number;
  profiles: { display_name: string } | null;
};

export default async function FavoritosPage() {
  const actual = await requireUsuario("/favoritos");
  const supabase = createClient();

  const { data: favoritos } = await supabase
    .from("favorites")
    .select(
      "id, books(slug, title, cover_url, price, average_rating, review_count, profiles:author_id(display_name))"
    )
    .eq("user_id", actual.user.id)
    .order("created_at", { ascending: false });

  const libros = (favoritos ?? [])
    .map((fav) => fav.books as unknown as LibroFavorito | null)
    .filter((libro): libro is LibroFavorito => !!libro)
    .map((libro) => ({ ...libro, autor: libro.profiles?.display_name ?? "—" }));

  const rol = actual.roles.includes("admin") ? "admin" : actual.esEscritor ? "escritor" : "lector";

  return (
    <div className="container mx-auto max-w-6xl px-6 py-12">
      <PanelTabs rol={rol} />
      <h1 className="font-display text-3xl font-semibold">Mis favoritos</h1>

      {libros.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {libros.map((libro) => (
            <BookCard key={libro.slug} book={libro} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded border border-dashed border-ink/20 p-10 text-center">
          <p className="text-ink-soft">Todavía no guardaste ningún libro como favorito.</p>
          <Link href="/catalogo" className="mt-3 inline-block text-sm font-medium text-wine hover:underline">
            Explorar el catálogo →
          </Link>
        </div>
      )}
    </div>
  );
}
