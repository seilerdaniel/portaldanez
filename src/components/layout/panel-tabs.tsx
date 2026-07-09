"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Pestaña {
  href: string;
  label: string;
}

const PESTAÑAS_LECTOR: Pestaña[] = [
  { href: "/mi-biblioteca", label: "Mi biblioteca" },
  { href: "/favoritos", label: "Favoritos" },
];

const PESTAÑAS_ESCRITOR: Pestaña[] = [
  { href: "/escritor/dashboard", label: "Resumen" },
  { href: "/escritor/libros", label: "Mis libros" },
  { href: "/escritor/pagos", label: "Pagos" },
];

const PESTAÑAS_ADMIN: Pestaña[] = [
  { href: "/admin/dashboard", label: "Resumen" },
  { href: "/admin/libros", label: "Moderar libros" },
];

export function PanelTabs({ rol }: { rol: "lector" | "escritor" | "admin" }) {
  const pathname = usePathname();
  const pestañas =
    rol === "escritor" ? PESTAÑAS_ESCRITOR : rol === "admin" ? PESTAÑAS_ADMIN : PESTAÑAS_LECTOR;

  return (
    <nav
      className="-mx-6 mb-8 flex gap-1 overflow-x-auto border-b border-ink/10 px-6 sm:mx-0 sm:px-0"
      aria-label="Secciones del panel"
    >
      {pestañas.map((pestaña) => {
        const activa = pathname === pestaña.href;
        return (
          <Link
            key={pestaña.href}
            href={pestaña.href}
            aria-current={activa ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors",
              activa
                ? "border-wine text-wine"
                : "border-transparent text-ink-soft hover:border-ink/20 hover:text-ink"
            )}
          >
            {pestaña.label}
          </Link>
        );
      })}
    </nav>
  );
}
