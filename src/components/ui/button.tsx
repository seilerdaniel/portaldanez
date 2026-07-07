import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primario" | "secundario" | "fantasma";
type Tamaño = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  tamaño?: Tamaño;
}

const variantes: Record<Variant, string> = {
  primario: "bg-wine text-paper-card hover:bg-wine-dark",
  secundario: "bg-transparent border border-ink/30 text-ink hover:bg-ink/5",
  fantasma: "bg-transparent text-ink hover:bg-ink/5",
};

const tamaños: Record<Tamaño, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primario", tamaño = "md", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded font-medium transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variantes[variant],
          tamaños[tamaño],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
