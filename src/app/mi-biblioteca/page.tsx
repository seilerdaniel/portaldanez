import type { Metadata } from "next";
import Link from "next/link";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BookCard } from "@/components/libros/book-card";
import { formatearMoneda } from "@/lib/constants";
import { PanelTabs } from "@/components/layout/panel-tabs";

export const metadata: Metadata = { title: "Mi biblioteca" };

export default async function MiBibliotecaPage() {
  const actual = await requireUsuario("/mi-biblioteca");
  const supabase = createClient();

  const [{ data: compras }, { count: totalFavoritos }, { count: notificacionesSinLeer }] = await Promise.all([
    supabase
      .from("purchases")
      .select(
        "id, amount, books(slug, title, cover_url, price, average_rating, review_count, profiles:author_id(display_name))"
      )
      .eq("user_id", actual.user.id)
      .eq("payment_status", "completed")
      .order("completed_at", { ascending: false }),
    supabase
      .from("favorites")
      .select("id", { count: "exact", head: true })
      .eq("user_id", actual.user.id),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", actual.user.id)
      .eq("is_read", false),
  ]);

  type LibroComprado = {
    slug: string;
    title: string;
    cover_url: string | null;
    price: number;
    average_rating: number;
    review_count: number;
    profiles: { display_name: string } | null;
  };

  const libros = (compras ?? [])
    .map((compra) => compra.books as unknown as LibroComprado | null)
    .filter((libro): libro is LibroComprado => !!libro)
    .map((libro) => ({ ...libro, autor: libro.profiles?.display_name ?? "—" }));

  const totalGastado = (compras ?? []).reduce((acc, c) => acc + Number(c.amount), 0);

  return (
    <div className="container mx-auto max-w-6xl px-6 py-12">
      <PanelTabs rol="lector" />
      <h1 className="font-display text-3xl font-semibold">Mi biblioteca</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded border border-ink/10 bg-paper-card p-5">
          <p className="text-sm text-ink-soft">Libros comprados</p>
          <p className="mt-1 font-mono text-xl font-semibold">{libros.length}</p>
        </div>
        <Link
          href="/favoritos"
          className="rounded border border-ink/10 bg-paper-card p-5 transition-colors hover:border-wine/40"
        >
          <p className="text-sm text-ink-soft">Favoritos guardados</p>
          <p className="mt-1 font-mono text-xl font-semibold">{totalFavoritos ?? 0}</p>
        </Link>
        <Link
          href="/notificaciones"
          className="rounded border border-ink/10 bg-paper-card p-5 transition-colors hover:border-wine/40"
        >
          <p className="text-sm text-ink-soft">Notificaciones sin leer</p>
          <p className="mt-1 font-mono text-xl font-semibold">{notificacionesSinLeer ?? 0}</p>
        </Link>
      </div>

      {libros.length > 0 && (
        <p className="mt-4 text-sm text-ink-soft">
          Invertiste {formatearMoneda(totalGastado)} apoyando autoras y autores independientes. Gracias.
        </p>
      )}

      {libros.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {libros.map((libro) => (
            <BookCard key={libro.slug} book={libro} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded border border-dashed border-ink/20 p-10 text-center">
          <p className="text-ink-soft">Todavía no compraste ningún libro.</p>
          <Link href="/catalogo" className="mt-3 inline-block text-sm font-medium text-wine hover:underline">
            Explorar el catálogo →
          </Link>
        </div>
      )}
    </div>
  );
}
