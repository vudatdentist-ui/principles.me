import { z } from "zod";
import {
  consumePeopleAiQuota,
  peopleApiError,
  quotaResponse,
  requirePeopleMutation,
} from "@/features/people/api";
import {
  discoverGoalNext,
  fallbackGoalDiscovery,
  shouldUseGoalDiscoveryProvider,
} from "@/features/people/ai";

const schema = z.object({
  acceptedTradeoffs: z.string().max(1200),
  desiredState: z.string().max(1600),
  measures: z.string().max(1200),
  nonNegotiables: z.string().max(1200),
  successConditions: z.string().max(1600),
  whyItMatters: z.string().max(1600),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requirePeopleMutation(request);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "Invalid Goal draft." }, { status: 400 });
    }

    const deterministic = fallbackGoalDiscovery(parsed.data);
    if (!shouldUseGoalDiscoveryProvider(parsed.data)) {
      return Response.json(deterministic, {
        headers: { "cache-control": "no-store" },
      });
    }

    const quota = await consumePeopleAiQuota(context, "people.goal_discovery");
    if (!quota.allowed) {
      return quotaResponse(quota.retryAfterSeconds);
    }
    const result = await discoverGoalNext(parsed.data, request.signal);
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return peopleApiError(error, "Goal Discovery failed.");
  }
}
