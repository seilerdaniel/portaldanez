import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PayoutStatus } from "@/types/database";

const ESTADOS_VALIDOS: PayoutStatus[] = ["pending", "processing", "completed", "failed"];

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // No hace falta volver a chequear el rol acá: la política RLS
  // "payouts_update_admin" ya bloquea el UPDATE si el usuario no es admin.
  // Igual devolvemos un mensaje claro en vez de dejar que sea un 404 mudo.
  const { data: rolesData } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const esAdmin = (rolesData ?? []).some((r) => r.role === "admin");
  if (!esAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const nuevoEstado = body?.status;

  if (!ESTADOS_VALIDOS.includes(nuevoEstado)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const { error } = await supabase
    .from("writer_payouts")
    .update({
      status: nuevoEstado,
      processed_at: nuevoEstado === "completed" || nuevoEstado === "failed" ? new Date().toISOString() : null,
    })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: "No pudimos actualizar el retiro" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
