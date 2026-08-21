import { V2Placeholder } from "@/features/shared/v2-placeholder";

export default function V2BrainPage() {
  return (
    <V2Placeholder
      description="The existing Three.js Brain will move behind this optional route. The Home route must remain free of the renderer and its bundle cost."
      eyebrow="Optional visual layer"
      links={[{ href: "/v2", label: "Back to ask" }]}
      title="Brain is a view, not the product shell."
    />
  );
}
