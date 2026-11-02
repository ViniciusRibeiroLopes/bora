import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  createSchema,
  rankedSlots,
  transition,
  publicEvent,
  type StoredEvent,
} from "../lib/model";

function fixture(): StoredEvent {
  return {
    id: randomUUID(),
    ownerHash: "owner",
    title: "Pizza",
    organizer: "Bia",
    description: "",
    emoji: "🍕",
    timezone: "America/Sao_Paulo",
    slots: [
      { id: randomUUID(), at: "2027-01-08T19:00" },
      { id: randomUUID(), at: "2027-01-09T20:00" },
    ],
    participants: [],
    officialSlot: null,
    createdAt: Date.now(),
    revision: 0,
  };
}
test("never publishes organizer capability hash", () => {
  assert.equal("ownerHash" in publicEvent(fixture()), false);
});
test("no votes has no favorite; highest positive total wins", () => {
  let event = fixture();
  assert.deepEqual(rankedSlots(event), []);
  const [a, b] = event.slots;
  event = transition(
    event,
    { action: "vote", name: "Gui", votes: { [a.id]: "maybe", [b.id]: "yes" } },
    "gui",
  );
  assert.equal(rankedSlots(event)[0].id, b.id);
});
test("tie breaks by maybe votes, then earliest date", () => {
  let event = fixture();
  const [a, b] = event.slots;
  event = transition(
    event,
    { action: "vote", name: "A", votes: { [a.id]: "yes", [b.id]: "yes" } },
    "a",
  );
  assert.equal(rankedSlots(event)[0].id, a.id);
  event = transition(
    event,
    { action: "vote", name: "B", votes: { [a.id]: "no", [b.id]: "maybe" } },
    "b",
  );
  assert.equal(rankedSlots(event)[0].id, b.id);
});
test("repeat participant updates existing vote; same nickname is not identity", () => {
  let event = fixture();
  const [a, b] = event.slots;
  const votes = { [a.id]: "yes" as const, [b.id]: "no" as const };
  event = transition(event, { action: "vote", name: "Gui", votes }, "one");
  event = transition(
    event,
    { action: "vote", name: "Gui", votes: { ...votes, [b.id]: "maybe" } },
    "one",
  );
  assert.equal(event.participants.length, 1);
  event = transition(event, { action: "vote", name: "Gui", votes }, "two");
  assert.equal(event.participants.length, 2);
});
test("unvoted slots default to 'no', rejects alien slots and RSVP before close", () => {
  const event = fixture();
  const [a, b] = event.slots;
  const voted = transition(
    event,
    { action: "vote", name: "A", votes: { [a.id]: "yes" } },
    "a",
  );
  assert.equal(voted.participants[0].votes[a.id], "yes");
  assert.equal(voted.participants[0].votes[b.id], "no");

  assert.throws(() =>
    transition(
      event,
      { action: "vote", name: "A", votes: { other: "yes" } },
      "a",
    ),
  );
  assert.throws(() =>
    transition(event, { action: "rsvp", name: "A", rsvp: "yes" }, "a"),
  );
});
test("only owner can close; closure is permanent and blocks votes", () => {
  const event = fixture();
  const slotId = event.slots[0].id;
  assert.throws(
    () => transition(event, { action: "close", slotId }, "visitor"),
    /organizador/,
  );
  assert.throws(
    () => transition(event, { action: "close", slotId: randomUUID() }, "owner"),
    /inválida/,
  );
  const closed = transition(event, { action: "close", slotId }, "owner");
  assert.equal(event.officialSlot, null);
  assert.throws(
    () => transition(closed, { action: "close", slotId }, "owner"),
    /definida/,
  );
  assert.throws(
    () => transition(closed, { action: "vote", name: "A", votes: {} }, "a"),
    /terminou/,
  );
  const next = transition(
    closed,
    { action: "rsvp", name: "A", rsvp: "yes" },
    "a",
  );
  assert.equal(next.participants[0].rsvp, "yes");
  assert.equal(
    transition(next, { action: "rsvp", name: "A", rsvp: "no" }, "a")
      .participants.length,
    1,
  );
});
test("validate calendar dates, duplicates, limits and IANA timezone", () => {
  const data = {
    title: "Pizza",
    organizer: "Bia",
    description: "",
    emoji: "🍕",
    timezone: "America/Sao_Paulo",
    slots: ["2027-01-08T19:00"],
  };
  assert.equal(createSchema.safeParse(data).success, true);
  for (const slots of [
    ["2027-02-30T19:00"],
    ["2027-01-08T25:00"],
    [],
    Array(13).fill(data.slots[0]),
    [...data.slots, ...data.slots],
  ])
    assert.equal(createSchema.safeParse({ ...data, slots }).success, false);
  assert.equal(
    createSchema.safeParse({ ...data, timezone: "Fake/Timezone" }).success,
    false,
  );
});
