import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Paginador } from "@/components/ui/paginador";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notificaciones" };

const POR_PAGINA = 20;

async function marcarTodasLeidas() {
  "use server";

  const actual = await requireUsuario("/notificaciones");
  const supabase = createClient();
  await supabase.from("notifications").update({ is_read: true }).eq("user_id", actual.user.id);
  revalidatePath("/notificaciones");
}

interface NotificacionesPageProps {
  searchParams: { pagina?: string };
}

export default async function NotificacionesPage({ searchParams }: NotificacionesPageProps) {
  const actual = await requireUsuario("/notificaciones");
  const supabase = createClient();
  const pagina = Math.max(1, parseInt(searchParams.pagina ?? "1", 10) || 1);
  const desde = (pagina - 1) * POR_PAGINA;

  const [{ data: notificaciones, count }, { count: noLeidas }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, title, message, is_read, created_at", { count: "exact" })
      .eq("user_id", actual.user.id)
      .order("created_at", { ascending: false })
      .range(desde, desde + POR_PAGINA - 1),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", actual.user.id)
      .eq("is_read", false),
  ]);

  const totalPaginas = Math.max(1, Math.ceil((count ?? 0) / POR_PAGINA));

  return (
    <div className="container mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Notificaciones</h1>
        {!!noLeidas && noLeidas > 0 && (
          <form action={marcarTodasLeidas}>
            <Button type="submit" variant="secundario" tamaño="sm">
              Marcar todas como leídas
            </Button>
          </form>
        )}
      </div>

      {notificaciones && notificaciones.length > 0 ? (
        <ul className="mt-8 divide-y divide-ink/10 rounded border border-ink/10 bg-paper-card">
          {notificaciones.map((n) => (
            <li key={n.id} className={cn("p-4", !n.is_read && "bg-mustard/10")}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{n.title}</p>
                  <p className="mt-1 text-sm text-ink-soft">{n.message}</p>
                </div>
                <span className="whitespace-nowrap text-xs text-ink-soft">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-ink-soft">Todavía no tenés notificaciones.</p>
      )}

      <Paginador paginaActual={pagina} totalPaginas={totalPaginas} basePath="/notificaciones" />
    </div>
  );
}
