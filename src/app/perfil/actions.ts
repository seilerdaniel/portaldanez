"use server";

import { revalidatePath } from "next/cache";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { perfilSchema } from "@/lib/validation/schemas";
import type { EstadoActualizarPerfil } from "./perfil-form";

export async function actualizarPerfil(
  _prevState: EstadoActualizarPerfil,
  formData: FormData
): Promise<EstadoActualizarPerfil> {
  const actual = await requireUsuario("/perfil");

  const validacion = perfilSchema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio"),
    website: formData.get("website"),
    location: formData.get("location"),
  });

  if (!validacion.success) {
    return {
      ok: false,
      mensaje: validacion.error.issues[0]?.message ?? "Revisá los datos ingresados.",
    };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: validacion.data.displayName,
      bio: validacion.data.bio || null,
      website: validacion.data.website || null,
      location: validacion.data.location || null,
    })
    .eq("user_id", actual.user.id);

  if (error) {
    return { ok: false, mensaje: "No pudimos guardar los cambios. Intentá de nuevo." };
  }

  revalidatePath("/perfil");
  revalidatePath("/", "layout"); // el header muestra el nombre/avatar en todas las páginas

  return { ok: true, mensaje: "Cambios guardados." };
}
