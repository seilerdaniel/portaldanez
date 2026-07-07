import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps {
  avatarUrl: string | null;
  nombre: string;
  tamaño?: "sm" | "md" | "lg";
}

const TAMAÑOS = {
  sm: { clase: "h-9 w-9", texto: "text-sm", px: 36 },
  md: { clase: "h-16 w-16", texto: "text-xl", px: 64 },
  lg: { clase: "h-24 w-24", texto: "text-3xl", px: 96 },
};

export function Avatar({ avatarUrl, nombre, tamaño = "md" }: AvatarProps) {
  const { clase, texto, px } = TAMAÑOS[tamaño];

  return (
    <div
      className={cn(
        "relative flex flex-none items-center justify-center overflow-hidden rounded-full bg-pine",
        clase
      )}
    >
      {avatarUrl ? (
        <Image src={avatarUrl} alt="" fill className="object-cover" sizes={`${px}px`} />
      ) : (
        <span className={cn("font-semibold text-paper-card", texto)}>
          {nombre[0]?.toUpperCase() ?? "?"}
        </span>
      )}
    </div>
  );
}
