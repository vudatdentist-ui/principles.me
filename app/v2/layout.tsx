import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../../styles/v2/tokens.css";
import "../../styles/v2/typography.css";
import "../../styles/v2/components.css";
import { V2Shell } from "./v2-shell";

export const metadata: Metadata = {
  description: "A minimal decision workspace backed by a typed evidence system.",
  title: "Principles v2",
};

export default function V2Layout({ children }: { children: ReactNode }) {
  return <V2Shell>{children}</V2Shell>;
}
