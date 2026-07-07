import type { Metadata } from "next";
import { RestablecerForm } from "./restablecer-form";

export const metadata: Metadata = { title: "Restablecer contraseña" };

export default function RestablecerPage() {
  return (
    <div className="container mx-auto flex max-w-md flex-col px-6 py-16">
      <h1 className="font-display text-2xl font-semibold">Elegí tu nueva contraseña</h1>

      <div className="mt-8">
        <RestablecerForm />
      </div>
    </div>
  );
}
