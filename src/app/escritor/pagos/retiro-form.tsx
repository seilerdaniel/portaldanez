"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { solicitudRetiroSchema, type SolicitudRetiroInput } from "@/lib/validation/schemas";
import { Campo } from "@/components/ui/campo";
import { Button } from "@/components/ui/button";
import { formatearMoneda } from "@/lib/constants";

interface RetiroFormProps {
  balanceDisponible: number;
  emailSugerido: string | null;
}

export function RetiroForm({ balanceDisponible, emailSugerido }: RetiroFormProps) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SolicitudRetiroInput>({
    resolver: zodResolver(solicitudRetiroSchema),
    defaultValues: { destinationEmail: emailSugerido ?? "" },
  });

  async function onSubmit(datos: SolicitudRetiroInput) {
    setMensaje(null);

    const respuesta = await fetch("/api/pagos/retiro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });

    const cuerpo = await respuesta.json();

    if (!respuesta.ok) {
      setMensaje({ tipo: "error", texto: cuerpo.error ?? "No pudimos procesar el retiro." });
      return;
    }

    setMensaje({ tipo: "ok", texto: "Solicitud de retiro enviada. La vas a ver reflejada en tu historial." });
    reset({ amount: undefined, destinationEmail: datos.destinationEmail });
    router.refresh();
  }

  if (balanceDisponible <= 0) {
    return (
      <p className="rounded border border-dashed border-ink/20 p-6 text-sm text-ink-soft">
        Todavía no tenés saldo disponible para retirar.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded border border-ink/10 bg-paper-card p-6" noValidate>
      <p className="text-sm text-ink-soft">
        Saldo disponible: <span className="font-mono font-semibold text-ink">{formatearMoneda(balanceDisponible)}</span>
      </p>

      <Campo
        label="Monto a retirar"
        type="number"
        step="0.01"
        min="0"
        max={balanceDisponible}
        {...register("amount")}
        error={errors.amount?.message}
      />

      <Campo
        label="Email de Mercado Pago"
        type="email"
        {...register("destinationEmail")}
        error={errors.destinationEmail?.message}
      />

      {mensaje && (
        <p role="alert" className={`text-sm ${mensaje.tipo === "error" ? "text-wine" : "text-pine"}`}>
          {mensaje.texto}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enviando…" : "Solicitar retiro"}
      </Button>
    </form>
  );
}
