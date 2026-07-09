import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * OAuth "Split de pagos" de Mercado Pago.
 *
 * Documentación: cada escritor conecta su propia cuenta de Mercado Pago
 * (flujo de autorización estándar OAuth2). El access_token resultante es
 * el que se usa para crear la preferencia de pago de SUS libros — no el
 * de la plataforma — junto con `marketplace_fee` para que Mercado Pago
 * nos retenga automáticamente nuestra comisión y le acredite el resto
 * directo a su cuenta, en la misma transacción.
 *
 * Los tokens vencen a los 6 meses (`expires_in` ≈ 15552000 segundos) y se
 * renuevan con el refresh_token — igual que un login que se vence.
 */

const MP_OAUTH_AUTHORIZE_URL = "https://auth.mercadopago.com/authorization";
const MP_OAUTH_TOKEN_URL = "https://api.mercadopago.com/oauth/token";

// Margen de seguridad: renovamos el token 1 día antes de que venza, no
// justo en el límite, para no arriesgarnos a un checkout fallido por una
// carrera entre "todavía es válido" y "ya venció hace un segundo".
const MARGEN_RENOVACION_MS = 24 * 60 * 60 * 1000;

export function getMercadoPagoConnectUrl(state: string) {
  const clientId = process.env.MERCADOPAGO_CLIENT_ID;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!clientId || !siteUrl) {
    throw new Error("Falta configurar MERCADOPAGO_CLIENT_ID o NEXT_PUBLIC_SITE_URL.");
  }

  const redirectUri = `${siteUrl}/api/mercadopago/conectar/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    platform_id: "mp",
    redirect_uri: redirectUri,
    state,
  });

  return `${MP_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Guarda el "state" del lado del servidor, atado al perfil del escritor,
 * en vez de una cookie del navegador. Como el usuario ya está autenticado
 * en Portal Danez tanto al iniciar la conexión como al volver del login de
 * Mercado Pago, esto alcanza para la protección CSRF sin depender de que
 * el navegador/entorno preserve una cookie a lo largo del viaje de ida y
 * vuelta (en la práctica, esa cookie no siempre sobrevivía).
 */
export async function guardarEstadoOAuth(profileId: string, state: string) {
  const supabaseAdmin = createServiceRoleClient();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutos

  const { error } = await supabaseAdmin
    .from("mercadopago_oauth_states")
    .upsert({ profile_id: profileId, state, expires_at: expiresAt });

  if (error) {
    console.error("[mercadopago/oauth] No pudimos guardar el state:", error.message);
    throw new Error("No pudimos iniciar la conexión con Mercado Pago. Probá de nuevo.");
  }
}

/**
 * Valida el "state" recibido en el callback contra el que se guardó al
 * iniciar la conexión, y lo borra (de un solo uso). Devuelve true si es
 * válido y no venció.
 */
export async function validarYConsumirEstadoOAuth(profileId: string, state: string) {
  const supabaseAdmin = createServiceRoleClient();

  const { data, error } = await supabaseAdmin
    .from("mercadopago_oauth_states")
    .select("state, expires_at")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    console.error("[mercadopago/oauth] Error al leer el state guardado:", error.message);
  }

  // De un solo uso: se borra apenas se lee, haya coincidido o no.
  await supabaseAdmin.from("mercadopago_oauth_states").delete().eq("profile_id", profileId);

  if (!data) {
    console.error(
      "[mercadopago/oauth] No había ningún state guardado para este perfil — o nunca se guardó, o ya se había consumido."
    );
    return false;
  }
  if (new Date(data.expires_at).getTime() < Date.now()) {
    console.error("[mercadopago/oauth] El state guardado ya había vencido.");
    return false;
  }

  return data.state === state;
}

interface TokenResponseMp {
  access_token: string;
  public_key: string;
  refresh_token: string;
  user_id: number | string;
  token_type: string;
  expires_in: number;
  scope: string;
}

