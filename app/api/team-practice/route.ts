import {
  organizationApiError,
  requireOrganizationSession,
} from "@/features/organization/api";
import { command } from "@/features/team-practice/contracts";
import {
  applyCommand,
  Unavailable,
  TurnConflict,
} from "@/features/team-practice/repository";

export async function POST(request: Request) {
  try {
    const session = await requireOrganizationSession(request, true);
    const parsed = command.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return Response.json({ error: "invalid_input" }, { status: 400 });
    const id = await applyCommand(session.user.id, parsed.data);
    return Response.json(
      { id },
      { status: parsed.data.kind === "create" ? 201 : 200 },
    );
  } catch (error) {
    if (error instanceof Unavailable)
      return Response.json({ error: "unavailable" }, { status: 404 });
    if (error instanceof TurnConflict)
      return Response.json({ error: "turn_conflict" }, { status: 409 });
    return organizationApiError(error);
  }
}
