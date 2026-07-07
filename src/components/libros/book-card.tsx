import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { formatearMoneda } from "@/lib/constants";
import type { Book } from "@/types/database";

interface BookCardProps {
  book: Pick<
    Book,
    "slug" | "title" | "cover_url" | "price" | "average_rating" | "review_count"
  > & { autor: string };
}

export function BookCard({ book }: BookCardProps) {
  return (
    <Link href={`/libro/${book.slug}`} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-book bg-ink/5 shadow-cover transition-transform group-hover:-translate-y-1">
        {book.cover_url ? (
          <Image
            src={book.cover_url}
            alt={`Portada de ${book.title}`}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 45vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center font-display text-sm text-ink-soft">
            {book.title}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <p className="line-clamp-2 font-display text-sm font-semibold leading-snug">
          {book.title}
        </p>
        <p className="text-xs text-ink-soft">{book.autor}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="font-mono text-sm font-medium text-wine">
            {formatearMoneda(book.price)}
          </span>
          {book.review_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-ink-soft">
              <Star className="h-3.5 w-3.5 fill-mustard text-mustard" />
              {book.average_rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
