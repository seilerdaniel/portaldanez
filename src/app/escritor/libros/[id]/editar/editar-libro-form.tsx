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

interface LibroExistente {
  id: string;
  title: string;
  description: string;
  synopsis: string | null;
  price: number;
  genre_id: string | null;
  language: string;
  page_count: number | null;
  isbn: string | null;
  is_published: boolean;
  cover_url: string | null;
  file_url: string | null;
}

interface EditarLibroFormProps {
  libro: LibroExistente;
  generos: Pick<Genre, "id" | "name">[];
  profileId: string;
}

const EXTENSIONES_LIBRO = ["pdf", "epub"] as const;
const EXTENSIONES_PORTADA = ["jpg", "jpeg", "png", "webp"] as const;
const TAMAÑO_MAX_LIBRO = 50 * 1024 * 1024;
const TAMAÑO_MAX_PORTADA = 5 * 1024 * 1024;

export function EditarLibroForm({ libro, generos, profileId }: EditarLibroFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [nuevoArchivo, setNuevoArchivo] = useState<File | null>(null);
  const [nuevaPortada, setNuevaPortada] = useState<File | null>(null);
  const [publicado, setPublicado] = useState(libro.is_published);
  const [error, setError] = useState<string | null>(null);
  const [mensajeOk, setMensajeOk] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LibroInput>({
    resolver: zodResolver(libroSchema),
    defaultValues: {
      title: libro.title,
      description: libro.description,
      synopsis: libro.synopsis ?? "",
      price: libro.price,
      genreId: libro.genre_id ?? "",
      language: libro.language,
      pageCount: libro.page_count ?? undefined,
      isbn: libro.isbn ?? "",
    },
  });

  function validarArchivo(archivo: File, extensiones: readonly string[], tamañoMax: number) {
    const extension = archivo.name.split(".").pop()?.toLowerCase() ?? "";
    if (!extensiones.includes(extension)) {
      return `Formato no permitido (.${extension}). Usá: ${extensiones.join(", ")}`;
    }
    if (archivo.size > tamañoMax) {
      return `El archivo supera el tamaño máximo permitido (${Math.round(tamañoMax / 1024 / 1024)}MB).`;
    }
    return null;
  }

  async function onSubmit(datos: LibroInput) {
    setError(null);
    setMensajeOk(null);
    setGuardando(true);

    try {
      let fileUrl = libro.file_url;
      let fileType: "pdf" | "epub" | undefined;
      let coverUrl = libro.cover_url;

      if (nuevoArchivo) {
        const errorArchivo = validarArchivo(nuevoArchivo, EXTENSIONES_LIBRO, TAMAÑO_MAX_LIBRO);
        if (errorArchivo) throw new Error(errorArchivo);

        const extension = nuevoArchivo.name.split(".").pop()!.toLowerCase();
        const ruta = `${profileId}/${crypto.randomUUID()}.${extension}`;

        const { error: errorSubida } = await supabase.storage
          .from("book-files")
          .upload(ruta, nuevoArchivo, { contentType: nuevoArchivo.type });

        if (errorSubida) throw new Error("No pudimos subir el nuevo archivo del libro.");

        fileUrl = ruta;
        fileType = extension as "pdf" | "epub";
      }

      if (nuevaPortada) {
        const errorPortada = validarArchivo(nuevaPortada, EXTENSIONES_PORTADA, TAMAÑO_MAX_PORTADA);
        if (errorPortada) throw new Error(errorPortada);

        const extension = nuevaPortada.name.split(".").pop()!.toLowerCase();
        const ruta = `${profileId}/${crypto.randomUUID()}.${extension}`;

        const { error: errorSubida } = await supabase.storage
          .from("book-covers")
          .upload(ruta, nuevaPortada, { contentType: nuevaPortada.type });

        if (errorSubida) throw new Error("No pudimos subir la nueva portada.");

        coverUrl = supabase.storage.from("book-covers").getPublicUrl(ruta).data.publicUrl;
      }

      const yaEstabaPublicado = libro.is_published;

      const { error: errorUpdate } = await supabase
        .from("books")
        .update({
          title: datos.title,
          description: datos.description,
          synopsis: datos.synopsis || null,
          price: datos.price,
          genre_id: datos.genreId,
          language: datos.language,
          page_count: datos.pageCount ?? null,
          isbn: datos.isbn || null,
          file_url: fileUrl,
          ...(fileType ? { file_type: fileType } : {}),
          cover_url: coverUrl,
          is_published: publicado,
          published_at: !yaEstabaPublicado && publicado ? new Date().toISOString() : undefined,
        })
        .eq("id", libro.id);

      if (errorUpdate) throw new Error("No pudimos guardar los cambios.");

      setMensajeOk("Cambios guardados.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarLibro() {
    if (!window.confirm(`¿Seguro que querés eliminar "${libro.title}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setEliminando(true);
    setError(null);

    const { error: errorDelete } = await supabase.from("books").delete().eq("id", libro.id);

    if (errorDelete) {
      setError("No pudimos eliminar el libro. Si ya tiene ventas, no se puede borrar.");
      setEliminando(false);
      return;
    }

    router.push("/escritor/libros");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="flex items-center justify-between rounded border border-ink/10 bg-paper-card p-4">
        <div>
          <p className="font-medium">{publicado ? "Publicado" : "Borrador"}</p>
          <p className="text-sm text-ink-soft">
            {publicado ? "Visible en el catálogo." : "Solo vos lo podés ver."}
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={publicado}
            onChange={(e) => setPublicado(e.target.checked)}
            className="h-5 w-5"
          />
          Publicado
        </label>
      </div>

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
        <Campo
          label="Precio (ARS)"
          type="number"
          step="0.01"
          min="0"
          {...register("price")}
          error={errors.price?.message}
        />

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
          Reemplazar archivo del libro (opcional, PDF o EPUB, máx. 50MB)
        </label>
        <input
          id="archivo-libro"
          type="file"
          accept=".pdf,.epub"
          onChange={(e) => setNuevoArchivo(e.target.files?.[0] ?? null)}
          className="mt-1.5 block w-full text-sm"
        />
      </div>

      <div>
        <label htmlFor="portada" className="text-sm font-medium">
          Reemplazar portada (opcional, JPG/PNG/WEBP, máx. 5MB)
        </label>
        <input
          id="portada"
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          onChange={(e) => setNuevaPortada(e.target.files?.[0] ?? null)}
          className="mt-1.5 block w-full text-sm"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-wine">
          {error}
        </p>
      )}
      {mensajeOk && <p className="text-sm text-pine">{mensajeOk}</p>}

      <div className="flex items-center justify-between border-t border-ink/10 pt-5">
        <Button type="submit" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar cambios"}
        </Button>

        <button
          type="button"
          onClick={eliminarLibro}
          disabled={eliminando}
          className="text-sm text-wine hover:underline disabled:opacity-50"
        >
          {eliminando ? "Eliminando…" : "Eliminar libro"}
        </button>
      </div>
    </form>
  );
}
