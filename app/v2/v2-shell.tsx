"use client";

import { ProductShell } from "@/features/shell/product-shell";
import type {
  ShellNavigationItem,
  ShellWorkspaceOption,
} from "@/features/shell/shell-types";
import { WorkspaceSwitcher } from "@/features/shell/workspace-switcher";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigation = [
  { href: "/v2/history", label: "History" },
  { href: "/v2/brain", label: "Brain" },
] as const;

const workspaceOptions: readonly ShellWorkspaceOption[] = [
  { id: "personal", label: "Personal" },
  { disabled: true, id: "company", label: "Company" },
];

function navigationForPath(pathname: string): ShellNavigationItem[] {
  return navigation.map((item) => ({
    ...item,
    current: pathname === item.href || pathname.startsWith(`${item.href}/`),
  }));
}

export function V2Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <ProductShell
      navigation={navigationForPath(pathname)}
      workspace={
        <WorkspaceSwitcher
          defaultValue="personal"
          label="Workspace"
          options={workspaceOptions}
        />
      }
    >
      {children}
    </ProductShell>
  );
}
