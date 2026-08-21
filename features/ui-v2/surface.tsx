import type { ComponentPropsWithoutRef } from "react";

export type SurfaceVariant = "outlined" | "plain" | "soft";

export type SurfaceProps = ComponentPropsWithoutRef<"div"> & {
  variant?: SurfaceVariant;
};

export function Surface({
  className,
  variant = "plain",
  ...surfaceProps
}: SurfaceProps) {
  const classes = ["v2-surface", `v2-surface--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return <div className={classes} {...surfaceProps} />;
}
