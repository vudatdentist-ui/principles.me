import { z } from "zod";

const existing = { id: z.uuid(), revision: z.number().int().min(0).max(5) };
export const command = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("create"),
    handle: z.string().regex(/^org_[a-z0-9]{12,32}$/),
    partner: z.email(),
    scenario: z.string().trim().min(1).max(1200),
  }),
  z.strictObject({
    kind: z.literal("reply"),
    ...existing,
    text: z.string().trim().min(1).max(2000),
  }),
  z.strictObject({ kind: z.literal("switch"), ...existing }),
]);
export type Command = z.infer<typeof command>;
export type Room = {
  id: string;
  organization: string;
  scenario: string;
  other: string;
  first: boolean;
  revision: number;
  replies: string[];
};
export type Organization = { handle: string; name: string; partners: string[] };
export function isMyTurn(revision: number, first: boolean) {
  return first
    ? revision === 0 || revision === 3
    : revision === 1 || revision === 4;
}
