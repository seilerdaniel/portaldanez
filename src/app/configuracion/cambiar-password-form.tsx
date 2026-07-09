"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Campo } from "@/components/ui/campo";
import { Button } from "@/components/ui/button";

const cambiarPasswordSchema = z
  .object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
    confirmarPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmarPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmarPassword"],
  });

type CambiarPasswordInput = z.infer<typeof cambiarPasswordSchema>;

export function CambiarPasswordForm() {
  const supabase = createClient();
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CambiarPasswordInput>({ resolver: zodResolver(cambiarPasswordSchema) });

  async function onSubmit(datos: CambiarPasswordInput) {
    setMensaje(null);

    const { error } = await supabase.auth.updateUser({ password: datos.password });

    if (error) {
      setMensaje({ tipo: "error", texto: "No pudimos actualizar tu contraseña. Intentá de nuevo." });
      return;
    }

    setMensaje({ tipo: "ok", texto: "Contraseña actualizada." });
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Campo
        label="Nueva contraseña"
        type="password"
        {...register("password")}
        error={errors.password?.message}
        autoComplete="new-password"
      />
      <Campo
        label="Confirmar nueva contraseña"
        type="password"
        {...register("confirmarPassword")}
        error={errors.confirmarPassword?.message}
        autoComplete="new-password"
      />

      {mensaje && (
        <p role="status" className={`text-sm ${mensaje.tipo === "error" ? "text-wine" : "text-pine"}`}>
          {mensaje.texto}
        </p>
      )}

      <Button type="submit" tamaño="sm" disabled={isSubmitting}>
        {isSubmitting ? "Guardando…" : "Actualizar contraseña"}
      </Button>
    </form>
  );
}
