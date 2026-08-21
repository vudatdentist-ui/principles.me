import type { ComponentPropsWithoutRef } from "react";

export type StatusTextTone = "accent" | "muted" | "neutral";

export type StatusTextProps = ComponentPropsWithoutRef<"p"> & {
  tone?: StatusTextTone;
};

export function StatusText({
  className,
  role = "status",
  tone = "neutral",
  ...paragraphProps
}: StatusTextProps) {
  const classes = ["v2-status-text", `v2-status-text--${tone}`, className]
    .filter(Boolean)
    .join(" ");

  return <p className={classes} role={role} {...paragraphProps} />;
}
