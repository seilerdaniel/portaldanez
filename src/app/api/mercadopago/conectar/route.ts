import { NextResponse } from "next/server";
import { requireEscritor } from "@/lib/auth";
import { getMercadoPagoConnectUrl, guardarEstadoOAuth } from "@/lib/mercadopago/oauth";

export async function GET() {
  // requireEscritor ya redirige a /auth/ingresar o /convertirse-escritor
  // si hace falta, así que si llegamos acá hay sesión y rol de escritor.
  const actual = await requireEscritor();

  // El "state" evita que alguien fuerce a un usuario a conectar una cuenta
  // de Mercado Pago que no es la suya vía un callback falsificado (CSRF).
  // Se guarda del lado del servidor, atado a este profile_id (no en una
  // cookie del navegador — ver comentario en guardarEstadoOAuth).
  const state = crypto.randomUUID();
  await guardarEstadoOAuth(actual.profile!.id, state);

  const url = getMercadoPagoConnectUrl(state);
  return NextResponse.redirect(url);
}
