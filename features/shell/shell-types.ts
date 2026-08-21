export type ShellBrand = {
  href: string;
  label: string;
};

export type ShellNavigationItem = {
  current?: boolean;
  href: string;
  label: string;
};

export type ShellWorkspaceOption = {
  disabled?: boolean;
  id: string;
  label: string;
};

export const defaultWorkspaceOptions: readonly ShellWorkspaceOption[] = [
  { id: "personal", label: "Personal" },
  { id: "company", label: "Company" },
];
