"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Campo } from "@/components/ui/campo";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/types/database";

export type EstadoActualizarPerfil = { ok: boolean; mensaje: string } | null;

interface PerfilFormProps {
  profile: Profile | null;
  accion: (
    prevState: EstadoActualizarPerfil,
    formData: FormData
  ) => Promise<EstadoActualizarPerfil>;
}

function BotonGuardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Guardar cambios"}
    </Button>
  );
}

export function PerfilForm({ profile, accion }: PerfilFormProps) {
  const [estado, formAction] = useFormState<EstadoActualizarPerfil, FormData>(accion, null);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <Campo label="Nombre visible" name="displayName" defaultValue={profile?.display_name} />

      <div>
        <label htmlFor="bio" className="text-sm font-medium">
          Biografía
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          defaultValue={profile?.bio ?? ""}
          className="mt-1.5 w-full rounded border border-ink/20 bg-paper-card px-4 py-2 text-sm"
        />
      </div>

      <Campo label="Sitio web" name="website" defaultValue={profile?.website ?? ""} />
      <Campo label="Ubicación" name="location" defaultValue={profile?.location ?? ""} />

      {estado && (
        <p
          role="status"
          aria-live="polite"
          className={`text-sm ${estado.ok ? "text-pine" : "text-wine"}`}
        >
          {estado.mensaje}
        </p>
      )}

      <BotonGuardar />
    </form>
  );
}
