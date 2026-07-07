import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const notificationId = typeof body?.notificationId === "string" ? body.notificationId : null;

  let query = supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id);

  // Sin notificationId, marca todas como leídas (RLS igual acota a las del usuario).
  if (notificationId) {
    query = query.eq("id", notificationId);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ error: "No pudimos actualizar la notificación" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
