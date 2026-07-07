"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Star } from "lucide-react";
import { reseñaSchema, type ReseñaInput } from "@/lib/validation/schemas";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReseñaFormProps {
  bookId: string;
  userId: string;
  reseñaExistente: { rating: number; comment: string | null } | null;
}

export function ReseñaForm({ bookId, userId, reseñaExistente }: ReseñaFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [ratingSeleccionado, setRatingSeleccionado] = useState(reseñaExistente?.rating ?? 0);
  const [ratingHover, setRatingHover] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ReseñaInput>({
    resolver: zodResolver(reseñaSchema),
    defaultValues: {
      rating: reseñaExistente?.rating ?? 0,
      comment: reseñaExistente?.comment ?? "",
    },
  });

  function elegirRating(valor: number) {
    setRatingSeleccionado(valor);
    setValue("rating", valor, { shouldValidate: true });
  }

  async function onSubmit(datos: ReseñaInput) {
    setError(null);
    setEnviando(true);

    const { error: errorUpsert } = await supabase.from("reviews").upsert(
      {
        user_id: userId,
        book_id: bookId,
        rating: datos.rating,
        comment: datos.comment || null,
        is_verified_purchase: true,
      },
      { onConflict: "user_id,book_id" }
    );

    setEnviando(false);

    if (errorUpsert) {
      setError("No pudimos guardar tu reseña. Intentá de nuevo.");
      return;
    }

    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded border border-ink/10 bg-paper-card p-6"
      noValidate
    >
      <p className="font-medium">
        {reseñaExistente ? "Editá tu reseña" : "Dejá tu reseña"}
      </p>

      <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Calificación">
        {[1, 2, 3, 4, 5].map((valor) => (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={ratingSeleccionado === valor}
            aria-label={`${valor} de 5 estrellas`}
            onClick={() => elegirRating(valor)}
            onMouseEnter={() => setRatingHover(valor)}
            onMouseLeave={() => setRatingHover(0)}
            className="p-0.5"
          >
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                (ratingHover || ratingSeleccionado) >= valor
                  ? "fill-mustard text-mustard"
                  : "text-ink/20"
              )}
            />
          </button>
        ))}
      </div>
      {errors.rating && (
        <p role="alert" className="mt-1 text-xs text-wine">
          Elegí una calificación
        </p>
      )}
      <input type="hidden" {...register("rating")} />

      <textarea
        rows={3}
        placeholder="¿Qué te pareció? (opcional)"
        className="mt-4 w-full rounded border border-ink/20 bg-paper px-4 py-2 text-sm"
        {...register("comment")}
      />

      {error && (
        <p role="alert" className="mt-2 text-sm text-wine">
          {error}
        </p>
      )}

      <Button type="submit" tamaño="sm" className="mt-4" disabled={enviando}>
        {enviando ? "Guardando…" : reseñaExistente ? "Actualizar reseña" : "Publicar reseña"}
      </Button>
    </form>
  );
}
