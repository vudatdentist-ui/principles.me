import { z } from "zod";
import {
  organizationApiError,
  requireOrganizationSession,
} from "@/features/organization/api";
import {
  createOrganizationEvolutionGoal,
  designOrganizationChange,
  diagnoseOrganizationProblem,
  loadOrganizationEvolutionState,
  recordOrganizationEvolutionIssue,
  recordOrganizationOutcome,
  reflectOnOrganizationOutcome,
  saveOrganizationPrinciple,
  updateOrganizationAction,
} from "@/features/organization/evolution-repository";

const handleSchema = z.string().regex(/^org_[a-z0-9]{12,32}$/);
const text = z.string().trim().min(2).max(4000);
const optionalText = z.string().trim().max(4000).optional();

const mutationSchema = z.discriminatedUnion("action", [
  z.object({
    acceptedTradeoffs: optionalText,
    action: z.literal("createGoal"),
    desiredState: text,
    measures: optionalText,
    nonNegotiables: optionalText,
    organizationHandle: handleSchema,
    successConditions: text,
    whyItMatters: text,
  }),
  z.object({
    action: z.literal("recordIssue"),
    goalId: z.string().uuid(),
    observedReality: text,
    organizationHandle: handleSchema,
    tension: text,
    title: z.string().trim().min(2).max(180),
  }),
  z.object({
    action: z.literal("diagnose"),
    alternativeHypotheses: optionalText,
    contradictingEvidence: optionalText,
    organizationHandle: handleSchema,
    problemId: z.string().uuid(),
    proximateCause: optionalText,
    rootCauseHypothesis: text,
    supportingEvidence: optionalText,
    symptom: text,
    uncertainty: optionalText,
  }),
  z.object({
    action: z.literal("design"),
    actions: z.array(text).min(1).max(5),
    assignedToEmail: z.string().trim().email().max(320),
    diagnosisId: z.string().uuid(),
    expectedResult: text,
    machineChange: text,
    organizationHandle: handleSchema,
    problemId: z.string().uuid(),
    rationale: text,
    successSignal: text,
  }),
  z.object({
    action: z.literal("setActionStatus"),
    actionId: z.string().uuid(),
    designId: z.string().uuid(),
    organizationHandle: handleSchema,
    status: z.enum(["completed", "cancelled"]),
  }),
  z.object({
    action: z.literal("recordOutcome"),
    actualResult: text,
    comparison: z.enum(["improved", "mixed", "worse", "unclear"]),
    designId: z.string().uuid(),
    organizationHandle: handleSchema,
  }),
  z.object({
    action: z.literal("reflect"),
    designId: z.string().uuid(),
    expected: optionalText,
    happened: text,
    learning: text,
    organizationHandle: handleSchema,
    recurring: z.boolean().optional(),
    surprise: optionalText,
  }),
  z.object({
    action: z.literal("savePrinciple"),
    organizationHandle: handleSchema,
    principleId: z.string().uuid().optional(),
    rationale: optionalText,
    reflectionId: z.string().uuid(),
    rule: text,
    trigger: text,
  }),
]);

export async function GET(request: Request): Promise<Response> {
  try {
    const context = await requireOrganizationSession(request);
    const handle = handleSchema.safeParse(new URL(request.url).searchParams.get("organization"));
    if (!handle.success) {
      return Response.json({ error: "Organization is required." }, { status: 400 });
    }
    return Response.json(
      await loadOrganizationEvolutionState(context.user.id, handle.data),
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return organizationApiError(error, "Could not load organization evolution state.");
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requireOrganizationSession(request, true);
    const parsed = mutationSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Evolution details are incomplete." }, { status: 400 });
    }
    const data = parsed.data;
    switch (data.action) {
      case "createGoal":
        return Response.json(
          await createOrganizationEvolutionGoal({ ...data, handle: data.organizationHandle, userId: context.user.id }),
          { status: 201 }
        );
      case "recordIssue":
        return Response.json(
          await recordOrganizationEvolutionIssue({ ...data, handle: data.organizationHandle, userId: context.user.id }),
          { status: 201 }
        );
      case "diagnose":
        return Response.json(
          await diagnoseOrganizationProblem({ ...data, handle: data.organizationHandle, userId: context.user.id }),
          { status: 201 }
        );
      case "design":
        return Response.json(
          await designOrganizationChange({ ...data, handle: data.organizationHandle, userId: context.user.id }),
          { status: 201 }
        );
      case "setActionStatus":
        return Response.json(
          await updateOrganizationAction({ ...data, handle: data.organizationHandle, userId: context.user.id })
        );
      case "recordOutcome":
        return Response.json(
          await recordOrganizationOutcome({ ...data, handle: data.organizationHandle, userId: context.user.id }),
          { status: 201 }
        );
      case "reflect":
        return Response.json(
          await reflectOnOrganizationOutcome({ ...data, handle: data.organizationHandle, userId: context.user.id }),
          { status: 201 }
        );
      case "savePrinciple":
        return Response.json(
          await saveOrganizationPrinciple({ ...data, handle: data.organizationHandle, userId: context.user.id }),
          { status: 201 }
        );
    }
  } catch (error) {
    return organizationApiError(error, "Could not update organization evolution state.");
  }
}
