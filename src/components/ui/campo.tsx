import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/**
 * Envuelto en forwardRef a propósito: react-hook-form's register() devuelve
 * una `ref` que tiene que llegar hasta el <input> real del DOM para que el
 * campo quede registrado. Sin forwardRef, React descarta esa ref (con un
 * warning en consola) y el campo nunca se registra — el resultado es que
 * el formulario reporta "Required" en todos los campos aunque estén
 * completos, porque react-hook-form nunca llegó a leer ningún valor.
 */
export const Campo = forwardRef<HTMLInputElement, CampoProps>(
  ({ label, error, id, className, ...props }, ref) => {
    const campoId = id ?? props.name;

    return (
      <div>
        <label htmlFor={campoId} className="text-sm font-medium">
          {label}
        </label>
        <input
          ref={ref}
          id={campoId}
          className={cn(
            "mt-1.5 h-11 w-full rounded border border-ink/20 bg-paper-card px-4 text-sm",
            error && "border-wine",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${campoId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${campoId}-error`} role="alert" className="mt-1.5 text-xs text-wine">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Campo.displayName = "Campo";
