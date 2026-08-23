import { ProductShell } from "@/features/shell/product-shell";
import type { ShellWorkspaceOption } from "@/features/shell/shell-types";
import { WorkspaceSwitcher } from "@/features/shell/workspace-switcher";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../../styles/v2/tokens.css";
import "../../styles/v2/typography.css";
import "../../styles/v2/components.css";
import "../../styles/v2/scroll.css";

const navigation = [
  { href: "/history", label: "History" },
  { href: "/brain", label: "Brain" },
] as const;

const workspaceOptions: readonly ShellWorkspaceOption[] = [
  { id: "personal", label: "Personal" },
  { disabled: true, id: "company", label: "Company" },
];

export const metadata: Metadata = {
  description: "A focused decision workspace backed by inspectable evidence.",
  title: "Principles",
};

export default function PrimaryProductLayout({ children }: { children: ReactNode }) {
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
