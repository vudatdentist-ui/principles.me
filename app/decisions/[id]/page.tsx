import { Suspense } from "react";
import { JudgmentDecisionWorkspace } from "@/components/judgment-decision";
import { LearningLoop } from "@/components/learning-loop";
import { PersonalMemory } from "@/components/personal-memory";

type Props = {
  params: Promise<{ id: string }>;
};

async function DecisionRoute({ params }: Props) {
  const { id } = await params;
  return (
    <>
      <JudgmentDecisionWorkspace decisionId={id} />
      <LearningLoop decisionId={id} />
      <PersonalMemory decisionId={id} />
    </>
  );
}

export default function Page({ params }: Props) {
  return (
    <Suspense fallback={null}>
      <DecisionRoute params={params} />
    </Suspense>
  );
}
