import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const despublicarSchema = z.object({
  reason: z.string().trim().min(10, "Contá brevemente el motivo (mínimo 10 caracteres).").max(500),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: rolesData } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const esAdmin = (rolesData ?? []).some((r) => r.role === "admin");
  if (!esAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const validacion = despublicarSchema.safeParse(body);

  if (!validacion.success) {
    return NextResponse.json(
      { error: validacion.error.issues[0]?.message ?? "Solicitud inválida" },
      { status: 400 }
    );
  }

  const { data: libro } = await supabase
    .from("books")
    .select("id, title, author_id, profiles:author_id(user_id)")
    .eq("id", params.id)
    .maybeSingle();

  if (!libro) {
    return NextResponse.json({ error: "No encontramos ese libro" }, { status: 404 });
  }

  const { error } = await supabase
    .from("books")
    .update({ is_published: false })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: "No pudimos despublicar el libro" }, { status: 500 });
  }

  const autor = libro.profiles as unknown as { user_id: string } | null;
  if (autor) {
    await supabase.from("notifications").insert({
      user_id: autor.user_id,
      type: "system",
      title: "Uno de tus libros fue despublicado",
      message: `"${libro.title}" ya no está visible en el catálogo. Motivo: ${validacion.data.reason}`,
      data: { book_id: libro.id },
    });
  }

  return NextResponse.json({ ok: true });
}
