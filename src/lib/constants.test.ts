import { describe, it, expect } from "vitest";
import { calcularReparto, formatearMoneda, COMISION_PLATAFORMA } from "@/lib/constants";

describe("calcularReparto", () => {
  it("aplica el 20% de comisión sobre el precio", () => {
    expect(COMISION_PLATAFORMA).toBe(0.2);

    const { comision, gananciaAutor } = calcularReparto(1000);
    expect(comision).toBe(200);
    expect(gananciaAutor).toBe(800);
  });

  it("la comisión más la ganancia del autor siempre suman el precio original", () => {
    for (const precio of [0, 1, 999, 1234.56, 50000]) {
      const { comision, gananciaAutor } = calcularReparto(precio);
      expect(Math.round((comision + gananciaAutor) * 100) / 100).toBe(precio);
    }
  });

  it("redondea a centavos para evitar errores de punto flotante", () => {
    const { comision, gananciaAutor } = calcularReparto(33.33);
    expect(Number.isInteger(comision * 100)).toBe(true);
    expect(Number.isInteger(gananciaAutor * 100)).toBe(true);
  });

  it("nunca genera un valor negativo con precio 0", () => {
    const { comision, gananciaAutor } = calcularReparto(0);
    expect(comision).toBe(0);
    expect(gananciaAutor).toBe(0);
  });
});

describe("formatearMoneda", () => {
  it("formatea como pesos argentinos sin decimales", () => {
    const resultado = formatearMoneda(1500);
    expect(resultado).toContain("1.500");
  });
});
