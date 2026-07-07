import Link from "next/link";
import { getUsuarioActual } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Avatar } from "@/components/ui/avatar";

const navegacion = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/rankings", label: "Rankings" },
  { href: "/autores", label: "Autores" },
  { href: "/como-funciona", label: "Cómo funciona" },
];

export async function Header() {
  const actual = await getUsuarioActual();

  return (
    <header className="border-b border-ink/10 bg-paper-card">
      <div className="container mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-ink/40 bg-mustard font-display text-xs font-bold"
          >
            PD
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            Portal Danez
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Principal">
          {navegacion.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-ink-soft transition-colors hover:text-wine"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {actual ? (
            <>
              {actual.roles.includes("admin") && (
                <Link href="/admin/dashboard" className="hidden text-sm font-medium hover:text-wine sm:inline">
                  Admin
                </Link>
              )}
              <NotificationBell userId={actual.user.id} />
              <Link href="/favoritos" className="hidden text-sm font-medium hover:text-wine sm:inline">
                Favoritos
              </Link>
              <Link
                href={actual.esEscritor ? "/escritor/dashboard" : "/mi-biblioteca"}
                className="text-sm font-medium hover:text-wine"
              >
                {actual.esEscritor ? "Mi panel" : "Mi biblioteca"}
              </Link>
              <Link href="/perfil">
                <span className="sr-only">Ir a mi perfil</span>
                <Avatar
                  avatarUrl={actual.profile?.avatar_url ?? null}
                  nombre={actual.profile?.display_name ?? "?"}
                  tamaño="sm"
                />
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/ingresar" className="text-sm font-medium hover:text-wine">
                Ingresar
              </Link>
              <Link href="/auth/registro">
                <Button tamaño="sm">Crear cuenta</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
