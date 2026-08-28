import type { InputHTMLAttributes } from "react";
import { useId } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function TextField({ label, error, hint, id, className, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={inputId}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        aria-invalid={Boolean(error) || undefined}
        className={`min-h-11 rounded-lg border border-border bg-surface px-4 text-base text-foreground outline-none focus-visible:border-brand-blue focus-visible:ring-2 focus-visible:ring-brand-blue/30 ${className ?? ""}`}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-sm text-foreground/60">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-status-below">
          {error}
        </p>
      ) : null}
    </div>
  );
}
