import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkoutSchema } from "@/lib/validation/schemas";
import { calcularReparto } from "@/lib/constants";

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Tenés que ingresar para comprar." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const validacion = checkoutSchema.safeParse(body);

  if (!validacion.success) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const { bookId } = validacion.data;
  const returnPath = typeof body?.returnPath === "string" ? body.returnPath : null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!returnPath || !siteUrl) {
    return NextResponse.json({ error: "Falta la URL de retorno." }, { status: 400 });
  }

  // Se arma con NEXT_PUBLIC_SITE_URL (server-side, confiable) en vez de con
  // el origen que mande el navegador, para que Mercado Pago siempre reciba
  // una URL pública real — incluso si estás probando localmente y tu
  // navegador está parado en http://localhost:3000.
  const returnUrl = `${siteUrl}${returnPath}`;

  const { data: libro, error: errorLibro } = await supabase
    .from("books")
    .select("id, title, price, author_id, profiles:author_id(display_name)")
    .eq("id", bookId)
    .eq("is_published", true)
    .maybeSingle();

  if (errorLibro || !libro) {
    return NextResponse.json({ error: "No encontramos ese libro." }, { status: 404 });
  }

  const { data: compraExistente } = await supabase
    .from("purchases")
    .select("id")
    .eq("book_id", bookId)
    .eq("user_id", user.id)
    .eq("payment_status", "completed")
    .maybeSingle();

  if (compraExistente) {
    return NextResponse.json({ error: "Ya tenés este libro." }, { status: 409 });
  }

  const { comision, gananciaAutor } = calcularReparto(libro.price);

  // upsert (no insert): si un intento anterior de compra quedó en "pending"
  // o "failed" -por ejemplo, porque se cayó la conexión con Mercado Pago
  // justo después de crear esta fila-, un insert normal chocaría contra la
  // restricción unique(user_id, book_id) y dejaría al usuario sin forma de
  // volver a intentar comprar ese libro. El upsert reinicia el intento.
  // Ya descartamos arriba que exista una compra "completed" para este par.
  const { data: compra, error: errorCompra } = await supabase
    .from("purchases")
    .upsert(
      {
        user_id: user.id,
        book_id: bookId,
        amount: libro.price,
        platform_fee: comision,
        author_earning: gananciaAutor,
        payment_status: "pending",
        payment_method: "mercadopago",
        payment_id: null,
        completed_at: null,
      },
      { onConflict: "user_id,book_id" }
    )
    .select("id")
    .single();

  if (errorCompra || !compra) {
    return NextResponse.json({ error: "No pudimos registrar la compra." }, { status: 500 });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: "Mercado Pago no está configurado." }, { status: 500 });
  }

  const autor = libro.profiles as unknown as { display_name: string } | null;

  const preferencia = {
    items: [
      {
        id: libro.id,
        title: libro.title,
        description: `Ebook por ${autor?.display_name ?? "autor independiente"}`,
        quantity: 1,
        currency_id: "ARS",
        unit_price: libro.price,
      },
    ],
    payer: { email: user.email },
    metadata: { user_id: user.id, book_id: bookId, purchase_id: compra.id },
    back_urls: {
      success: `${returnUrl}?status=success`,
      failure: `${returnUrl}?status=failure`,
      pending: `${returnUrl}?status=pending`,
    },
    auto_return: "approved",
    notification_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/mercadopago`,
    external_reference: compra.id,
  };

  const respuestaMp = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(preferencia),
  });

  if (!respuestaMp.ok) {
    const cuerpoError = await respuestaMp.text();
    console.error(
      `[checkout] Mercado Pago rechazó la preferencia (status ${respuestaMp.status}):`,
      cuerpoError
    );
    return NextResponse.json({ error: "Error al conectar con Mercado Pago." }, { status: 502 });
  }

  const datosMp = await respuestaMp.json();

  return NextResponse.json({ initPoint: datosMp.init_point, purchaseId: compra.id });
}
