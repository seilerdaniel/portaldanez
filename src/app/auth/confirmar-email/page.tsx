import type { Metadata } from "next";

export const metadata: Metadata = { title: "Confirmá tu email" };

export default function ConfirmarEmailPage() {
  return (
    <div className="container mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="font-display text-2xl font-semibold">Revisá tu email</h1>
      <p className="mt-3 text-ink-soft">
        Te enviamos un enlace de confirmación. Abrilo para activar tu cuenta
        y empezar a usar Portal Danez.
      </p>
    </div>
  );
}
