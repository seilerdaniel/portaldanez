"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function EliminarCuenta({ esEscritor }: { esEscritor: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);

  async function eliminarCuenta() {
    setError(null);

    if (confirmacion !== "ELIMINAR") {
      setError('Escribí "ELIMINAR" (en mayúsculas) para confirmar.');
      return;
    }

    setEliminando(true);

    const respuesta = await fetch("/api/cuenta/eliminar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmacion }),
    });

    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => ({}));
      setError(cuerpo.error ?? "No pudimos eliminar tu cuenta.");
      setEliminando(false);
      return;
    }

    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="rounded border border-wine/30 bg-wine/5 p-5">
      <p className="font-medium text-wine">Eliminar mi cuenta</p>
      <p className="mt-1 text-sm text-ink-soft">
        Esta acción es permanente y no se puede deshacer. Se borran tu perfil,
        tus favoritos, reseñas y notificaciones.
        {esEscritor && (
          <>
            {" "}
            Como tenés cuenta de escritor,{" "}
            <strong>también se borran todos tus libros publicados y el historial de ventas asociado</strong>
            {" "}— incluidas las compras que hicieron tus lectores.
          </>
        )}
      </p>

      <label htmlFor="confirmacion-eliminar" className="mt-4 block text-sm font-medium">
        Para confirmar, escribí <span className="font-mono">ELIMINAR</span>
      </label>
      <input
        id="confirmacion-eliminar"
        value={confirmacion}
        onChange={(e) => setConfirmacion(e.target.value)}
        className="mt-1.5 h-11 w-full max-w-xs rounded border border-wine/30 bg-paper-card px-4 text-sm"
      />

      {error && (
        <p role="alert" className="mt-2 text-sm text-wine">
          {error}
        </p>
      )}

      <Button
        tamaño="sm"
        className="mt-4 bg-wine hover:bg-wine-dark"
        onClick={eliminarCuenta}
        disabled={eliminando || confirmacion !== "ELIMINAR"}
      >
        {eliminando ? "Eliminando…" : "Eliminar mi cuenta definitivamente"}
      </Button>
    </div>
  );
}
