import type { Metadata } from "next";
import Link from "next/link";
import { requireUsuario } from "@/lib/auth";
import { AvatarUploader } from "@/components/perfil/avatar-uploader";
import { PerfilForm } from "./perfil-form";
import { actualizarPerfil } from "./actions";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function PerfilPage() {
  const actual = await requireUsuario("/perfil");

  return (
    <div className="container mx-auto max-w-xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold">Mi perfil</h1>

      <div className="mt-6">
        <AvatarUploader
          profileId={actual.profile!.id}
          avatarUrlActual={actual.profile?.avatar_url ?? null}
          nombreVisible={actual.profile?.display_name ?? "?"}
        />
      </div>

      <PerfilForm profile={actual.profile} accion={actualizarPerfil} />

      <div className="mt-10 border-t border-ink/10 pt-6 text-sm text-ink-soft">
        <p>Email: {actual.user.email}</p>
        <p className="mt-1">
          Rol{actual.roles.length > 1 ? "es" : ""}: {actual.roles.join(", ")}
        </p>
      </div>

      {!actual.esEscritor && (
        <div className="mt-6 rounded border border-mustard/30 bg-mustard/10 p-4 text-sm">
          <p className="font-medium">¿Escribís? Publicá tu libro en Portal Danez.</p>
          <Link href="/convertirse-escritor" className="mt-1 inline-block text-wine hover:underline">
            Activar mi cuenta de escritor →
          </Link>
        </div>
      )}
    </div>
  );
}
