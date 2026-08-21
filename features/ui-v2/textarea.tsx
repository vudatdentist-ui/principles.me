"use client";

import { useId, type ReactNode, type TextareaHTMLAttributes } from "react";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  containerClassName?: string;
  error?: ReactNode;
  hint?: ReactNode;
  label: ReactNode;
  labelHidden?: boolean;
};

export function Textarea({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  className,
  containerClassName,
  error,
  hint,
  id,
  label,
  labelHidden = false,
  ...textareaProps
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const hintId = `${textareaId}-hint`;
  const errorId = `${textareaId}-error`;
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
  const textareaClasses = ["v2-textarea", className].filter(Boolean).join(" ");
  const labelClasses = [
    "v2-field__label",
    labelHidden ? "v2-visually-hidden" : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={fieldClasses}>
      <label className={labelClasses} htmlFor={textareaId}>
        {label}
      </label>
      <textarea
        aria-describedby={describedBy || undefined}
        aria-invalid={hasError ? true : ariaInvalid}
        className={textareaClasses}
        id={textareaId}
        {...textareaProps}
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
