import Link from "next/link";

const columnas = [
  {
    titulo: "Plataforma",
    links: [
      { href: "/catalogo", label: "Catálogo" },
      { href: "/autores", label: "Autores" },
      { href: "/como-funciona", label: "Cómo funciona" },
    ],
  },
  {
    titulo: "Para escritores",
    links: [
      { href: "/convertirse-escritor", label: "Publicar un libro" },
      { href: "/escritor/dashboard", label: "Panel de escritor" },
    ],
  },
  {
    titulo: "Legal",
    links: [
      { href: "/legal/terminos", label: "Términos de uso" },
      { href: "/legal/privacidad", label: "Privacidad" },
      { href: "/legal/derechos-autor", label: "Derechos de autor" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-ink text-paper-card">
      <div className="container mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <p className="font-display text-lg font-semibold">Portal Danez</p>
            <p className="mt-3 max-w-xs text-sm text-paper-card/70">
              Libros digitales de autoras y autores argentinos, sin intermediarios
              editoriales.
            </p>
          </div>

          {columnas.map((columna) => (
            <div key={columna.titulo}>
              <p className="text-sm font-semibold text-mustard">{columna.titulo}</p>
              <ul className="mt-3 space-y-2">
                {columna.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-paper-card/70 transition-colors hover:text-paper-card"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-12 border-t border-paper-card/10 pt-6 text-xs text-paper-card/50">
          © {new Date().getFullYear()} Portal Danez. Hecho en Argentina.
        </p>
      </div>
    </footer>
  );
}
