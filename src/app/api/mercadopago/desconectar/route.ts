import { NextResponse } from "next/server";
import { requireEscritor } from "@/lib/auth";
import { desconectarCuentaMercadoPago } from "@/lib/mercadopago/oauth";

export async function POST() {
  const actual = await requireEscritor();
  await desconectarCuentaMercadoPago(actual.profile!.id);
  return NextResponse.json({ ok: true });
}
