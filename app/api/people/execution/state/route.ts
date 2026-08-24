import { peopleApiError, requirePeopleSession } from "@/features/people/api";
import { projectExecutionState } from "@/features/people/execution-projection";
import { loadExecutionState } from "@/features/people/execution-repository";

export async function GET(request: Request): Promise<Response> {
  try {
    const context = await requirePeopleSession(request);
    const state = projectExecutionState(await loadExecutionState(context.workspace.id));
    return Response.json(state, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return peopleApiError(error, "Could not load execution state.");
  }
}
