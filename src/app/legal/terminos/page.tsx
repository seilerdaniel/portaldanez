import type { Metadata } from "next";
import { COMISION_PLATAFORMA } from "@/lib/constants";

export const metadata: Metadata = { title: "Términos de uso" };

export default function TerminosPage() {
  return (
    <div className="container mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">Términos de uso</h1>

      <div className="mt-8 space-y-6 leading-relaxed text-ink-soft">
        <p>
          Portal Danez es una plataforma que conecta escritoras y escritores
          independientes con lectores en Argentina. Al usar el sitio,
          aceptás estos términos.
        </p>

        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Publicación de libros</h2>
          <p className="mt-2">
            Cualquier persona registrada puede activar el rol de escritor y
            publicar libros. Sos responsable de tener los derechos sobre el
            contenido que subís y de que no infrinja derechos de autor de
            terceros.
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Comisión</h2>
          <p className="mt-2">
            Cobramos el {COMISION_PLATAFORMA * 100}% de cada venta como comisión
            de la plataforma. El resto se acredita a tu saldo y podés
            retirarlo a tu cuenta de Mercado Pago.
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Compras</h2>
          <p className="mt-2">
            Al comprar un libro, obtenés una licencia personal e
            intransferible para leerlo. No está permitido redistribuir el
            archivo descargado.
          </p>
        </div>
      </div>
    </div>
  );
}
