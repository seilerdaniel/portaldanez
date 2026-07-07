import type { Metadata } from "next";
import { requireEscritor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatearMoneda } from "@/lib/constants";
import { RetiroForm } from "./retiro-form";

export const metadata: Metadata = { title: "Mis pagos" };

const etiquetaEstado: Record<string, string> = {
  pending: "Pendiente",
  processing: "Procesando",
  completed: "Completado",
  failed: "Fallido",
};

export default async function PagosEscritorPage() {
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
      <p className="mt-2 text-ink-soft">Gestioná tu saldo y tus solicitudes de retiro.</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded border border-ink/10 bg-paper-card p-6">
          <p className="text-sm text-ink-soft">Saldo disponible</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-wine">
            {formatearMoneda(actual.profile?.balance ?? 0)}
          </p>
        </div>
        <div className="rounded border border-ink/10 bg-paper-card p-6">
          <p className="text-sm text-ink-soft">Ganado en total</p>
          <p className="mt-1 font-mono text-2xl font-semibold">
            {formatearMoneda(actual.profile?.total_earnings ?? 0)}
          </p>
        </div>
      </div>

      <h2 className="mt-10 font-display text-xl font-semibold">Solicitar un retiro</h2>
      <div className="mt-4">
        <RetiroForm
          balanceDisponible={actual.profile?.balance ?? 0}
          emailSugerido={actual.profile?.mercadopago_email ?? null}
        />
      </div>

      <h2 className="mt-10 font-display text-xl font-semibold">Historial de retiros</h2>
      {payouts && payouts.length > 0 ? (
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
      ) : (
        <p className="mt-4 text-sm text-ink-soft">Todavía no solicitaste ningún retiro.</p>
      )}
    </div>
  );
}
