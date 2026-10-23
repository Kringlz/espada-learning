import test from "node:test";
import assert from "node:assert/strict";
import { LearningOutbox } from "../src/services/outbox";
import { memorySessionStore } from "../src/services/sessionPersistence";
import { createSeed } from "../src/data/seed";
import { Command } from "../src/core/types";

test("queued study work retains its owner across logout and cannot be sent as another account", async () => {
  const storage = memorySessionStore();
  let signedIn = "alice",
    online = false;
  const outbox = new LearningOutbox(storage, async (_command, owner) => {
    assert.equal(owner, "alice");
    if (owner !== signedIn || !online)
      throw Error("Cannot send for this owner");
    return createSeed();
  });
  const command = {
    type: "saveVideoPosition",
    videoId: "lesson",
    position: 10,
  } as unknown as Command;
  await assert.rejects(outbox.submit("alice", command));
  signedIn = "bob";
  online = true;
  await assert.rejects(outbox.retry("alice"));
  assert.equal((await outbox.read("alice")).length, 1);
  assert.deepEqual(await outbox.read("bob"), []);
  signedIn = "alice";
  await outbox.retry("alice");
  assert.deepEqual(await outbox.read("alice"), []);
});
