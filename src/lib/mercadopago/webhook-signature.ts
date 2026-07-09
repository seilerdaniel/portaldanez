/**
 * Verificación de firma de los webhooks de Mercado Pago.
 *
 * Se extrajo a su propio módulo (en vez de vivir dentro del Route Handler)
 * para poder testearla de forma aislada — es la parte de más riesgo de
 * seguridad de todo el proyecto: si esto falla mal (por ejemplo, aceptando
 * una firma inválida), alguien podría fabricar notificaciones falsas de
 * "pago aprobado" sin haber pagado nada.
 */

export async function calcularHmac(secreto: string, mensaje: string) {
  const encoder = new TextEncoder();
  const clave = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const firma = await crypto.subtle.sign("HMAC", clave, encoder.encode(mensaje));
  return Array.from(new Uint8Array(firma))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Ventana de tolerancia para el timestamp de la firma: rechaza notificaciones
// viejas "reproducidas" (replay attack) más allá de este margen.
export const VENTANA_REPLAY_SEGUNDOS = 300;

export async function verificarFirmaMercadoPago(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string,
  secreto: string,
  ahoraMs: number = Date.now()
): Promise<boolean> {
  if (!xSignature || !xRequestId || !dataId || !secreto) return false;

  const partes = Object.fromEntries(
    xSignature
      .split(",")
      .map((p) => p.trim().split("=") as [string, string])
      .filter(([clave]) => !!clave)
  );
  const ts = partes.ts;
  const hash = partes.v1;
  if (!ts || !hash) return false;

  const tsNumero = parseInt(ts, 10);
  if (Number.isNaN(tsNumero)) return false;

  if (ahoraMs / 1000 - tsNumero > VENTANA_REPLAY_SEGUNDOS) return false;

  const manifiesto = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hashEsperado = await calcularHmac(secreto, manifiesto);

  return hashEsperado === hash;
}
