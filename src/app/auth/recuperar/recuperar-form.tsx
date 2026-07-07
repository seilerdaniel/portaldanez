"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Campo } from "@/components/ui/campo";
import { Button } from "@/components/ui/button";

const recuperarSchema = z.object({
  email: z.string().trim().email("Ingresá un email válido"),
});

type RecuperarInput = z.infer<typeof recuperarSchema>;

export function RecuperarForm() {
  const supabase = createClient();
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecuperarInput>({ resolver: zodResolver(recuperarSchema) });

  async function onSubmit(datos: RecuperarInput) {
    setError(null);

    const { error: errorReset } = await supabase.auth.resetPasswordForEmail(datos.email, {
      redirectTo: `${window.location.origin}/auth/restablecer`,
    });

    // Mostramos éxito incluso si el email no existe, para no filtrar qué
    // emails están registrados en la plataforma.
    if (errorReset && errorReset.status && errorReset.status >= 500) {
      setError("No pudimos procesar la solicitud. Intentá de nuevo en unos minutos.");
      return;
    }

    setEnviado(true);
  }

  if (enviado) {
    return (
      <p className="rounded border border-pine/30 bg-pine/5 p-4 text-sm text-pine">
        Si existe una cuenta con ese email, te enviamos un enlace para restablecer tu contraseña.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <Campo
        label="Email"
        type="email"
        {...register("email")}
        error={errors.email?.message}
        autoComplete="email"
      />

      {error && (
        <p role="alert" className="text-sm text-wine">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Enviando…" : "Enviar enlace de recuperación"}
      </Button>
    </form>
  );
}
