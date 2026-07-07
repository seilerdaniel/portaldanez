import type { Metadata } from "next";

export const metadata: Metadata = { title: "Derechos de autor" };

export default function DerechosAutorPage() {
  return (
    <div className="container mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">Derechos de autor</h1>

      <div className="mt-8 space-y-6 leading-relaxed text-ink-soft">
        <p>
          Cada autora o autor conserva los derechos de propiedad intelectual
          de su obra. Publicar en Portal Danez no transfiere esos derechos a
          la plataforma.
        </p>
        <p>
          Si creés que un libro publicado infringe tus derechos de autor,
          escribinos con el título, el enlace al libro y una descripción del
          conflicto, y vamos a revisarlo.
        </p>
      </div>
    </div>
  );
}
