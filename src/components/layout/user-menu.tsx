"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Heart, Bell, Settings, LogOut, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";

interface UserMenuProps {
  nombre: string;
  avatarUrl: string | null;
  esAdmin: boolean;
}

export function UserMenu({ nombre, avatarUrl, esAdmin }: UserMenuProps) {
  const router = useRouter();
  const supabase = createClient();
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  async function cerrarSesion() {
    await supabase.auth.signOut();
    setAbierto(false);
    router.push("/");
    router.refresh();
  }

  const items = [
    { href: "/perfil", label: "Mi perfil", icon: User },
    { href: "/favoritos", label: "Favoritos", icon: Heart },
    { href: "/notificaciones", label: "Notificaciones", icon: Bell },
    ...(esAdmin ? [{ href: "/admin/dashboard", label: "Panel de administración", icon: ShieldCheck }] : []),
    { href: "/configuracion", label: "Configuración", icon: Settings },
  ];

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Abrir menú de cuenta"
        aria-expanded={abierto}
        className="block"
      >
        <Avatar avatarUrl={avatarUrl} nombre={nombre} tamaño="sm" />
      </button>

      {abierto && (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded border border-ink/10 bg-paper-card py-1 shadow-cover">
          <div className="border-b border-ink/10 px-4 py-2">
            <p className="truncate text-sm font-medium">{nombre}</p>
          </div>

          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setAbierto(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-ink-soft hover:bg-ink/5 hover:text-ink"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}

          <button
            type="button"
            onClick={cerrarSesion}
            className="flex w-full items-center gap-2 border-t border-ink/10 px-4 py-2 text-left text-sm text-wine hover:bg-wine/5"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
