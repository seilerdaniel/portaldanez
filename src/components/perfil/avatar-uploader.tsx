"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

interface AvatarUploaderProps {
  profileId: string;
  avatarUrlActual: string | null;
  nombreVisible: string;
}

const EXTENSIONES_PERMITIDAS = ["jpg", "jpeg", "png", "webp"] as const;
const TAMAÑO_MAX = 5 * 1024 * 1024; // 5MB

export function AvatarUploader({ profileId, avatarUrlActual, nombreVisible }: AvatarUploaderProps) {
  const router = useRouter();
  const supabase = createClient();
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [preview, setPreview] = useState<string | null>(avatarUrlActual);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setError(null);
    setGuardado(false);

    const extension = archivo.name.split(".").pop()?.toLowerCase() ?? "";
    if (!EXTENSIONES_PERMITIDAS.includes(extension as (typeof EXTENSIONES_PERMITIDAS)[number])) {
      setError(`Formato no permitido. Usá: ${EXTENSIONES_PERMITIDAS.join(", ")}`);
      return;
    }
    if (archivo.size > TAMAÑO_MAX) {
      setError("La imagen no puede superar los 5MB.");
      return;
    }

    setSubiendo(true);

    try {
      const ruta = `${profileId}/${crypto.randomUUID()}.${extension}`;

      const { error: errorSubida } = await supabase.storage
        .from("avatars")
        .upload(ruta, archivo, { contentType: archivo.type });

      if (errorSubida) throw new Error("No pudimos subir la imagen.");

      const { data: urlPublica } = supabase.storage.from("avatars").getPublicUrl(ruta);

      const { error: errorUpdate } = await supabase
        .from("profiles")
        .update({ avatar_url: urlPublica.publicUrl })
        .eq("id", profileId);

      if (errorUpdate) throw new Error("No pudimos guardar la nueva foto de perfil.");

      setPreview(urlPublica.publicUrl);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 4000);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-16 w-16 flex-none overflow-hidden rounded-full bg-pine">
        {preview ? (
          <Image src={preview} alt="" fill className="object-cover" sizes="64px" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xl font-semibold text-paper-card">
            {nombreVisible[0]?.toUpperCase() ?? "?"}
          </span>
        )}
      </div>

      <div>
        <label className="inline-block cursor-pointer text-sm font-medium text-wine hover:underline">
          {subiendo ? "Subiendo…" : preview ? "Cambiar foto" : "Subir foto de perfil"}
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={onFileChange}
            disabled={subiendo}
            className="sr-only"
          />
        </label>
        <p className="text-xs text-ink-soft">JPG, PNG o WEBP, máx. 5MB.</p>
        {error && (
          <p role="alert" className="mt-1 text-xs text-wine">
            {error}
          </p>
        )}
        {guardado && !error && (
          <p role="status" aria-live="polite" className="mt-1 text-xs text-pine">
            Foto actualizada.
          </p>
        )}
      </div>
    </div>
  );
}
