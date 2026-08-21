import type { ComponentPropsWithoutRef } from "react";

export function Divider({
  className,
  ...dividerProps
}: ComponentPropsWithoutRef<"hr">) {
  const classes = ["v2-divider", className].filter(Boolean).join(" ");

  return <hr className={classes} {...dividerProps} />;
}
