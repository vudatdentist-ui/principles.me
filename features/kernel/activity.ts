import { db } from "@/lib/db/client";
import type { JsonObject } from "./json";

export async function recordActivity(input: {
  actorUserId?: string | null;
  eventType: string;
  metadata?: JsonObject;
  subjectId?: string | null;
  subjectType?: string | null;
  workspaceId: string;
}): Promise<void> {
  await db()`
    INSERT INTO activity_events (
      workspace_id,
      actor_user_id,
      event_type,
      subject_type,
      subject_id,
      metadata
    ) VALUES (
      ${input.workspaceId}::uuid,
      ${input.actorUserId ?? null}::uuid,
      ${input.eventType},
      ${input.subjectType ?? null},
      ${input.subjectId ?? null}::uuid,
      ${db().json(input.metadata ?? {})}
    )
  `;
}
