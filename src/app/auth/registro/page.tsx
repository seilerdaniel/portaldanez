import type { Metadata } from "next";
import Link from "next/link";
import { RegistroForm } from "./registro-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return (
    <div className="container mx-auto flex max-w-md flex-col px-6 py-16">
      <h1 className="font-display text-2xl font-semibold">Creá tu cuenta</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Vas a empezar como lector. Si querés publicar tus libros, podés sumar
        el rol de escritor después desde tu perfil.
      </p>

      <div className="mt-8">
        <RegistroForm />
      </div>

      <p className="mt-6 text-center text-sm text-ink-soft">
        ¿Ya tenés cuenta?{" "}
        <Link href="/auth/ingresar" className="font-medium text-wine hover:underline">
          Ingresá acá
        </Link>
      </p>
    </div>
  );
}
