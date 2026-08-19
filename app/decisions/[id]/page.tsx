import { Suspense } from "react";
import { DecisionDetailV1 } from "@/components/decision-detail-v1";

type Props = { params: Promise<{ id: string }> };
async function DecisionRoute({ params }: Props) { const { id } = await params; return <DecisionDetailV1 decisionId={id} />; }
export default function Page({ params }: Props) { return <Suspense fallback={null}><DecisionRoute params={params}/></Suspense>; }
