import type { Metadata } from "next";
import { COMISION_PLATAFORMA } from "@/lib/constants";

export const metadata: Metadata = { title: "Cómo funciona" };

const pasosLectores = [
  "Explorá el catálogo y elegí un libro.",
  "Pagá con Mercado Pago — el pago queda protegido hasta que se confirma.",
  "Descargalo al instante desde tu biblioteca, en PDF o EPUB.",
];

const pasosEscritores = [
  "Creá tu cuenta y activá el rol de escritor.",
  "Subí tu libro (PDF o EPUB) y ponele el precio que quieras.",
  "Publicalo y empezá a vender directo a tus lectores.",
  "Retirá tu saldo a tu cuenta de Mercado Pago cuando quieras.",
];

export default function ComoFuncionaPage() {
  return (
    <div className="container mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">Cómo funciona Portal Danez</h1>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-pine">Para lectores</h2>
        <ol className="mt-4 space-y-3">
          {pasosLectores.map((paso, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-mono text-sm text-ink-soft">{i + 1}.</span>
              <span>{paso}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-wine">Para escritores</h2>
        <ol className="mt-4 space-y-3">
          {pasosEscritores.map((paso, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-mono text-sm text-ink-soft">{i + 1}.</span>
              <span>{paso}</span>
            </li>
          ))}
        </ol>

        <div className="mt-6 rounded border border-ink/10 bg-paper-card p-6">
          <p className="font-medium">Comisión de la plataforma</p>
          <p className="mt-1 text-sm text-ink-soft">
            Cobramos el {COMISION_PLATAFORMA * 100}% de cada venta. No hay costos
            fijos ni de publicación — si no vendés, no pagás nada.
          </p>
        </div>
      </section>
    </div>
  );
}
