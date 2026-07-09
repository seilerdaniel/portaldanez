import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { Paginador } from "@/components/ui/paginador";

export const metadata: Metadata = { title: "Autores" };

const POR_PAGINA = 24;

interface AutoresPageProps {
  searchParams: { pagina?: string };
}

export default async function AutoresPage({ searchParams }: AutoresPageProps) {
  const supabase = createClient();
  const pagina = Math.max(1, parseInt(searchParams.pagina ?? "1", 10) || 1);

  // Paso 1: solo los author_id de libros publicados (liviano — un solo
  // campo), para deduplicar y calcular la paginación sin traer perfiles
  // enteros de golpe.
  const { data: filas } = await supabase
    .from("books")
    .select("author_id")
    .eq("is_published", true);

  const idsUnicos = Array.from(new Set((filas ?? []).map((f) => f.author_id)));
  const total = idsUnicos.length;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const desde = (pagina - 1) * POR_PAGINA;
  const idsPagina = idsUnicos.slice(desde, desde + POR_PAGINA);

  // Paso 2: recién acá traemos los perfiles completos, y SOLO para los
  // autores de esta página — no para los 500 que pueda haber en total.
  const { data: perfiles } = idsPagina.length
    ? await supabase
        .from("public_profiles")
        .select("id, display_name, bio, avatar_url")
        .in("id", idsPagina)
    : { data: [] };

  const autores = perfiles ?? [];

  return (
    <div className="container mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold">Autores</h1>
      <p className="mt-2 text-ink-soft">Escritoras y escritores publicando en Portal Danez.</p>

      {autores.length > 0 ? (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {autores.map((autor) => (
            <li key={autor.id}>
              <Link
                href={`/autor/${autor.id}`}
                className="block rounded border border-ink/10 bg-paper-card p-5 transition-colors hover:border-wine/40"
              >
                <div className="flex items-center gap-3">
                  <Avatar avatarUrl={autor.avatar_url} nombre={autor.display_name} tamaño="sm" />
                  <p className="font-display font-semibold">{autor.display_name}</p>
                </div>
                {autor.bio && <p className="mt-3 line-clamp-2 text-sm text-ink-soft">{autor.bio}</p>}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-ink-soft">Todavía no hay autores con libros publicados.</p>
      )}

      <Paginador paginaActual={pagina} totalPaginas={totalPaginas} basePath="/autores" />
    </div>
  );
}
