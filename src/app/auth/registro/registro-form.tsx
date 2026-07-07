"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registroSchema, type RegistroInput } from "@/lib/validation/schemas";
import { createClient } from "@/lib/supabase/client";
import { Campo } from "@/components/ui/campo";
import { Button } from "@/components/ui/button";

export function RegistroForm() {
  const router = useRouter();
  const supabase = createClient();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistroInput>({ resolver: zodResolver(registroSchema) });

  async function onSubmit(datos: RegistroInput) {
    setErrorGeneral(null);

    const { error } = await supabase.auth.signUp({
      email: datos.email,
      password: datos.password,
      options: {
        data: { display_name: datos.nombreVisible },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      setErrorGeneral(
        error.message === "User already registered"
          ? "Ya existe una cuenta con ese email."
          : "No pudimos crear tu cuenta. Intentá de nuevo."
      );
      return;
    }

    router.push("/auth/confirmar-email");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <Campo
        label="Nombre visible"
        {...register("nombreVisible")}
        error={errors.nombreVisible?.message}
        autoComplete="name"
      />
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
        autoComplete="new-password"
      />
      <Campo
        label="Confirmar contraseña"
        type="password"
        {...register("confirmarPassword")}
        error={errors.confirmarPassword?.message}
        autoComplete="new-password"
      />

      {errorGeneral && (
        <p role="alert" className="text-sm text-wine">
          {errorGeneral}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
