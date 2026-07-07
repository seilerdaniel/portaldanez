import type { Metadata } from "next";
import { requireEscritor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NuevoLibroForm } from "./nuevo-libro-form";

export const metadata: Metadata = { title: "Publicar un libro" };

export default async function NuevoLibroPage() {
  const actual = await requireEscritor();
  const supabase = createClient();
  const { data: generos } = await supabase.from("genres").select("id, name").order("name");

  return (
    <div className="container mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold">Publicar un libro nuevo</h1>
      <p className="mt-2 text-ink-soft">
        Se guarda como borrador. Vas a poder revisarlo y publicarlo desde la
        página de edición.
      </p>

      <div className="mt-8">
        <NuevoLibroForm generos={generos ?? []} profileId={actual.profile!.id} />
      </div>
    </div>
  );
}
