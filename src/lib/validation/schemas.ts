import { z } from "zod";

/**
 * Un único lugar de verdad para las reglas de validación. Se usan tanto en
 * los formularios (react-hook-form + zodResolver) como en los Route
 * Handlers, para que el cliente y el servidor nunca queden desalineados.
 */

export const registroSchema = z
  .object({
    email: z.string().trim().email("Ingresá un email válido"),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .max(72, "La contraseña es demasiado larga"),
    confirmarPassword: z.string(),
    nombreVisible: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(80, "El nombre es demasiado largo"),
  })
  .refine((data) => data.password === data.confirmarPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmarPassword"],
  });

export type RegistroInput = z.infer<typeof registroSchema>;

export const ingresoSchema = z.object({
  email: z.string().trim().email("Ingresá un email válido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

export type IngresoInput = z.infer<typeof ingresoSchema>;

export const libroSchema = z.object({
  title: z.string().trim().min(2, "El título es muy corto").max(200),
  description: z.string().trim().min(20, "Contá un poco más sobre el libro").max(2000),
  synopsis: z.string().trim().max(5000).optional().or(z.literal("")),
  price: z.coerce
    .number({ invalid_type_error: "Ingresá un precio válido" })
    .min(0, "El precio no puede ser negativo")
    .max(500000, "El precio parece demasiado alto"),
  genreId: z.string().uuid("Elegí un género"),
  language: z.string().trim().min(2).max(40).default("Español"),
  pageCount: z.coerce.number().int().positive().optional(),
  isbn: z
    .string()
    .trim()
    .regex(/^[0-9-]{10,17}$/, "El ISBN no tiene un formato válido")
    .optional()
    .or(z.literal("")),
});

export type LibroInput = z.infer<typeof libroSchema>;

export const reseñaSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type ReseñaInput = z.infer<typeof reseñaSchema>;

export const checkoutSchema = z.object({
  bookId: z.string().uuid("Libro inválido"),
});

export const solicitudRetiroSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: "Ingresá un monto válido" })
    .positive("El monto debe ser mayor a cero"),
  destinationEmail: z.string().trim().email("Ingresá el email de Mercado Pago"),
});

export type SolicitudRetiroInput = z.infer<typeof solicitudRetiroSchema>;

export const perfilSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
  website: z.string().trim().url("La URL no es válida").optional().or(z.literal("")),
  location: z.string().trim().max(120).optional().or(z.literal("")),
});

export type PerfilInput = z.infer<typeof perfilSchema>;
