"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AccionDespublicar({ bookId, yaPublicado }: { bookId: string; yaPublicado: boolean }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!yaPublicado) {
    return <span className="text-xs text-ink-soft">Ya está despublicado</span>;
  }

  async function confirmar() {
    setError(null);

    if (motivo.trim().length < 10) {
      setError("Contá brevemente el motivo (mínimo 10 caracteres).");
      return;
    }

    setEnviando(true);
    const respuesta = await fetch(`/api/admin/libros/${bookId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: motivo }),
    });
    setEnviando(false);

    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => ({}));
      setError(cuerpo.error ?? "No pudimos despublicar el libro.");
      return;
    }

    setAbierto(false);
    router.refresh();
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-xs font-medium text-wine hover:underline"
      >
        Despublicar
      </button>
    );
  }

  return (
    <div className="w-64 rounded border border-wine/30 bg-paper-card p-3">
      <label htmlFor={`motivo-${bookId}`} className="text-xs font-medium">
        Motivo (se le envía al autor)
      </label>
      <textarea
        id={`motivo-${bookId}`}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        rows={2}
        className="mt-1 w-full rounded border border-ink/20 bg-paper px-2 py-1 text-xs"
      />
      {error && (
        <p role="alert" className="mt-1 text-xs text-wine">
          {error}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={confirmar}
          disabled={enviando}
          className="rounded bg-wine px-2 py-1 text-xs font-medium text-paper-card disabled:opacity-50"
        >
          {enviando ? "Enviando…" : "Confirmar"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-xs text-ink-soft hover:underline"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
