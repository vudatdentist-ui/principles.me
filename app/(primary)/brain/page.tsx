import { V2Placeholder } from "@/features/shared/v2-placeholder";

export default function BrainPage() {
  return (
    <V2Placeholder
      description="The existing Three.js Brain remains an optional route. The Home route stays free of the renderer and its bundle cost."
      eyebrow="Optional visual layer"
      links={[{ href: "/", label: "Back to ask" }]}
      title="Brain is a view, not the product shell."
    />
  );
}
