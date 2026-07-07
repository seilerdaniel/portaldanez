import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  if (!REGEX_UUID.test(params.id)) {
    return NextResponse.json({ error: "ID de libro inválido" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: compra } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("book_id", params.id)
    .eq("payment_status", "completed")
    .maybeSingle();

  if (!compra) {
    return NextResponse.json({ error: "No tenés acceso a este libro" }, { status: 403 });
  }

  const { data: libro } = await supabase
    .from("books")
    .select("file_url, title")
    .eq("id", params.id)
    .maybeSingle();

  if (!libro?.file_url) {
    return NextResponse.json({ error: "El archivo no está disponible" }, { status: 404 });
  }

  // La signed URL se genera con la service role key porque el bucket es
  // privado, pero solo DESPUÉS de haber verificado la compra con RLS normal.
  const supabaseAdmin = createServiceRoleClient();
  const { data: signedUrl, error } = await supabaseAdmin.storage
    .from("book-files")
    .createSignedUrl(libro.file_url, 1800);

  if (error || !signedUrl) {
    return NextResponse.json({ error: "No pudimos generar el enlace de descarga" }, { status: 500 });
  }

  return NextResponse.json({ url: signedUrl.signedUrl, title: libro.title, expiresIn: 1800 });
}
