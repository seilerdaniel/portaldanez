import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkoutSchema } from "@/lib/validation/schemas";
import { calcularReparto } from "@/lib/constants";
import { getValidAccessTokenParaEscritor } from "@/lib/mercadopago/oauth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Tenés que ingresar para comprar." }, { status: 401 });
  }

  // Máximo 10 intentos de checkout por usuario cada 60 segundos — deja de
  // sobra para reintentos legítimos, pero frena un script que spamee el
  // endpoint generando preferencias de pago de más.
  const permitido = await checkRateLimit(`checkout:${user.id}`, 10, 60);
  if (!permitido) {
    return NextResponse.json(
      { error: "Hiciste demasiados intentos. Esperá un minuto y probá de nuevo." },
      { status: 429 }
    );
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
    .select("id, title, price, author_id")
    .eq("id", bookId)
    .eq("is_published", true)
    .maybeSingle();

  if (errorLibro || !libro) {
    return NextResponse.json({ error: "No encontramos ese libro." }, { status: 404 });
  }

  // El nombre del autor se lee de public_profiles (la vista pensada
  // justamente para esto) en vez de la tabla profiles directamente: RLS en
  // profiles solo deja ver la fila propia, así que leerla como el
  // comprador (no el autor) siempre devolvía vacío — por eso NO se valida
  // acá si el autor conectó Mercado Pago; esa verificación real (la que
  // importa) es la de getValidAccessTokenParaEscritor más abajo, que sí
  // corre con permisos de servidor.
  const { data: autorInfo } = await supabase
    .from("public_profiles")
    .select("display_name")
    .eq("id", libro.author_id)
    .maybeSingle();

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
  //
  // No encadenamos .select().single() al upsert: vimos en la práctica que
  // pedirle a Postgres el RETURNING de una fila recién escrita evalúa la
  // política de SELECT en un momento raro de la transacción y puede
  // rechazarla con un error de RLS aunque una lectura posterior separada
  // funcione perfecto (nos pasó con "books"). Por eso separamos el upsert
  // de la lectura del id.
  const { error: errorCompra } = await supabase.from("purchases").upsert(
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
  );

  if (errorCompra) {
    return NextResponse.json({ error: "No pudimos registrar la compra." }, { status: 500 });
  }

  const { data: compra, error: errorBusquedaCompra } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("book_id", bookId)
    .single();

  if (errorBusquedaCompra || !compra) {
    return NextResponse.json({ error: "No pudimos registrar la compra." }, { status: 500 });
  }

  const accessTokenEscritor = await getValidAccessTokenParaEscritor(libro.author_id);
  if (!accessTokenEscritor) {
    return NextResponse.json(
      { error: "Este autor todavía no configuró cómo cobrar. Probá de nuevo más tarde." },
      { status: 409 }
    );
  }

  const preferencia = {
    items: [
      {
        id: libro.id,
        title: libro.title,
        description: `Ebook por ${autorInfo?.display_name ?? "autor independiente"}`,
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
    // Clave del split de pagos: se crea la preferencia con el access_token
    // DEL ESCRITOR (no el de la plataforma), y marketplace_fee es el monto
    // (en pesos, no %) que Mercado Pago nos retiene a nosotros — el resto
    // se acredita directo a la cuenta del escritor en la misma operación.
    marketplace_fee: comision,
  };

  const respuestaMp = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessTokenEscritor}`,
    },
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
