"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { libroSchema, type LibroInput } from "@/lib/validation/schemas";
import { createClient } from "@/lib/supabase/client";
import { Campo } from "@/components/ui/campo";
import { Button } from "@/components/ui/button";
import type { Genre } from "@/types/database";

interface NuevoLibroFormProps {
  generos: Pick<Genre, "id" | "name">[];
  profileId: string;
}

function generarSlug(titulo: string) {
  return `${titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}-${Math.random().toString(36).slice(2, 7)}`;
}

const EXTENSIONES_LIBRO = ["pdf", "epub"] as const;
const EXTENSIONES_PORTADA = ["jpg", "jpeg", "png", "webp"] as const;
const TAMAÑO_MAX_LIBRO = 50 * 1024 * 1024; // 50MB
const TAMAÑO_MAX_PORTADA = 5 * 1024 * 1024; // 5MB

export function NuevoLibroForm({ generos, profileId }: NuevoLibroFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [archivoLibro, setArchivoLibro] = useState<File | null>(null);
  const [portada, setPortada] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LibroInput>({
    resolver: zodResolver(libroSchema),
    defaultValues: { language: "Español" },
  });

  function validarArchivo(
    archivo: File,
    extensionesPermitidas: readonly string[],
    tamañoMax: number
  ) {
    const extension = archivo.name.split(".").pop()?.toLowerCase() ?? "";
    if (!extensionesPermitidas.includes(extension)) {
      return `Formato no permitido (.${extension}). Usá: ${extensionesPermitidas.join(", ")}`;
    }
    if (archivo.size > tamañoMax) {
      return `El archivo supera el tamaño máximo permitido (${Math.round(tamañoMax / 1024 / 1024)}MB).`;
    }
    return null;
  }

  async function onSubmit(datos: LibroInput) {
    setError(null);

    if (!archivoLibro) {
      setError("Subí el archivo de tu libro (PDF o EPUB).");
      return;
    }

    const errorLibro = validarArchivo(archivoLibro, EXTENSIONES_LIBRO, TAMAÑO_MAX_LIBRO);
    if (errorLibro) return setError(errorLibro);

    if (portada) {
      const errorPortada = validarArchivo(portada, EXTENSIONES_PORTADA, TAMAÑO_MAX_PORTADA);
      if (errorPortada) return setError(errorPortada);
    }

    setSubiendo(true);

    try {
      const extensionLibro = archivoLibro.name.split(".").pop()!.toLowerCase();
      const rutaLibro = `${profileId}/${crypto.randomUUID()}.${extensionLibro}`;

      const { error: errorSubidaLibro } = await supabase.storage
        .from("book-files")
        .upload(rutaLibro, archivoLibro, { contentType: archivoLibro.type });

      if (errorSubidaLibro) throw new Error("No pudimos subir el archivo del libro.");

      let rutaPortada: string | null = null;
      if (portada) {
        const extensionPortada = portada.name.split(".").pop()!.toLowerCase();
        rutaPortada = `${profileId}/${crypto.randomUUID()}.${extensionPortada}`;

        const { error: errorSubidaPortada } = await supabase.storage
          .from("book-covers")
          .upload(rutaPortada, portada, { contentType: portada.type });

        if (errorSubidaPortada) throw new Error("No pudimos subir la portada.");
      }

      const coverUrl = rutaPortada
        ? supabase.storage.from("book-covers").getPublicUrl(rutaPortada).data.publicUrl
        : null;

      const slugGenerado = generarSlug(datos.title);

      // No usamos .select().single() encadenado al insert: Postgres evalúa
      // la política de SELECT sobre la fila recién insertada al pedir un
      // RETURNING, y esa evaluación se comporta distinto en el mismo
      // instante de la transacción que una lectura posterior separada
      // (lo confirmamos a mano en SQL: el insert solo funciona siempre,
      // el insert con RETURNING fallaba). Insertamos primero...
      const { error: errorInsert } = await supabase.from("books").insert({
        author_id: profileId,
        title: datos.title,
        slug: slugGenerado,
        description: datos.description,
        synopsis: datos.synopsis || null,
        price: datos.price,
        genre_id: datos.genreId,
        language: datos.language,
        page_count: datos.pageCount ?? null,
        isbn: datos.isbn || null,
        file_url: rutaLibro,
        file_type: extensionLibro as "pdf" | "epub",
        cover_url: coverUrl,
        is_published: false,
      });

      if (errorInsert) {
        console.error(
          "[nuevo-libro] Error al insertar el libro:",
          JSON.stringify(errorInsert, null, 2)
        );
        throw new Error(`No pudimos guardar el libro: ${errorInsert.message}`);
      }

      // ...y recién después lo buscamos, en una consulta aparte, por el
      // slug único que nosotros mismos generamos.
      const { data: libro, error: errorBusqueda } = await supabase
        .from("books")
        .select("id")
        .eq("slug", slugGenerado)
        .single();

      if (errorBusqueda || !libro) {
        console.error(
          "[nuevo-libro] El libro se guardó pero no pudimos recuperarlo:",
          JSON.stringify(errorBusqueda, null, 2)
        );
        throw new Error("El libro se guardó, pero no pudimos abrirlo automáticamente. Buscalo en Mis libros.");
      }

      router.push(`/escritor/libros/${libro.id}/editar`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <Campo label="Título" {...register("title")} error={errors.title?.message} />

      <div>
        <label htmlFor="description" className="text-sm font-medium">
          Descripción corta
        </label>
        <textarea
          id="description"
          rows={3}
          className="mt-1.5 w-full rounded border border-ink/20 bg-paper-card px-4 py-2 text-sm"
          {...register("description")}
        />
        {errors.description && (
          <p role="alert" className="mt-1.5 text-xs text-wine">
            {errors.description.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="synopsis" className="text-sm font-medium">
          Sinopsis (opcional)
        </label>
        <textarea
          id="synopsis"
          rows={5}
          className="mt-1.5 w-full rounded border border-ink/20 bg-paper-card px-4 py-2 text-sm"
          {...register("synopsis")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Campo label="Precio (ARS)" type="number" step="0.01" min="0" {...register("price")} error={errors.price?.message} />

        <div>
          <label htmlFor="genreId" className="text-sm font-medium">
            Género
          </label>
          <select
            id="genreId"
            className="mt-1.5 h-11 w-full rounded border border-ink/20 bg-paper-card px-4 text-sm"
            {...register("genreId")}
          >
            <option value="">Elegí un género</option>
            {generos.map((genero) => (
              <option key={genero.id} value={genero.id}>
                {genero.name}
              </option>
            ))}
          </select>
          {errors.genreId && (
            <p role="alert" className="mt-1.5 text-xs text-wine">
              {errors.genreId.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="archivo-libro" className="text-sm font-medium">
          Archivo del libro (PDF o EPUB, máx. 50MB)
        </label>
        <input
          id="archivo-libro"
          type="file"
          accept=".pdf,.epub"
          onChange={(e) => setArchivoLibro(e.target.files?.[0] ?? null)}
          className="mt-1.5 block w-full text-sm"
        />
      </div>

      <div>
        <label htmlFor="portada" className="text-sm font-medium">
          Portada (opcional, JPG/PNG/WEBP, máx. 5MB)
        </label>
        <input
          id="portada"
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          onChange={(e) => setPortada(e.target.files?.[0] ?? null)}
          className="mt-1.5 block w-full text-sm"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-wine">
          {error}
        </p>
      )}

      <Button type="submit" disabled={subiendo}>
        {subiendo ? "Subiendo…" : "Guardar como borrador"}
      </Button>
    </form>
  );
}
