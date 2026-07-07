"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface NotificacionResumen {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell({ userId }: { userId: string }) {
  const supabase = createClient();
  const [abierto, setAbierto] = useState(false);
  const [notificaciones, setNotificaciones] = useState<NotificacionResumen[]>([]);
  const [cargando, setCargando] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const noLeidas = notificaciones.filter((n) => !n.is_read).length;

  async function cargarNotificaciones() {
    setCargando(true);
    const { data } = await supabase
      .from("notifications")
      .select("id, title, message, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8);
    setNotificaciones(data ?? []);
    setCargando(false);
  }

  useEffect(() => {
    cargarNotificaciones();

    // Refresco periódico simple. Para tiempo real de verdad, se puede migrar
    // a supabase.channel(...).on('postgres_changes', ...) más adelante.
    const intervalo = setInterval(cargarNotificaciones, 60_000);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    function handleClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  async function marcarLeida(id: string) {
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await fetch("/api/notificaciones/marcar-leida", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
  }

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label={`Notificaciones${noLeidas > 0 ? ` (${noLeidas} sin leer)` : ""}`}
        aria-expanded={abierto}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
      >
        <Bell className="h-5 w-5" />
        {noLeidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-wine px-1 text-[0.6rem] font-semibold text-paper-card">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded border border-ink/10 bg-paper-card shadow-cover">
          <div className="flex items-center justify-between border-b border-ink/10 p-3">
            <p className="text-sm font-semibold">Notificaciones</p>
            <Link
              href="/notificaciones"
              className="text-xs text-wine hover:underline"
              onClick={() => setAbierto(false)}
            >
              Ver todas
            </Link>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {cargando && notificaciones.length === 0 ? (
              <p className="p-4 text-center text-sm text-ink-soft">Cargando…</p>
            ) : notificaciones.length === 0 ? (
              <p className="p-4 text-center text-sm text-ink-soft">No tenés notificaciones.</p>
            ) : (
              <ul className="divide-y divide-ink/10">
                {notificaciones.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => !n.is_read && marcarLeida(n.id)}
                      className={cn(
                        "block w-full p-3 text-left text-sm transition-colors hover:bg-ink/5",
                        !n.is_read && "bg-mustard/10"
                      )}
                    >
                      <p className="font-medium">{n.title}</p>
                      <p className="mt-0.5 text-ink-soft">{n.message}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
