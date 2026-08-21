import type { ReactNode } from "react";
import type { ShellBrand, ShellNavigationItem } from "./shell-types";
import { TopNavigation } from "./top-navigation";

export type ProductShellProps = {
  brand?: ShellBrand;
  children: ReactNode;
  mainId?: string;
  navigation: readonly ShellNavigationItem[];
  workspace?: ReactNode;
};

export function ProductShell({
  brand,
  children,
  mainId = "v2-main-content",
  navigation,
  workspace,
}: ProductShellProps) {
  return (
    <div className="v2-shell">
      <a className="v2-skip-link" href={`#${mainId}`}>
        Skip to content
      </a>
      <TopNavigation
        brand={brand}
        navigation={navigation}
        workspace={workspace}
      />
      <main className="v2-shell__main" id={mainId}>
        {children}
      </main>
    </div>
  );
}
