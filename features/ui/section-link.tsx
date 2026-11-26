"use client";
import type { ComponentProps } from "react";

export function SectionLink({
  href,
  ...props
}: ComponentProps<"a"> & { href: `#${string}` }) {
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey)
          return;
        // Streamed pages can retain a hidden copy of the destination outside this shell.
        const target = event.currentTarget
          .closest("[data-workspace-shell]")
          ?.querySelector<HTMLElement>(`#${CSS.escape(href.slice(1))}`);
        if (!target) return;
        event.preventDefault();
        if (location.hash !== href) history.pushState(history.state, "", href);
        target.scrollIntoView();
        target.focus({ preventScroll: true });
      }}
    />
  );
}
