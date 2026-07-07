import type { Metadata } from "next";
import Link from "next/link";
import { RecuperarForm } from "./recuperar-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <div className="container mx-auto flex max-w-md flex-col px-6 py-16">
      <h1 className="font-display text-2xl font-semibold">Recuperar contraseña</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Ingresá el email de tu cuenta y te mandamos un enlace para elegir una
        contraseña nueva.
      </p>

      <div className="mt-8">
        <RecuperarForm />
      </div>

      <p className="mt-6 text-center text-sm text-ink-soft">
        <Link href="/auth/ingresar" className="font-medium text-wine hover:underline">
          Volver a ingresar
        </Link>
      </p>
    </div>
  );
}
