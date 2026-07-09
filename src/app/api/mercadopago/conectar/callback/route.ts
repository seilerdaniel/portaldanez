import { NextResponse } from "next/server";
import { requireEscritor } from "@/lib/auth";
import { conectarCuentaMercadoPago, validarYConsumirEstadoOAuth } from "@/lib/mercadopago/oauth";

// Se arma siempre con NEXT_PUBLIC_SITE_URL (server-side, confiable) en vez
// de con request.url — igual que en el checkout: en un entorno con ngrok,
// request.url puede resolver a "localhost" en vez del dominio público, y
// terminaríamos redirigiendo al usuario a un origen distinto de donde
// arrancó (con la sesión de Supabase seteada para el otro dominio).
function urlPublica(path: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return new URL(path, siteUrl);
}

export async function GET(request: Request) {
  const actual = await requireEscritor();

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorMp = searchParams.get("error");

  const redirigirConError = (mensaje: string) =>
    NextResponse.redirect(urlPublica(`/escritor/pagos?mp_error=${encodeURIComponent(mensaje)}`));

  if (errorMp) {
    return redirigirConError("Cancelaste la conexión con Mercado Pago.");
  }

  if (!code || !state) {
    return redirigirConError("No pudimos validar la solicitud. Probá de nuevo.");
  }

  const stateValido = await validarYConsumirEstadoOAuth(actual.profile!.id, state);
  if (!stateValido) {
    return redirigirConError(
      "La solicitud de conexión venció o no es válida. Probá de nuevo desde el botón."
    );
  }

  try {
    await conectarCuentaMercadoPago(actual.profile!.id, code);
  } catch (err) {
    console.error(
      "[mercadopago/conectar/callback] Falló el intercambio de código:",
      err instanceof Error ? err.message : err
    );
    return redirigirConError("No pudimos completar la conexión con Mercado Pago.");
  }

  return NextResponse.redirect(urlPublica("/escritor/pagos?mp_conectado=1"));
}
