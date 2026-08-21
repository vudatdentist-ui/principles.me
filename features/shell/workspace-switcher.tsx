"use client";

import {
  useCallback,
  type ChangeEvent,
  type SelectHTMLAttributes,
} from "react";
import {
  defaultWorkspaceOptions,
  type ShellWorkspaceOption,
} from "./shell-types";

export type WorkspaceSwitcherProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "children" | "onChange"
> & {
  label?: string;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  onValueChange?: (value: string) => void;
  options?: readonly ShellWorkspaceOption[];
};

export function WorkspaceSwitcher({
  className,
  label = "Workspace",
  onChange,
  onValueChange,
  options = defaultWorkspaceOptions,
  ...selectProps
}: WorkspaceSwitcherProps) {
  const classes = ["v2-workspace-switcher", className]
    .filter(Boolean)
    .join(" ");

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      onChange?.(event);
      onValueChange?.(event.currentTarget.value);
    },
    [onChange, onValueChange]
  );

  return (
    <label className={classes}>
      <span className="v2-visually-hidden">{label}</span>
      <select
        aria-label={label}
        className="v2-workspace-switcher__select"
        onChange={handleChange}
        {...selectProps}
      >
        {options.map((option) => (
          <option disabled={option.disabled} key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
