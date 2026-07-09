import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginadorProps {
  paginaActual: number;
  totalPaginas: number;
  basePath: string;
  /** Parámetros de búsqueda actuales (para no perderlos al cambiar de página). */
  searchParams?: Record<string, string | undefined>;
}

export function Paginador({ paginaActual, totalPaginas, basePath, searchParams = {} }: PaginadorProps) {
  if (totalPaginas <= 1) return null;

  function urlPagina(pagina: number) {
    const params = new URLSearchParams();
    for (const [clave, valor] of Object.entries(searchParams)) {
      if (valor) params.set(clave, valor);
    }
    params.set("pagina", String(pagina));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <nav className="mt-10 flex items-center justify-center gap-4" aria-label="Paginación">
      {paginaActual > 1 ? (
        <Link
          href={urlPagina(paginaActual - 1)}
          className="flex items-center gap-1 text-sm font-medium text-wine hover:underline"
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Link>
      ) : (
        <span className="flex items-center gap-1 text-sm text-ink/30">
          <ChevronLeft className="h-4 w-4" /> Anterior
        </span>
      )}

      <span className="text-sm text-ink-soft">
        Página {paginaActual} de {totalPaginas}
      </span>

      {paginaActual < totalPaginas ? (
        <Link
          href={urlPagina(paginaActual + 1)}
          className="flex items-center gap-1 text-sm font-medium text-wine hover:underline"
        >
          Siguiente <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className="flex items-center gap-1 text-sm text-ink/30">
          Siguiente <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
