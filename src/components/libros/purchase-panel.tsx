"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatearMoneda } from "@/lib/constants";

interface PurchasePanelProps {
  bookId: string;
  price: number;
  estaAutenticado: boolean;
  yaComprado: boolean;
}

export function PurchasePanel({ bookId, price, estaAutenticado, yaComprado }: PurchasePanelProps) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function comprar() {
    if (!estaAutenticado) {
      router.push(`/auth/ingresar?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const respuesta = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Mandamos solo la ruta (no el origen): si estás probando por
        // localhost en el navegador, window.location.href tendría
        // "localhost", una URL que Mercado Pago rechaza por no ser
        // pública. El servidor arma la URL completa con
        // NEXT_PUBLIC_SITE_URL, que si sí es pública (por ejemplo, tu
        // túnel de ngrok).
        body: JSON.stringify({ bookId, returnPath: window.location.pathname }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error ?? "No pudimos iniciar el pago");
      }

      window.location.href = datos.initPoint;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado");
      setCargando(false);
    }
  }

  async function descargar() {
    setCargando(true);
    setError(null);

    try {
      const respuesta = await fetch(`/api/libros/${bookId}/descarga`, { method: "POST" });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error ?? "No pudimos generar el enlace de descarga");
      }

      window.location.href = datos.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="rounded border border-ink/10 bg-paper-card p-6">
      <p className="font-mono text-2xl font-semibold text-wine">{formatearMoneda(price)}</p>

      {yaComprado ? (
        <Button tamaño="lg" className="mt-4 w-full" onClick={descargar} disabled={cargando}>
          {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Descargar mi libro
        </Button>
      ) : (
        <Button tamaño="lg" className="mt-4 w-full" onClick={comprar} disabled={cargando}>
          {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
          Comprar ahora
        </Button>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-wine">
          {error}
        </p>
      )}

      <p className="mt-4 text-xs text-ink-soft">
        Pago seguro procesado por Mercado Pago. El acceso a tu ejemplar queda
        disponible al instante en &quot;Mi biblioteca&quot;.
      </p>
    </div>
  );
}
