import type { Metadata } from "next";
import Link from "next/link";
import { requireEscritor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { formatearMoneda } from "@/lib/constants";

export const metadata: Metadata = { title: "Panel de escritor" };

export default async function DashboardEscritorPage() {
  const actual = await requireEscritor();
  const supabase = createClient();

  const [{ data: libros }, { data: payoutsPendientes }, { count: reseñasSinLeer }] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, is_published, total_sales, total_revenue, average_rating")
      .eq("author_id", actual.profile!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("writer_payouts")
      .select("id, amount, status")
      .eq("writer_id", actual.profile!.id)
      .in("status", ["pending", "processing"]),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", actual.user.id)
      .eq("is_read", false),
  ]);

  const totalVentas = (libros ?? []).reduce((acc, l) => acc + l.total_sales, 0);
  const totalPublicados = (libros ?? []).filter((l) => l.is_published).length;
  const borradores = (libros ?? []).filter((l) => !l.is_published).length;
  const montoEnCamino = (payoutsPendientes ?? []).reduce((acc, p) => acc + Number(p.amount), 0);

  const masVendido = [...(libros ?? [])]
    .filter((l) => l.total_sales > 0)
    .sort((a, b) => b.total_sales - a.total_sales)[0];

  return (
    <div className="container mx-auto max-w-4xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold">
          Hola, {actual.profile?.display_name}
        </h1>
        <Link href="/escritor/libros/nuevo">
          <Button>Publicar un libro nuevo</Button>
        </Link>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        <div className="rounded border border-ink/10 bg-paper-card p-6">
          <p className="text-sm text-ink-soft">Saldo disponible</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-wine">
            {formatearMoneda(actual.profile?.balance ?? 0)}
          </p>
          {montoEnCamino > 0 && (
            <p className="mt-1 text-xs text-ink-soft">
              + {formatearMoneda(montoEnCamino)} en camino
            </p>
          )}
        </div>
        <div className="rounded border border-ink/10 bg-paper-card p-6">
          <p className="text-sm text-ink-soft">Libros publicados</p>
          <p className="mt-1 font-mono text-2xl font-semibold">{totalPublicados}</p>
          {borradores > 0 && (
            <p className="mt-1 text-xs text-ink-soft">
              {borradores} en borrador — no {borradores === 1 ? "aparece" : "aparecen"} en el catálogo
            </p>
          )}
        </div>
        <div className="rounded border border-ink/10 bg-paper-card p-6">
          <p className="text-sm text-ink-soft">Ventas totales</p>
          <p className="mt-1 font-mono text-2xl font-semibold">{totalVentas}</p>
          {masVendido && (
            <p className="mt-1 truncate text-xs text-ink-soft" title={masVendido.title}>
              Tu más vendido: {masVendido.title}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link href="/escritor/libros" className="font-medium text-wine hover:underline">
          Ver mis libros
        </Link>
        <Link href="/escritor/pagos" className="font-medium text-wine hover:underline">
          Ir a mis pagos
        </Link>
        <Link href="/notificaciones" className="font-medium text-wine hover:underline">
          Notificaciones
          {!!reseñasSinLeer && reseñasSinLeer > 0 && (
            <span className="ml-1 rounded-full bg-wine px-1.5 py-0.5 text-xs text-paper-card">
              {reseñasSinLeer}
            </span>
          )}
        </Link>
      </div>

      <h2 className="mt-10 font-display text-xl font-semibold">Tus libros</h2>
      {libros && libros.length > 0 ? (
        <ul className="mt-4 divide-y divide-ink/10 rounded border border-ink/10 bg-paper-card">
          {libros.map((libro) => (
            <li key={libro.id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <p className="font-medium">{libro.title}</p>
                <p className="text-ink-soft">
                  {libro.is_published ? "Publicado" : "Borrador"} · {libro.total_sales} ventas
                  {libro.average_rating > 0 && ` · ${libro.average_rating.toFixed(1)}★`}
                </p>
              </div>
              <Link
                href={`/escritor/libros/${libro.id}/editar`}
                className="font-medium text-wine hover:underline"
              >
                Editar
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">Todavía no publicaste ningún libro.</p>
      )}
    </div>
  );
}
