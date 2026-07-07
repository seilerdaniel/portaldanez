import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookCard } from "@/components/libros/book-card";
import { Avatar } from "@/components/ui/avatar";

interface AutorPageProps {
  params: { id: string };
}

async function getAutor(id: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("public_profiles")
    .select("id, display_name, bio, avatar_url, website, location")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: AutorPageProps): Promise<Metadata> {
  const autor = await getAutor(params.id);
  return { title: autor?.display_name ?? "Autor" };
}

export default async function AutorPage({ params }: AutorPageProps) {
  const autor = await getAutor(params.id);
  if (!autor) notFound();

  const supabase = createClient();
  const { data: libros } = await supabase
    .from("books")
    .select("slug, title, cover_url, price, average_rating, review_count")
    .eq("author_id", params.id)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center gap-4">
        <Avatar avatarUrl={autor.avatar_url} nombre={autor.display_name} tamaño="md" />
        <div>
          <h1 className="font-display text-2xl font-semibold">{autor.display_name}</h1>
          {autor.location && <p className="text-sm text-ink-soft">{autor.location}</p>}
        </div>
      </div>

      {autor.bio && <p className="mt-6 max-w-2xl leading-relaxed text-ink-soft">{autor.bio}</p>}

      <h2 className="mt-10 font-display text-xl font-semibold">Libros publicados</h2>
      {libros && libros.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {libros.map((libro) => (
            <BookCard key={libro.slug} book={{ ...libro, autor: autor.display_name }} />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-ink-soft">Este autor todavía no publicó libros.</p>
      )}
    </div>
  );
}
