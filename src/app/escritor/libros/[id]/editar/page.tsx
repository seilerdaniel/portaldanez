import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireEscritor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EditarLibroForm } from "./editar-libro-form";

export const metadata: Metadata = { title: "Editar libro" };

interface EditarLibroPageProps {
  params: { id: string };
}

export default async function EditarLibroPage({ params }: EditarLibroPageProps) {
  const actual = await requireEscritor();
  const supabase = createClient();

  const [{ data: libro }, { data: generos }] = await Promise.all([
    supabase
      .from("books")
      .select(
        "id, title, description, synopsis, price, genre_id, language, page_count, isbn, is_published, cover_url, file_url, author_id"
      )
      .eq("id", params.id)
      .maybeSingle(),
    supabase.from("genres").select("id, name").order("name"),
  ]);

  // La RLS ya impide leer libros ajenos no publicados, pero esta
  // comparación explícita evita un 500 confuso y deja claro el motivo.
  if (!libro || libro.author_id !== actual.profile!.id) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold">Editar libro</h1>

      <div className="mt-8">
        <EditarLibroForm libro={libro} generos={generos ?? []} profileId={actual.profile!.id} />
      </div>
    </div>
  );
}
