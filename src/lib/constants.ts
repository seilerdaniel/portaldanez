/**
 * Reglas de negocio centralizadas. La comisión vive en UN solo lugar y la
 * usan tanto el checkout como cualquier página que la muestre — así nunca
 * puede quedar desincronizada entre el copy de marketing y el cálculo real.
 */
export const COMISION_PLATAFORMA = 0.2; // 20%

export function calcularReparto(precio: number) {
  const comision = Math.round(precio * COMISION_PLATAFORMA * 100) / 100;
  const gananciaAutor = Math.round((precio - comision) * 100) / 100;
  return { comision, gananciaAutor };
}

export function formatearMoneda(monto: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(monto);
}
