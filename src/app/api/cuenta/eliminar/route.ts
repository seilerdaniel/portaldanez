import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  // Confirmación explícita: evita que un click accidental o un doble
  // submit borre la cuenta sin querer.
  if (body?.confirmacion !== "ELIMINAR") {
    return NextResponse.json({ error: "Falta confirmar la eliminación." }, { status: 400 });
  }

  const supabaseAdmin = createServiceRoleClient();

  // Borrar el usuario de auth.users dispara en cascada el borrado de su
  // perfil, libros, compras, reseñas, favoritos, notificaciones, etc.
  // (así están definidas las foreign keys desde la migración inicial).
  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error("[cuenta/eliminar] Error al eliminar el usuario:", error.message);
    return NextResponse.json({ error: "No pudimos eliminar tu cuenta. Intentá de nuevo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
