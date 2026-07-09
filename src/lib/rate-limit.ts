import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Rate limiting simple basado en Postgres (función `check_rate_limit` de
 * la migración 0007). Pensado para endpoints sensibles como el checkout o
 * la solicitud de retiro, donde spamear el endpoint podría generar
 * preferencias de pago de más, o saturar el flujo de retiros.
 *
 * Devuelve `true` si la request está permitida, `false` si superó el límite.
 */
export async function checkRateLimit(key: string, maxRequests: number, windowSeconds: number) {
  const supabaseAdmin = createServiceRoleClient();

  const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
    _key: key,
    _max_requests: maxRequests,
    _window_seconds: windowSeconds,
  });

  if (error) {
    // Si el rate limiter en sí falla (por ejemplo, la función no existe
    // todavía porque falta correr la migración), preferimos dejar pasar
    // la request antes que tirar abajo el checkout por un problema nuestro.
    console.error("[rate-limit] Error al chequear el límite:", error.message);
    return true;
  }

  return data === true;
}
