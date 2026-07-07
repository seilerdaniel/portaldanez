import type { Metadata } from "next";
import Link from "next/link";
import { requireEscritor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { formatearMoneda } from "@/lib/constants";

export const metadata: Metadata = { title: "Mis libros" };

export default async function MisLibrosPage() {
  const actual = await requireEscritor();
  const supabase = createClient();

  const { data: libros } = await supabase
    .from("books")
    .select("id, title, price, is_published, total_sales, average_rating")
    .eq("author_id", actual.profile!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Mis libros</h1>
        <Link href="/escritor/libros/nuevo">
          <Button>Publicar un libro nuevo</Button>
        </Link>
      </div>

      {libros && libros.length > 0 ? (
        <ul className="mt-8 divide-y divide-ink/10 rounded border border-ink/10 bg-paper-card">
          {libros.map((libro) => (
            <li key={libro.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{libro.title}</p>
                <p className="text-sm text-ink-soft">
                  {formatearMoneda(libro.price)} · {libro.total_sales} ventas ·{" "}
                  {libro.is_published ? "Publicado" : "Borrador"}
                </p>
              </div>
              <Link
                href={`/escritor/libros/${libro.id}/editar`}
                className="text-sm font-medium text-wine hover:underline"
              >
                Editar
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-ink-soft">Todavía no publicaste ningún libro.</p>
      )}
    </div>
  );
}
