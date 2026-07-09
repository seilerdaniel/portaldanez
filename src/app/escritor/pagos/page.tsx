import type { Metadata } from "next";
import { requireEscritor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatearMoneda } from "@/lib/constants";
import { ConexionMercadoPago } from "@/components/perfil/conexion-mercadopago";
import { RetiroForm } from "./retiro-form";

export const metadata: Metadata = { title: "Mis pagos" };

const etiquetaEstado: Record<string, string> = {
  pending: "Pendiente",
  processing: "Procesando",
  completed: "Completado",
  failed: "Fallido",
};

interface PagosEscritorPageProps {
  searchParams: { mp_conectado?: string; mp_error?: string };
}

export default async function PagosEscritorPage({ searchParams }: PagosEscritorPageProps) {
  const actual = await requireEscritor();
  const supabase = createClient();

  const { data: payouts } = await supabase
    .from("writer_payouts")
    .select("id, amount, status, destination_email, created_at, processed_at")
    .eq("writer_id", actual.profile!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold">Mis pagos</h1>
      <p className="mt-2 text-ink-soft">Cómo y cuándo cobrás tus ventas.</p>

      {searchParams.mp_conectado && (
        <p role="status" className="mt-4 text-sm text-pine">
          ¡Tu cuenta de Mercado Pago quedó conectada!
        </p>
      )}
      {searchParams.mp_error && (
        <p role="alert" className="mt-4 text-sm text-wine">
          {decodeURIComponent(searchParams.mp_error)}
        </p>
      )}

      <div className="mt-6">
        <ConexionMercadoPago
          conectado={actual.profile?.mercadopago_connected ?? false}
          fechaConexion={actual.profile?.mercadopago_connected_at ?? null}
        />
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded border border-ink/10 bg-paper-card p-6">
          <p className="text-sm text-ink-soft">Ganado en total</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-wine">
            {formatearMoneda(actual.profile?.total_earnings ?? 0)}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Se acredita directo en tu Mercado Pago con cada venta.
          </p>
        </div>
        <div className="rounded border border-ink/10 bg-paper-card p-6">
          <p className="text-sm text-ink-soft">Saldo pendiente de un sistema anterior</p>
          <p className="mt-1 font-mono text-2xl font-semibold">
            {formatearMoneda(actual.profile?.balance ?? 0)}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Si tenés saldo acá de antes de conectar tu cuenta, pedilo con el
            formulario de abajo.
          </p>
        </div>
      </div>

      {(actual.profile?.balance ?? 0) > 0 && (
        <>
          <h2 className="mt-10 font-display text-xl font-semibold">Retirar saldo anterior</h2>
          <div className="mt-4">
            <RetiroForm
              balanceDisponible={actual.profile?.balance ?? 0}
              emailSugerido={actual.profile?.mercadopago_email ?? null}
            />
          </div>
        </>
      )}

      {payouts && payouts.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-xl font-semibold">Historial de retiros manuales</h2>
          <ul className="mt-4 divide-y divide-ink/10 rounded border border-ink/10 bg-paper-card">
            {payouts.map((payout) => (
              <li key={payout.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <p className="font-mono font-medium">{formatearMoneda(payout.amount)}</p>
                  <p className="text-ink-soft">{payout.destination_email}</p>
                </div>
                <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-medium">
                  {etiquetaEstado[payout.status] ?? payout.status}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
