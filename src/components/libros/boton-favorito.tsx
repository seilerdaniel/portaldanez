"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface BotonFavoritoProps {
  bookId: string;
  estaAutenticado: boolean;
  esFavoritoInicial: boolean;
  variante?: "flotante" | "inline";
}

export function BotonFavorito({
  bookId,
  estaAutenticado,
  esFavoritoInicial,
  variante = "inline",
}: BotonFavoritoProps) {
  const router = useRouter();
  const supabase = createClient();
  const [esFavorito, setEsFavorito] = useState(esFavoritoInicial);
  const [cargando, setCargando] = useState(false);

  async function alternar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!estaAutenticado) {
      router.push(`/auth/ingresar?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setCargando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCargando(false);
      return;
    }

    if (esFavorito) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("book_id", bookId);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, book_id: bookId });
    }

    setEsFavorito(!esFavorito);
    setCargando(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={cargando}
      aria-pressed={esFavorito}
      aria-label={esFavorito ? "Quitar de favoritos" : "Agregar a favoritos"}
      className={cn(
        variante === "flotante"
          ? "absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-paper-card/90 shadow-cover"
          : "inline-flex items-center gap-2 rounded border border-ink/20 px-4 py-2 text-sm font-medium hover:bg-ink/5"
      )}
    >
      <Heart className={cn("h-4 w-4", esFavorito && "fill-wine text-wine")} />
      {variante === "inline" && (esFavorito ? "En tus favoritos" : "Agregar a favoritos")}
    </button>
  );
}
