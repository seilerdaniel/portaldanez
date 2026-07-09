import type { Metadata } from "next";
import Link from "next/link";
import { requireEscritor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Paginador } from "@/components/ui/paginador";
import { formatearMoneda } from "@/lib/constants";

export const metadata: Metadata = { title: "Mis libros" };

const POR_PAGINA = 20;

interface MisLibrosPageProps {
  searchParams: { pagina?: string };
}

export default async function MisLibrosPage({ searchParams }: MisLibrosPageProps) {
  const actual = await requireEscritor();
  const supabase = createClient();
  const pagina = Math.max(1, parseInt(searchParams.pagina ?? "1", 10) || 1);
  const desde = (pagina - 1) * POR_PAGINA;

  const { data: libros, count } = await supabase
    .from("books")
    .select("id, title, price, is_published, total_sales, average_rating", { count: "exact" })
    .eq("author_id", actual.profile!.id)
    .order("created_at", { ascending: false })
    .range(desde, desde + POR_PAGINA - 1);

  const totalPaginas = Math.max(1, Math.ceil((count ?? 0) / POR_PAGINA));

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

      <Paginador paginaActual={pagina} totalPaginas={totalPaginas} basePath="/escritor/libros" />
    </div>
  );
}
