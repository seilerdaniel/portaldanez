"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PayoutStatus } from "@/types/database";
import { cn } from "@/lib/utils";

const ETIQUETAS: Record<PayoutStatus, string> = {
  pending: "Pendiente",
  processing: "Procesando",
  completed: "Completado",
  failed: "Fallido",
};

const SIGUIENTE_ESTADO: Record<PayoutStatus, PayoutStatus | null> = {
  pending: "processing",
  processing: "completed",
  completed: null,
  failed: null,
};

export function AccionesRetiro({ payoutId, estadoActual }: { payoutId: string; estadoActual: PayoutStatus }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function cambiarEstado(nuevoEstado: PayoutStatus) {
    setCargando(true);
    const respuesta = await fetch(`/api/admin/pagos/${payoutId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nuevoEstado }),
    });
    setCargando(false);

    if (respuesta.ok) {
      router.refresh();
    }
  }

  const siguiente = SIGUIENTE_ESTADO[estadoActual];

  return (
    <div className="flex items-center gap-2">
      {siguiente && (
        <button
          type="button"
          disabled={cargando}
          onClick={() => cambiarEstado(siguiente)}
          className={cn(
            "rounded border border-ink/20 px-3 py-1.5 text-xs font-medium hover:bg-ink/5",
            cargando && "opacity-50"
          )}
        >
          Marcar como {ETIQUETAS[siguiente].toLowerCase()}
        </button>
      )}
      {estadoActual !== "failed" && estadoActual !== "completed" && (
        <button
          type="button"
          disabled={cargando}
          onClick={() => cambiarEstado("failed")}
          className="text-xs text-wine hover:underline disabled:opacity-50"
        >
          Marcar como fallido
        </button>
      )}
    </div>
  );
}
