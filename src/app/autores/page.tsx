import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";

export const metadata: Metadata = { title: "Autores" };

export default async function AutoresPage() {
  const supabase = createClient();

  // Se listan autores con al menos un libro publicado, vía la vista pública
  // (nunca expone balance ni emails de cobro).
  const { data } = await supabase
    .from("books")
    .select("author_id, profiles:author_id(id, display_name, bio, avatar_url)")
    .eq("is_published", true);

  const autoresUnicos = new Map<
    string,
    { id: string; display_name: string; bio: string | null; avatar_url: string | null }
  >();

  for (const fila of data ?? []) {
    const perfil = fila.profiles as unknown as {
      id: string;
      display_name: string;
      bio: string | null;
      avatar_url: string | null;
    } | null;
    if (perfil && !autoresUnicos.has(perfil.id)) {
      autoresUnicos.set(perfil.id, perfil);
    }
  }

  const autores = Array.from(autoresUnicos.values());

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
    </div>
  );
}