async function intercambiarCodigoPorToken(code: string) {
  const clientId = process.env.MERCADOPAGO_CLIENT_ID;
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!clientId || !clientSecret || !siteUrl) {
    throw new Error("Faltan credenciales de OAuth de Mercado Pago.");
  }

  const respuesta = await fetch(MP_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: `${siteUrl}/api/mercadopago/conectar/callback`,
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`Mercado Pago rechazó el intercambio de código: ${detalle}`);
  }

  return (await respuesta.json()) as TokenResponseMp;
}

async function renovarToken(refreshToken: string) {
  const clientId = process.env.MERCADOPAGO_CLIENT_ID;
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Faltan credenciales de OAuth de Mercado Pago.");
  }

  const respuesta = await fetch(MP_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`No pudimos renovar el token de Mercado Pago: ${detalle}`);
  }

  return (await respuesta.json()) as TokenResponseMp;
}

/**
 * Completa la conexión: intercambia el código por tokens y los guarda.
 * Se llama desde /api/mercadopago/conectar/callback.
 */
export async function conectarCuentaMercadoPago(profileId: string, code: string) {
  const token = await intercambiarCodigoPorToken(code);
  const supabaseAdmin = createServiceRoleClient();

  const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();

  const { error } = await supabaseAdmin.from("writer_mercadopago_accounts").upsert({
    profile_id: profileId,
    mp_user_id: String(token.user_id),
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    public_key: token.public_key,
    scope: token.scope,
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error("No pudimos guardar la conexión con Mercado Pago.");
  }

  await supabaseAdmin
    .from("profiles")
    .update({
      mercadopago_connected: true,
      mercadopago_collector_id: String(token.user_id),
      mercadopago_connected_at: new Date().toISOString(),
    })
    .eq("id", profileId)
    .then(({ error: errorPerfil }) => {
      if (errorPerfil) {
        console.error(
          "[mercadopago/oauth] Se guardaron los tokens pero no pudimos marcar el perfil como conectado:",
          errorPerfil.message
        );
        throw new Error("No pudimos completar la conexión con Mercado Pago.");
      }
    });
}

export async function desconectarCuentaMercadoPago(profileId: string) {
  const supabaseAdmin = createServiceRoleClient();

  await supabaseAdmin.from("writer_mercadopago_accounts").delete().eq("profile_id", profileId);

  await supabaseAdmin
    .from("profiles")
    .update({
      mercadopago_connected: false,
      mercadopago_collector_id: null,
      mercadopago_connected_at: null,
    })
    .eq("id", profileId);
}

/**
 * Devuelve un access_token válido para crear el pago a nombre de este
 * escritor, renovándolo primero si está por vencer. Devuelve null si el
 * escritor nunca conectó su cuenta.
 */
export async function getValidAccessTokenParaEscritor(profileId: string): Promise<string | null> {
  const supabaseAdmin = createServiceRoleClient();

  const { data: cuenta } = await supabaseAdmin
    .from("writer_mercadopago_accounts")
    .select("access_token, refresh_token, expires_at")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!cuenta) return null;

  const vencePronto = new Date(cuenta.expires_at).getTime() - Date.now() < MARGEN_RENOVACION_MS;

  if (!vencePronto) {
    return cuenta.access_token;
  }

  try {
    const token = await renovarToken(cuenta.refresh_token);
    const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();

    await supabaseAdmin
      .from("writer_mercadopago_accounts")
      .update({
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: expiresAt,
      })
      .eq("profile_id", profileId);

    return token.access_token;
  } catch {
    // Si la renovación falla (por ejemplo, el escritor revocó el acceso
    // desde su cuenta de Mercado Pago), devolvemos el token viejo — el
    // checkout va a fallar con un error claro de Mercado Pago en ese caso,
    // en vez de que nosotros inventemos un estado incorrecto acá.
    return cuenta.access_token;
  }
}
