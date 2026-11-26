import assert from "node:assert/strict";
import test from "node:test";
import { createAccount } from "../../features/auth/repository";
import { hashPassword } from "../../features/auth/password";
import {
  createOrganization,
  addOrganizationMember,
} from "../../features/organization/repository";
import {
  applyCommand,
  practiceState,
  TurnConflict,
  Unavailable,
} from "../../features/team-practice/repository";
import { closeDatabaseForTests } from "../../lib/db/client";

test("only the paired members may take turns and switch roles", async () => {
  try {
    const passwordHash = await hashPassword("team rehearsal test password");
    const email = (name: string) => name + Date.now() + "@example.test";
    const peerEmail = email("peer");
    const [owner, peer, other] = await Promise.all(
      [email("owner"), peerEmail, email("other")].map((address) =>
        createAccount({ email: address, passwordHash }),
      ),
    );
    const state = await createOrganization({
      userId: owner.userId,
      name: "Studio team",
      purpose: "Practise decisions together.",
    });
    const handle = state.organizations[0].handle;
    await addOrganizationMember({
      email: peerEmail,
      handle,
      userId: owner.userId,
    });
    const id = await applyCommand(owner.userId, {
      kind: "create",
      handle,
      partner: peerEmail,
      scenario: "A deadline changes.",
    });
    const reply = (user: string, revision: number) =>
      applyCommand(user, {
        kind: "reply",
        id,
        revision,
        text: "My proposal for the team",
      });
    await assert.rejects(reply(other.userId, 0), Unavailable);
    assert.equal((await practiceState(other.userId)).rooms.length, 0);
    await assert.rejects(reply(peer.userId, 0), TurnConflict);
    await reply(owner.userId, 0);
    await reply(peer.userId, 1);
    await applyCommand(peer.userId, { kind: "switch", id, revision: 2 });
    await reply(owner.userId, 3);
    await reply(peer.userId, 4);
    assert.equal((await practiceState(owner.userId)).rooms[0].revision, 5);
  } finally {
    await closeDatabaseForTests();
  }
});
