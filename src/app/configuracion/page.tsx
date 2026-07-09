import type { Metadata } from "next";
import { requireUsuario } from "@/lib/auth";
import { CambiarPasswordForm } from "./cambiar-password-form";
import { EliminarCuenta } from "./eliminar-cuenta";
import { CerrarSesionBoton } from "./cerrar-sesion-boton";

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const actual = await requireUsuario("/configuracion");

  return (
    <div className="container mx-auto max-w-xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold">Configuración</h1>
      <p className="mt-2 text-ink-soft">Contraseña, sesión y datos de tu cuenta.</p>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Actualizar contraseña</h2>
        <div className="mt-3">
          <CambiarPasswordForm />
        </div>
      </section>

      <section className="mt-10 border-t border-ink/10 pt-8">
        <h2 className="font-display text-lg font-semibold">Sesión</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Cerrá tu sesión en este dispositivo.
        </p>
        <div className="mt-3">
          <CerrarSesionBoton />
        </div>
      </section>

      <section className="mt-10 border-t border-ink/10 pt-8">
        <h2 className="font-display text-lg font-semibold text-wine">Zona de riesgo</h2>
        <div className="mt-3">
          <EliminarCuenta esEscritor={actual.esEscritor} />
        </div>
      </section>
    </div>
  );
}
