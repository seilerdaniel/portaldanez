"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Campo } from "@/components/ui/campo";
import { Button } from "@/components/ui/button";

const restablecerSchema = z
  .object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
    confirmarPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmarPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmarPassword"],
  });

type RestablecerInput = z.infer<typeof restablecerSchema>;

export function RestablecerForm() {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RestablecerInput>({ resolver: zodResolver(restablecerSchema) });

  async function onSubmit(datos: RestablecerInput) {
    setError(null);

    // La sesión temporal de recuperación ya la establece Supabase Auth al
    // abrir el link del email (a través de la cookie que maneja el
    // middleware); acá solo hace falta actualizar la contraseña.
    const { error: errorUpdate } = await supabase.auth.updateUser({ password: datos.password });

    if (errorUpdate) {
      setError("No pudimos actualizar tu contraseña. El enlace puede haber expirado — pedí uno nuevo.");
      return;
    }

    router.push("/auth/ingresar");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
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

      {error && (
        <p role="alert" className="text-sm text-wine">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Guardando…" : "Guardar nueva contraseña"}
      </Button>
    </form>
  );
}
