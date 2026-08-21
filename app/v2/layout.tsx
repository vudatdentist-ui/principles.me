import { ProductShell } from "@/features/shell/product-shell";
import type { ShellWorkspaceOption } from "@/features/shell/shell-types";
import { WorkspaceSwitcher } from "@/features/shell/workspace-switcher";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../../styles/v2/tokens.css";
import "../../styles/v2/typography.css";
import "../../styles/v2/components.css";

const navigation = [
  { href: "/v2/history", label: "History" },
  { href: "/v2/brain", label: "Brain" },
] as const;

const workspaceOptions: readonly ShellWorkspaceOption[] = [
  { id: "personal", label: "Personal" },
  { disabled: true, id: "company", label: "Company" },
];

export const metadata: Metadata = {
  description: "A minimal decision workspace backed by a typed evidence system.",
  title: "Principles v2",
};

export default function V2Layout({ children }: { children: ReactNode }) {
  return (
    <ProductShell
      navigation={navigation}
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
