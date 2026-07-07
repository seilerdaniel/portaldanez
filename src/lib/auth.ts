import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, Profile } from "@/types/database";

/**
 * Devuelve el usuario autenticado y su perfil, o null si no hay sesión.
 * A diferencia del proyecto original (donde la protección de rutas de
 * escritor vivía solo en un componente de React del lado del cliente),
 * estas funciones corren en el servidor ANTES de renderizar la página:
 * la RLS de Postgres sigue siendo la última línea de defensa, pero la UI
 * de escritor nunca llega a enviarse al navegador de alguien sin el rol.
 */
export async function getUsuarioActual() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: rolesData }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  const roles = (rolesData ?? []).map((r) => r.role as AppRole);

  return {
    user,
    profile: profile as Profile | null,
    roles,
    esEscritor: roles.includes("writer"),
  };
}

/** Exige una sesión activa; si no hay, redirige a /auth/ingresar. */
export async function requireUsuario(siguiente?: string) {
  const actual = await getUsuarioActual();
  if (!actual) {
    const destino = siguiente ? `/auth/ingresar?next=${encodeURIComponent(siguiente)}` : "/auth/ingresar";
    redirect(destino);
  }
  return actual;
}

/** Exige sesión + rol de escritor; si no cumple, redirige a la página de alta. */
export async function requireEscritor() {
  const actual = await requireUsuario();
  if (!actual.esEscritor) {
    redirect("/convertirse-escritor");
  }
  return actual;
}

/** Exige sesión + rol de admin; si no cumple, manda a la home (no delatamos que existe /admin). */
export async function requireAdmin() {
  const actual = await requireUsuario();
  if (!actual.roles.includes("admin")) {
    redirect("/");
  }
  return actual;
}
