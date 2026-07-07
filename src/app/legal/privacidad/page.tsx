import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacidad" };

export default function PrivacidadPage() {
  return (
    <div className="container mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">Privacidad</h1>

      <div className="mt-8 space-y-6 leading-relaxed text-ink-soft">
        <p>
          Guardamos los datos necesarios para operar la plataforma: tu email,
          nombre visible, historial de compras (si sos lector) y libros
          publicados y ventas (si sos escritor).
        </p>
        <p>
          Tu email y saldo de cobro nunca se muestran públicamente ni a otros
          usuarios — solo vos podés verlos desde tu perfil.
        </p>
        <p>
          Los pagos se procesan a través de Mercado Pago; no almacenamos
          números de tarjeta ni datos bancarios en nuestros servidores.
        </p>
      </div>
    </div>
  );
}
