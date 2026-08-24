import { peopleApiError, requirePeopleSession } from "@/features/people/api";
import { projectPeopleState } from "@/features/people/projection";
import { loadPeopleState } from "@/features/people/repository";

export async function GET(request: Request): Promise<Response> {
  try {
    const context = await requirePeopleSession(request);
    const state = projectPeopleState(await loadPeopleState(context.workspace.id));
    return Response.json(state, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return peopleApiError(error, "Could not load People state.");
  }
}
