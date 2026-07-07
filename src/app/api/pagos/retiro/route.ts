import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { solicitudRetiroSchema } from "@/lib/validation/schemas";

/**
 * Solicitud de retiro para escritores.
 *
 * En el proyecto original este circuito no existía: el saldo se acumulaba
 * en `profiles.balance` pero no había ninguna forma de que un autor lo
 * cobrara. Acá se resuelve delegando en la función de Postgres
 * `request_payout`, que descuenta el balance y crea el registro de forma
 * atómica (evita que dos solicitudes simultáneas dupliquen el retiro).
 * El pago real hacia la cuenta de Mercado Pago del autor se procesa
 * después, de forma manual o vía un job aparte — ese registro con estado
 * "pending" es justamente la cola de trabajo para eso.
 */
export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const validacion = solicitudRetiroSchema.safeParse(body);

  if (!validacion.success) {
    return NextResponse.json(
      { error: validacion.error.issues[0]?.message ?? "Solicitud inválida" },
      { status: 400 }
    );
  }

  const { amount, destinationEmail } = validacion.data;

  const { data: retiro, error } = await supabase.rpc("request_payout", {
    _amount: amount,
    _destination_email: destinationEmail,
  });

  if (error) {
    // request_payout() lanza excepciones legibles (saldo insuficiente, etc.)
    // que llegan acá como error.message.
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ retiro });
}
