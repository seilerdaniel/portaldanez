import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests de integración de /api/checkout.
 *
 * Se mockean Supabase, el rate limiter y Mercado Pago para poder probar
 * las reglas de negocio (usuario sin sesión, libro sin autor conectado,
 * compra duplicada, rate limit) sin necesitar una base de datos real ni
 * hacer llamadas HTTP de verdad a Mercado Pago.
 */

function crearBuilderMock() {
  const builder: Record<string, unknown> = {};
  const encadenables = [
    "select",
    "eq",
    "order",
    "gt",
    "gte",
    "in",
    "upsert",
    "update",
    "delete",
    "insert",
    "range",
    "textSearch",
  ];
  for (const metodo of encadenables) {
    builder[metodo] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn();
  builder.single = vi.fn();
  return builder as typeof builder & {
    maybeSingle: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
  };
}

const builder = crearBuilderMock();
const getUserMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: getUserMock },
    from: vi.fn(() => builder),
  }),
  createServiceRoleClient: () => ({
    from: vi.fn(() => builder),
  }),
}));

const checkRateLimitMock = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
}));

const getValidAccessTokenMock = vi.fn();
vi.mock("@/lib/mercadopago/oauth", () => ({
  getValidAccessTokenParaEscritor: (...args: unknown[]) => getValidAccessTokenMock(...args),
}));

const USUARIO = { id: "user-123", email: "lector@example.com" };
const LIBRO_CONECTADO = {
  id: "book-1",
  title: "Un libro de prueba",
  price: 1000,
  author_id: "author-1",
  profiles: { display_name: "Autora Ejemplo", mercadopago_connected: true },
};

function crearRequest(body: unknown) {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SITE_URL = "https://portaldanez.example.com";
  getUserMock.mockResolvedValue({ data: { user: USUARIO } });
  checkRateLimitMock.mockResolvedValue(true);
});

describe("POST /api/checkout", () => {
  it("rechaza si no hay sesión", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const { POST } = await import("@/app/api/checkout/route");
    const respuesta = await POST(crearRequest({ bookId: "book-1", returnPath: "/libro/x" }));

    expect(respuesta.status).toBe(401);
  });

  it("rechaza si se superó el rate limit", async () => {
    checkRateLimitMock.mockResolvedValue(false);

    const { POST } = await import("@/app/api/checkout/route");
    const respuesta = await POST(crearRequest({ bookId: "book-1", returnPath: "/libro/x" }));

    expect(respuesta.status).toBe(429);
  });

  it("rechaza un body inválido (bookId no es un UUID)", async () => {
    const { POST } = await import("@/app/api/checkout/route");
    const respuesta = await POST(crearRequest({ bookId: "no-es-un-uuid", returnPath: "/libro/x" }));

    expect(respuesta.status).toBe(400);
  });

  it("rechaza si el libro no existe o no está publicado", async () => {
    builder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const { POST } = await import("@/app/api/checkout/route");
    const respuesta = await POST(
      crearRequest({ bookId: "550e8400-e29b-41d4-a716-446655440000", returnPath: "/libro/x" })
    );

    expect(respuesta.status).toBe(404);
  });

  it("rechaza si el autor todavía no conectó Mercado Pago", async () => {
    builder.maybeSingle.mockResolvedValueOnce({
      data: { ...LIBRO_CONECTADO, profiles: { ...LIBRO_CONECTADO.profiles, mercadopago_connected: false } },
      error: null,
    });

    const { POST } = await import("@/app/api/checkout/route");
    const respuesta = await POST(
      crearRequest({ bookId: "550e8400-e29b-41d4-a716-446655440000", returnPath: "/libro/x" })
    );

    expect(respuesta.status).toBe(409);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error).toMatch(/no configuró cómo cobrar/i);
  });

  it("rechaza si el usuario ya tiene el libro comprado", async () => {
    builder.maybeSingle
      .mockResolvedValueOnce({ data: LIBRO_CONECTADO, error: null }) // libro
      .mockResolvedValueOnce({ data: { id: "purchase-vieja" }, error: null }); // ya comprado

    const { POST } = await import("@/app/api/checkout/route");
    const respuesta = await POST(
      crearRequest({ bookId: "550e8400-e29b-41d4-a716-446655440000", returnPath: "/libro/x" })
    );

    expect(respuesta.status).toBe(409);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error).toMatch(/ya tenés este libro/i);
  });

  it("crea la preferencia con marketplace_fee usando el token del escritor", async () => {
    builder.maybeSingle
      .mockResolvedValueOnce({ data: LIBRO_CONECTADO, error: null }) // libro
      .mockResolvedValueOnce({ data: null, error: null }); // no tiene compra previa completada
    builder.single.mockResolvedValueOnce({ data: { id: "purchase-nueva" }, error: null });

    getValidAccessTokenMock.mockResolvedValue("TOKEN_DEL_ESCRITOR");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ init_point: "https://mercadopago.com/pagar/xyz" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("@/app/api/checkout/route");
    const respuesta = await POST(
      crearRequest({ bookId: "550e8400-e29b-41d4-a716-446655440000", returnPath: "/libro/x" })
    );

    expect(respuesta.status).toBe(200);

    const llamada = fetchMock.mock.calls[0];
    expect(llamada).toBeDefined();
    const [, opciones] = llamada!;
    expect(opciones.headers.Authorization).toBe("Bearer TOKEN_DEL_ESCRITOR");

    const cuerpoEnviado = JSON.parse(opciones.body);
    expect(cuerpoEnviado.marketplace_fee).toBe(200); // 20% de 1000
    expect(cuerpoEnviado.back_urls.success).toContain("https://portaldanez.example.com");

    vi.unstubAllGlobals();
  });
});
