import { V2Placeholder } from "@/features/shared/v2-placeholder";

export default function V2HomePage() {
  return (
    <V2Placeholder
      description="This route is the isolated product surface for the selective rewrite. The first vertical slice will connect one question to a structured Decision Brief without changing the production experience."
      eyebrow="V2 foundation"
      links={[
        { href: "/v2/decisions/example", label: "Decision route" },
        { href: "/v2/history", label: "History route" },
        { href: "/v2/brain", label: "Brain boundary" },
      ]}
      title="Bạn đang cần quyết định điều gì?"
    />
  );
}
