import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { COMISION_PLATAFORMA } from "@/lib/constants";

export const metadata: Metadata = { title: "Publicar mi libro" };

async function convertirseEnEscritor() {
  "use server";

  const actual = await requireUsuario("/convertirse-escritor");
  const supabase = createClient();

  await supabase.from("user_roles").insert({ user_id: actual.user.id, role: "writer" });

  redirect("/escritor/dashboard");
}

export default async function ConvertirseEscritorPage() {
  const actual = await requireUsuario("/convertirse-escritor");

  if (actual.esEscritor) {
    redirect("/escritor/dashboard");
  }

  return (
    <div className="container mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">Publicá tu libro</h1>
      <p className="mt-4 text-ink-soft">
        Cualquier persona puede publicar en Portal Danez. No hay proceso
        editorial previo: subís tu libro, le ponés precio, y queda visible en
        el catálogo apenas lo marcás como publicado.
      </p>

      <ul className="mt-6 space-y-3 text-sm text-ink-soft">
        <li>· Solo cobramos el {COMISION_PLATAFORMA * 100}% de comisión por venta.</li>
        <li>· Vos elegís el precio de tu libro.</li>
        <li>· Podés retirar tu saldo a tu cuenta de Mercado Pago cuando quieras.</li>
      </ul>

      <form action={convertirseEnEscritor} className="mt-8">
        <Button type="submit" tamaño="lg">
          Activar mi cuenta de escritor
        </Button>
      </form>
    </div>
  );
}
