import Link from "next/link";
import type { ReactNode } from "react";
import type { ShellBrand, ShellNavigationItem } from "./shell-types";

const defaultBrand: ShellBrand = {
  href: "/",
  label: "Principles",
};

export type TopNavigationProps = {
  brand?: ShellBrand;
  navigation: readonly ShellNavigationItem[];
  workspace?: ReactNode;
};

export function TopNavigation({
  brand = defaultBrand,
  navigation,
  workspace,
}: TopNavigationProps) {
  return (
    <header className="v2-top-navigation">
      <div className="v2-top-navigation__inner">
        <Link className="v2-top-navigation__brand" href={brand.href}>
          {brand.label}
        </Link>
        <div className="v2-top-navigation__controls">
          {workspace ? (
            <div className="v2-top-navigation__workspace">{workspace}</div>
          ) : null}
          {navigation.length ? (
            <nav aria-label="Primary navigation">
              <ul className="v2-top-navigation__links">
                {navigation.map((item) => (
                  <li key={`${item.href}:${item.label}`}>
                    <Link
                      aria-current={item.current ? "page" : undefined}
                      className="v2-top-navigation__link"
                      href={item.href}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </div>
    </header>
  );
}
