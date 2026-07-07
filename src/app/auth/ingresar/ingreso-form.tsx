"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ingresoSchema, type IngresoInput } from "@/lib/validation/schemas";
import { createClient } from "@/lib/supabase/client";
import { Campo } from "@/components/ui/campo";
import { Button } from "@/components/ui/button";

export function IngresoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IngresoInput>({ resolver: zodResolver(ingresoSchema) });

  async function onSubmit(datos: IngresoInput) {
    setErrorGeneral(null);

    const { error } = await supabase.auth.signInWithPassword(datos);

    if (error) {
      setErrorGeneral("Email o contraseña incorrectos.");
      return;
    }

    router.push(searchParams.get("next") ?? "/mi-biblioteca");
    router.refresh();
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
      <Campo
        label="Contraseña"
        type="password"
        {...register("password")}
        error={errors.password?.message}
        autoComplete="current-password"
      />

      {errorGeneral && (
        <p role="alert" className="text-sm text-wine">
          {errorGeneral}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}
