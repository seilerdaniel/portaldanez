import { describe, it, expect } from "vitest";
import { registroSchema, libroSchema, solicitudRetiroSchema } from "@/lib/validation/schemas";

describe("registroSchema", () => {
  it("rechaza si las contraseñas no coinciden", () => {
    const resultado = registroSchema.safeParse({
      email: "autora@example.com",
      password: "unapassword123",
      confirmarPassword: "otrapassword123",
      nombreVisible: "Autora Ejemplo",
    });

    expect(resultado.success).toBe(false);
  });

  it("acepta datos válidos", () => {
    const resultado = registroSchema.safeParse({
      email: "autora@example.com",
      password: "unapassword123",
      confirmarPassword: "unapassword123",
      nombreVisible: "Autora Ejemplo",
    });

    expect(resultado.success).toBe(true);
  });

  it("rechaza contraseñas demasiado cortas", () => {
    const resultado = registroSchema.safeParse({
      email: "autora@example.com",
      password: "1234",
      confirmarPassword: "1234",
      nombreVisible: "Autora Ejemplo",
    });

    expect(resultado.success).toBe(false);
  });
});

describe("libroSchema", () => {
  const base = {
    title: "Un cuento porteño",
    description: "Una descripción con más de veinte caracteres para pasar la validación.",
    price: 1500,
    genreId: "550e8400-e29b-41d4-a716-446655440000",
    language: "Español",
  };

  it("acepta un libro válido", () => {
    expect(libroSchema.safeParse(base).success).toBe(true);
  });

  it("rechaza precios negativos", () => {
    expect(libroSchema.safeParse({ ...base, price: -100 }).success).toBe(false);
  });

  it("rechaza un genreId que no es UUID", () => {
    expect(libroSchema.safeParse({ ...base, genreId: "no-es-un-uuid" }).success).toBe(false);
  });
});

describe("solicitudRetiroSchema", () => {
  it("rechaza montos negativos o cero", () => {
    expect(
      solicitudRetiroSchema.safeParse({ amount: 0, destinationEmail: "a@b.com" }).success
    ).toBe(false);
    expect(
      solicitudRetiroSchema.safeParse({ amount: -50, destinationEmail: "a@b.com" }).success
    ).toBe(false);
  });

  it("rechaza emails inválidos", () => {
    expect(
      solicitudRetiroSchema.safeParse({ amount: 100, destinationEmail: "no-es-un-email" }).success
    ).toBe(false);
  });

  it("acepta una solicitud válida", () => {
    expect(
      solicitudRetiroSchema.safeParse({ amount: 100, destinationEmail: "autora@example.com" })
        .success
    ).toBe(true);
  });
});
