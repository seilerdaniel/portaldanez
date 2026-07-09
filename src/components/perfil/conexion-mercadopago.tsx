"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface ConexionMercadoPagoProps {
  conectado: boolean;
  fechaConexion: string | null;
}

export function ConexionMercadoPago({ conectado, fechaConexion }: ConexionMercadoPagoProps) {
  const router = useRouter();
  const [desconectando, setDesconectando] = useState(false);

  async function desconectar() {
    if (!window.confirm("¿Seguro que querés desconectar tu cuenta de Mercado Pago? Vas a dejar de poder vender hasta que la reconectes.")) {
      return;
    }

    setDesconectando(true);
    const respuesta = await fetch("/api/mercadopago/desconectar", { method: "POST" });
    setDesconectando(false);

    if (respuesta.ok) {
      router.refresh();
    }
  }

  if (conectado) {
    return (
      <div className="rounded border border-pine/30 bg-pine/5 p-6">
        <p className="font-medium text-pine">✓ Mercado Pago conectado</p>
        <p className="mt-1 text-sm text-ink-soft">
          Cobrás automáticamente en tu cuenta con cada venta — Portal Danez
          nunca toca esa plata, se acredita directo.
          {fechaConexion && (
            <> Conectada desde el {new Date(fechaConexion).toLocaleDateString("es-AR")}.</>
          )}
        </p>
        <button
          type="button"
          onClick={desconectar}
          disabled={desconectando}
          className="mt-3 text-sm text-wine hover:underline disabled:opacity-50"
        >
          {desconectando ? "Desconectando…" : "Desconectar cuenta"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded border border-mustard/30 bg-mustard/10 p-6">
      <p className="font-medium">Conectá tu cuenta de Mercado Pago para poder vender</p>
      <p className="mt-1 text-sm text-ink-soft">
        Con tu cuenta conectada, cada venta se divide automáticamente: vos
        cobrás tu parte directo en tu cuenta, sin tener que pedir retiros.
      </p>
      <a href="/api/mercadopago/conectar">
        <Button className="mt-3" tamaño="sm">
          Conectar con Mercado Pago
        </Button>
      </a>
    </div>
  );
}
