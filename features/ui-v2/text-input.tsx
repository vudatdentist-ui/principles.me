"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";

export type TextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> & {
  containerClassName?: string;
  error?: ReactNode;
  hint?: ReactNode;
  label: ReactNode;
  labelHidden?: boolean;
};

export function TextInput({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  className,
  containerClassName,
  error,
  hint,
  id,
  label,
  labelHidden = false,
  type = "text",
  ...inputProps
}: TextInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const hasHint = hint !== undefined && hint !== null;
  const hasError = error !== undefined && error !== null;
  const describedBy = [
    ariaDescribedBy,
    hasHint ? hintId : undefined,
    hasError ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(" ");
  const fieldClasses = ["v2-field", containerClassName]
    .filter(Boolean)
    .join(" ");
  const inputClasses = ["v2-text-input", className].filter(Boolean).join(" ");
  const labelClasses = [
    "v2-field__label",
    labelHidden ? "v2-visually-hidden" : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={fieldClasses}>
      <label className={labelClasses} htmlFor={inputId}>
        {label}
      </label>
      <input
        aria-describedby={describedBy || undefined}
        aria-invalid={hasError ? true : ariaInvalid}
        className={inputClasses}
        id={inputId}
        type={type}
        {...inputProps}
      />
      {hasHint ? (
        <span className="v2-field__hint" id={hintId}>
          {hint}
        </span>
      ) : null}
      {hasError ? (
        <span className="v2-field__error" id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
