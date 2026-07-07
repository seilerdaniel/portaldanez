import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatearMoneda } from "@/lib/constants";
import { AccionesRetiro } from "./acciones-retiro";

export const metadata: Metadata = { title: "Panel de administración" };

const ETIQUETAS_ESTADO: Record<string, string> = {
  pending: "Pendiente",
  processing: "Procesando",
  completed: "Completado",
  failed: "Fallido",
};

export default async function AdminDashboardPage() {
  await requireAdmin();
  const supabase = createClient();

  const [
    { count: totalUsuarios },
    { count: totalEscritores },
    { count: totalLibrosPublicados },
    { count: totalVentas },
    { data: payouts },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "writer"),
    supabase
      .from("books")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true),
    supabase
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "completed"),
    supabase
      .from("writer_payouts")
      .select(
        "id, amount, destination_email, status, created_at, profiles:writer_id(display_name)",
      )
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const { data: comisionAcumulada } = await supabase
    .from("purchases")
    .select("platform_fee")
    .eq("payment_status", "completed");

  const totalComision = (comisionAcumulada ?? []).reduce(
    (acc, p) => acc + Number(p.platform_fee),
    0,
  );

  const payoutsPendientes = (payouts ?? []).filter(
    (p) => p.status === "pending" || p.status === "processing",
  );
  const montoPendiente = payoutsPendientes.reduce(
    (acc, p) => acc + Number(p.amount),
    0,
  );

  return (
    <div className="container mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold">
        Panel de administración
      </h1>
      <p className="mt-2 text-ink-soft">Vista general de la plataforma.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border border-ink/10 bg-paper-card p-5">
          <p className="text-sm text-ink-soft">Usuarios totales</p>
          <p className="mt-1 font-mono text-2xl font-semibold">
            {totalUsuarios ?? 0}
          </p>
        </div>
        <div className="rounded border border-ink/10 bg-paper-card p-5">
          <p className="text-sm text-ink-soft">Escritores activos</p>
          <p className="mt-1 font-mono text-2xl font-semibold">
            {totalEscritores ?? 0}
          </p>
        </div>
        <div className="rounded border border-ink/10 bg-paper-card p-5">
          <p className="text-sm text-ink-soft">Libros publicados</p>
          <p className="mt-1 font-mono text-2xl font-semibold">
            {totalLibrosPublicados ?? 0}
          </p>
        </div>
        <div className="rounded border border-ink/10 bg-paper-card p-5">
          <p className="text-sm text-ink-soft">Ventas totales</p>
          <p className="mt-1 font-mono text-2xl font-semibold">
            {totalVentas ?? 0}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded border border-wine/20 bg-wine/5 p-5">
          <p className="text-sm text-ink-soft">
            Comisión acumulada de la plataforma
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold text-wine">
            {formatearMoneda(totalComision)}
          </p>
        </div>
        <div className="rounded border border-mustard/30 bg-mustard/10 p-5">
          <p className="text-sm text-ink-soft">
            Retiros pendientes de procesar
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold">
            {formatearMoneda(montoPendiente)}{" "}
            <span className="text-sm font-normal text-ink-soft">
              ({payoutsPendientes.length})
            </span>
          </p>
        </div>
      </div>

      <h2 className="mt-12 font-display text-xl font-semibold">
        Retiros de escritores
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Al marcar un retiro como &quot;procesando&quot;, asegurate de haber
        iniciado la transferencia real a la cuenta de Mercado Pago del autor.
        Este panel no ejecuta el pago — solo lleva el registro de su estado.
      </p>

      {payouts && payouts.length > 0 ? (
        <ul className="mt-4 divide-y divide-ink/10 rounded border border-ink/10 bg-paper-card">
          {payouts.map((payout) => {
            const autor = payout.profiles as unknown as {
              display_name: string;
            } | null;
            return (
              <li
                key={payout.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-medium">
                    {autor?.display_name ?? "—"} ·{" "}
                    {formatearMoneda(payout.amount)}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {payout.destination_email}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-medium">
                    {ETIQUETAS_ESTADO[payout.status] ?? payout.status}
                  </span>
                  <AccionesRetiro
                    payoutId={payout.id}
                    estadoActual={payout.status}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">
          Todavía no hay solicitudes de retiro.
        </p>
      )}
    </div>
  );
}
