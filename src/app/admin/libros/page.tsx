import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatearMoneda } from "@/lib/constants";
import { Paginador } from "@/components/ui/paginador";
import { PanelTabs } from "@/components/layout/panel-tabs";
import { AccionDespublicar } from "./accion-despublicar";

export const metadata: Metadata = { title: "Moderar libros" };

const POR_PAGINA = 25;

interface AdminLibrosPageProps {
  searchParams: { buscar?: string; pagina?: string };
}

export default async function AdminLibrosPage({ searchParams }: AdminLibrosPageProps) {
  await requireAdmin();
  const supabase = createClient();

  const pagina = Math.max(1, parseInt(searchParams.pagina ?? "1", 10) || 1);
  const desde = (pagina - 1) * POR_PAGINA;

  let query = supabase
    .from("books")
    .select(
      "id, title, price, is_published, total_sales, created_at, profiles:author_id(display_name)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (searchParams.buscar) {
    query = query.ilike("title", `%${searchParams.buscar}%`);
  }

  const { data: libros, count } = await query.range(desde, desde + POR_PAGINA - 1);
  const totalPaginas = Math.max(1, Math.ceil((count ?? 0) / POR_PAGINA));

  return (
    <div className="container mx-auto max-w-4xl px-6 py-12">
      <PanelTabs rol="admin" />
      <h1 className="font-display text-3xl font-semibold">Moderar libros</h1>
      <p className="mt-2 text-ink-soft">
        {count ?? 0} {count === 1 ? "libro en total" : "libros en total"} (publicados y borradores).
      </p>

      <form className="mt-6" role="search">
        <input
          type="search"
          name="buscar"
          defaultValue={searchParams.buscar}
          placeholder="Buscar por título…"
          className="h-11 w-full max-w-sm rounded border border-ink/20 bg-paper-card px-4 text-sm"
          aria-label="Buscar libros por título"
        />
      </form>

      {libros && libros.length > 0 ? (
        <ul className="mt-6 divide-y divide-ink/10 rounded border border-ink/10 bg-paper-card">
          {libros.map((libro) => {
            const autor = libro.profiles as unknown as { display_name: string } | null;
            return (
              <li key={libro.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{libro.title}</p>
                  <p className="text-sm text-ink-soft">
                    {autor?.display_name ?? "—"} · {formatearMoneda(libro.price)} ·{" "}
                    {libro.total_sales} ventas ·{" "}
                    {libro.is_published ? (
                      <span className="text-pine">Publicado</span>
                    ) : (
                      <span>Borrador</span>
                    )}
                  </p>
                </div>
                <AccionDespublicar bookId={libro.id} yaPublicado={libro.is_published} />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-6 text-ink-soft">No encontramos libros con esa búsqueda.</p>
      )}

      <Paginador
        paginaActual={pagina}
        totalPaginas={totalPaginas}
        basePath="/admin/libros"
        searchParams={{ buscar: searchParams.buscar }}
      />
    </div>
  );
}
