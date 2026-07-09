import { describe, it, expect } from "vitest";
import { calcularHmac, verificarFirmaMercadoPago } from "@/lib/mercadopago/webhook-signature";

const SECRETO = "un-secreto-de-prueba";

async function construirFirmaValida(dataId: string, requestId: string, tsSegundos: number) {
  const manifiesto = `id:${dataId};request-id:${requestId};ts:${tsSegundos};`;
  const hash = await calcularHmac(SECRETO, manifiesto);
  return `ts=${tsSegundos},v1=${hash}`;
}

describe("verificarFirmaMercadoPago", () => {
  it("acepta una firma válida y reciente", async () => {
    const ahoraMs = Date.now();
    const ts = Math.floor(ahoraMs / 1000);
    const firma = await construirFirmaValida("123456", "req-1", ts);

    const resultado = await verificarFirmaMercadoPago(firma, "req-1", "123456", SECRETO, ahoraMs);
    expect(resultado).toBe(true);
  });

  it("rechaza si falta el header x-signature", async () => {
    const resultado = await verificarFirmaMercadoPago(null, "req-1", "123456", SECRETO);
    expect(resultado).toBe(false);
  });

  it("rechaza si falta el header x-request-id", async () => {
    const firma = await construirFirmaValida("123456", "req-1", Math.floor(Date.now() / 1000));
    const resultado = await verificarFirmaMercadoPago(firma, null, "123456", SECRETO);
    expect(resultado).toBe(false);
  });

  it("rechaza si el secreto no coincide (firma fabricada por un tercero)", async () => {
    const ts = Math.floor(Date.now() / 1000);
    const firmaConOtroSecreto = await construirFirmaValida("123456", "req-1", ts);
    // Verificamos con un secreto DISTINTO al que se usó para firmar —
    // simula a alguien que intenta falsificar una notificación sin conocer
    // nuestra clave real.
    const resultado = await verificarFirmaMercadoPago(
      firmaConOtroSecreto,
      "req-1",
      "123456",
      "otro-secreto-que-no-es-el-nuestro"
    );
    expect(resultado).toBe(false);
  });

  it("rechaza si el data.id no coincide con el firmado", async () => {
    const ts = Math.floor(Date.now() / 1000);
    const firma = await construirFirmaValida("123456", "req-1", ts);

    // Alguien reutiliza una firma válida pero para un payment_id distinto.
    const resultado = await verificarFirmaMercadoPago(firma, "req-1", "999999", SECRETO);
    expect(resultado).toBe(false);
  });

  it("rechaza una firma vieja (replay attack)", async () => {
    const ahoraMs = Date.now();
    const tsViejo = Math.floor(ahoraMs / 1000) - 3600; // hace 1 hora
    const firma = await construirFirmaValida("123456", "req-1", tsViejo);

    const resultado = await verificarFirmaMercadoPago(firma, "req-1", "123456", SECRETO, ahoraMs);
    expect(resultado).toBe(false);
  });

  it("rechaza si falta el campo ts en la firma", async () => {
    const resultado = await verificarFirmaMercadoPago("v1=abc123", "req-1", "123456", SECRETO);
    expect(resultado).toBe(false);
  });

  it("rechaza si falta el campo v1 en la firma", async () => {
    const resultado = await verificarFirmaMercadoPago(
      `ts=${Math.floor(Date.now() / 1000)}`,
      "req-1",
      "123456",
      SECRETO
    );
    expect(resultado).toBe(false);
  });

  it("rechaza si el secreto está vacío (fail closed)", async () => {
    const ts = Math.floor(Date.now() / 1000);
    const firma = await construirFirmaValida("123456", "req-1", ts);
    const resultado = await verificarFirmaMercadoPago(firma, "req-1", "123456", "");
    expect(resultado).toBe(false);
  });
});

describe("calcularHmac", () => {
  it("es determinístico: el mismo secreto y mensaje siempre dan el mismo hash", async () => {
    const a = await calcularHmac("secreto", "mensaje-de-prueba");
    const b = await calcularHmac("secreto", "mensaje-de-prueba");
    expect(a).toBe(b);
  });

  it("da resultados distintos ante mensajes distintos", async () => {
    const a = await calcularHmac("secreto", "mensaje-uno");
    const b = await calcularHmac("secreto", "mensaje-dos");
    expect(a).not.toBe(b);
  });
});
