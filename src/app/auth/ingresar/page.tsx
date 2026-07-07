import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { IngresoForm } from "./ingreso-form";

export const metadata: Metadata = { title: "Ingresar" };

export default function IngresarPage() {
  return (
    <div className="container mx-auto flex max-w-md flex-col px-6 py-16">
      <h1 className="font-display text-2xl font-semibold">Ingresá a tu cuenta</h1>

      <div className="mt-8">
        <Suspense>
          <IngresoForm />
        </Suspense>
      </div>

      <p className="mt-3 text-center text-sm">
        <Link href="/auth/recuperar" className="font-medium text-wine hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>

      <p className="mt-6 text-center text-sm text-ink-soft">
        ¿Todavía no tenés cuenta?{" "}
        <Link href="/auth/registro" className="font-medium text-wine hover:underline">
          Creá una gratis
        </Link>
      </p>
    </div>
  );
}
