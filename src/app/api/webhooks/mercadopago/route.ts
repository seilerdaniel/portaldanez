import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

async function calcularHmac(secreto: string, mensaje: string) {
  const encoder = new TextEncoder();
  const clave = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const firma = await crypto.subtle.sign("HMAC", clave, encoder.encode(mensaje));
  return Array.from(new Uint8Array(firma))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verificarFirma(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string,
  secreto: string
) {
  if (!xSignature || !xRequestId) return false;

  const partes = Object.fromEntries(
    xSignature.split(",").map((p) => p.trim().split("=") as [string, string])
  );
  const ts = partes.ts;
  const hash = partes.v1;
  if (!ts || !hash) return false;

  // Ventana de 5 minutos para evitar reproducir eventos viejos.
  if (Date.now() / 1000 - parseInt(ts, 10) > 300) return false;

  const manifiesto = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hashEsperado = await calcularHmac(secreto, manifiesto);

  return hashEsperado === hash;
}

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

  if (!(await verificarFirma(xSignature, xRequestId, paymentId, secreto))) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 403 });
  }

  const supabase = createServiceRoleClient();

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
        .select("id, user_id, balance, total_earnings")
        .eq("id", libro.author_id)
        .maybeSingle();

      if (perfil) {
        await supabase
          .from("profiles")
          .update({
            balance: Number(perfil.balance) + Number(compra.author_earning),
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
            message: `Vendiste una copia de "${libro.title}".`,
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
