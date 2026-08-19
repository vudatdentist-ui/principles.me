import { Suspense } from "react";
import { JudgmentDecisionWorkspace } from "@/components/judgment-decision";

type Props = {
  params: Promise<{ id: string }>;
};

async function DecisionRoute({ params }: Props) {
  const { id } = await params;
  return <JudgmentDecisionWorkspace decisionId={id} />;
}

export default function Page({ params }: Props) {
  return (
    <Suspense fallback={null}>
      <DecisionRoute params={params} />
    </Suspense>
  );
}
