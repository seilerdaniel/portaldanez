import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Next.js cachea automáticamente las respuestas de `fetch` en Server
 * Components. El cliente de Supabase usa `fetch` por debajo, así que sin
 * esto, datos como roles de usuario, saldo o estado de una compra pueden
 * quedar pegados en una versión vieja después de un cambio en la base,
 * incluso si el resto de la request es dinámica. Pasó de verdad: el rol de
 * admin insertado a mano por SQL no se reflejaba hasta reiniciar el server.
 */
function fetchSinCache(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, { ...init, cache: "no-store" });
}

/**
 * Cliente de Supabase para Server Components, Server Actions y Route
 * Handlers. Respeta la sesión del usuario vía cookies — las políticas RLS
 * siguen aplicando exactamente igual que en el cliente del browser.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: fetchSinCache },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Se llama desde un Server Component sin permiso de escritura;
            // el middleware ya se encarga de refrescar la sesión en ese caso.
          }
        },
      },
    }
  );
}

/**
 * Cliente con la service role key. SOLO se usa server-side, en Route
 * Handlers puntuales que necesitan bypassear RLS de forma controlada
 * (ej. el webhook de Mercado Pago verificando su propia firma primero).
 * Nunca importar este archivo desde un Client Component.
 */
export function createServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no está configurada.");
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      global: { fetch: fetchSinCache },
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  );
}
