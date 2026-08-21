import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type DisclosureProps = Omit<
  ComponentPropsWithoutRef<"details">,
  "children"
> & {
  children: ReactNode;
  summary: ReactNode;
};

export function Disclosure({
  children,
  className,
  summary,
  ...detailsProps
}: DisclosureProps) {
  const classes = ["v2-disclosure", className].filter(Boolean).join(" ");

  return (
    <details className={classes} {...detailsProps}>
      <summary className="v2-disclosure__summary">
        <span>{summary}</span>
        <span aria-hidden="true" className="v2-disclosure__marker" />
      </summary>
      <div className="v2-disclosure__content">{children}</div>
    </details>
  );
}
