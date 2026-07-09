import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verificarFirmaMercadoPago } from "@/lib/mercadopago/webhook-signature";

export async function POST(request: Request) {
  const secreto = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secreto) {
    // Fail closed: sin secreto configurado, no aceptamos ningún webhook.
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body || body.type !== "payment" || !body.data?.id) {
    return NextResponse.json({ received: true });
  }

  const paymentId = String(body.data.id);
  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");

  if (!(await verificarFirmaMercadoPago(xSignature, xRequestId, paymentId, secreto))) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 403 });
  }

  const supabase = createServiceRoleClient();

  // Nota importante para probar en sandbox: ahora que los pagos se crean
  // con el access_token DEL ESCRITOR (ver /api/checkout), este GET usa el
  // access_token de LA PLATAFORMA para leer los detalles del pago. Según
  // la documentación de Mercado Pago, una app de marketplace puede ver los
  // pagos de sus vendedores conectados (por eso existen los reportes
  // unificados de ventas) — pero si en la práctica esta llamada devuelve
  // 401/403, es señal de que hace falta usar el token del escritor acá
  // también. En ese caso, resolvé el escritor primero con una consulta
  // liviana antes de este fetch (por ejemplo, buscando el book_id en el
  // metadata que ya viajaba en la preferencia original).
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const respuestaMp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!respuestaMp.ok) {
    // Devolvemos error (no 200) para que Mercado Pago reintente el webhook
    // más tarde en vez de darlo por perdido.
    return NextResponse.json({ error: "No pudimos consultar el pago" }, { status: 502 });
  }

  const pago = await respuestaMp.json();
  const purchaseId = pago.external_reference;
  if (!purchaseId) return NextResponse.json({ received: true });

  const { data: compra } = await supabase
    .from("purchases")
    .select("*, books(id, title, author_id, total_sales, total_revenue)")
    .eq("id", purchaseId)
    .maybeSingle();

  if (!compra) return NextResponse.json({ received: true });

  // Idempotencia real: se basa en el estado actual de la compra, no en una
  // tabla aparte. Si ya no está "pending", este webhook (sea reintento o
  // llegada duplicada) no tiene nada más que hacer.
  if (compra.payment_status !== "pending") {
    return NextResponse.json({ received: true, already_processed: true });
  }

  if (pago.status === "approved") {
    // El `.eq("payment_status", "pending")` acá es la clave: si dos webhooks
    // llegan casi al mismo tiempo, solo UNO va a encontrar la fila todavía
    // en "pending" y lograr actualizarla. El otro recibe un array vacío en
    // `data` y no vuelve a acreditar el saldo del autor.
    const { data: actualizada } = await supabase
      .from("purchases")
      .update({ payment_status: "completed", payment_id: paymentId, completed_at: new Date().toISOString() })
      .eq("id", purchaseId)
      .eq("payment_status", "pending")
      .select("id")
      .maybeSingle();

    if (!actualizada) {
      // Perdimos la carrera contra otro webhook concurrente: ya se procesó.
      return NextResponse.json({ received: true, already_processed: true });
    }

    // Registro de auditoría best-effort. No bloquea el procesamiento del
    // pago si falla (por ejemplo por un reintento con el mismo payment_id).
    await supabase
      .from("webhook_events")
      .insert({ payment_id: paymentId, event_type: body.type })
      .then(() => {}, () => {});

    const libro = compra.books as unknown as {
      id: string;
      title: string;
      author_id: string;
      total_sales: number;
      total_revenue: number;
    } | null;

    if (libro) {
      await supabase
        .from("books")
        .update({
          total_sales: libro.total_sales + 1,
          total_revenue: Number(libro.total_revenue) + Number(compra.amount),
        })
        .eq("id", libro.id);

      const { data: perfil } = await supabase
        .from("profiles")
        .select("id, user_id, total_earnings")
        .eq("id", libro.author_id)
        .maybeSingle();

      if (perfil) {
        // Ya NO se acredita `balance`: con el split de pagos de Mercado
        // Pago (marketplace_fee), el 80% se transfiere directo a la cuenta
        // del escritor en la misma operación — Portal Danez nunca llega a
        // tener esa plata, así que no hay nada que "retirar" después.
        // `total_earnings` se mantiene solo como estadística histórica.
        await supabase
          .from("profiles")
          .update({
            total_earnings: Number(perfil.total_earnings) + Number(compra.author_earning),
          })
          .eq("id", perfil.id);

        await supabase.from("notifications").insert([
          {
            user_id: compra.user_id,
            type: "purchase",
            title: "¡Compra exitosa!",
            message: `Ya tenés "${libro.title}" en tu biblioteca.`,
            data: { book_id: libro.id, purchase_id: purchaseId },
          },
          {
            user_id: perfil.user_id,
            type: "sale",
            title: "¡Nueva venta!",
            message: `Vendiste una copia de "${libro.title}" — ya se acreditó en tu cuenta de Mercado Pago.`,
            data: { book_id: libro.id, amount: compra.author_earning },
          },
        ]);
      }
    }
  } else if (pago.status === "rejected" || pago.status === "cancelled") {
    await supabase
      .from("purchases")
      .update({ payment_status: "failed", payment_id: paymentId })
      .eq("id", purchaseId)
      .eq("payment_status", "pending");
  }
  // Nota: "refunded"/"charged_back" no se manejan todavía — requiere definir
  // si se le revierte el saldo al autor automáticamente o queda para
  // revisión manual desde el panel de admin. Se deja pendiente a propósito.

  return NextResponse.json({ received: true });
}
