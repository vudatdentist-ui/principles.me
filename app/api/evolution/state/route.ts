import { peopleApiError, requirePeopleSession } from "@/features/people/api";
import { loadEvolutionState } from "@/features/evolution/service";

export async function GET(request: Request): Promise<Response> {
  try {
    const context = await requirePeopleSession(request);
    const state = await loadEvolutionState(context.workspace.id);
    return Response.json(state, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return peopleApiError(error, "Could not load Evolution state.");
  }
}
