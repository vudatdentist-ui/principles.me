import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "quiet" | "secondary";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({
  className,
  type = "button",
  variant = "primary",
  ...buttonProps
}: ButtonProps) {
  const classes = ["v2-button", `v2-button--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return <button className={classes} type={type} {...buttonProps} />;
}
