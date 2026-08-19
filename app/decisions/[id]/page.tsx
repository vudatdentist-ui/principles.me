import { Suspense } from "react";
import { DecisionWorkspace } from "@/components/decision-workspace";

type Props = {
  params: Promise<{ id: string }>;
};

async function DecisionRoute({ params }: Props) {
  const { id } = await params;
  return <DecisionWorkspace decisionId={id} initialView="decision" />;
}

export default function Page({ params }: Props) {
  return (
    <Suspense fallback={null}>
      <DecisionRoute params={params} />
    </Suspense>
  );
}
