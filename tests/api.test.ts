import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

// Opt-in integration suite against a running local dev server, never a production event.
const origin = process.env.BORA_TEST_URL;
test(
  "API: create, share, concurrent votes, authorization, close, RSVP and bad input",
  { skip: !origin },
  async () => {
    const request = async (
      path: string,
      method = "GET",
      data?: unknown,
      secret?: string,
    ) => {
      const r = await fetch(`${origin}/api/event${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        },
        body: data ? JSON.stringify(data) : undefined,
      });
      return { status: r.status, data: await r.json() };
    };
    const day = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const input = {
      title: "Teste de integração",
      organizer: "QA",
      description: "Evento temporário",
      emoji: "🍕",
      timezone: "UTC",
      slots: [`${day}T19:00`, `${day}T20:00`],
    };
    const created = await request("", "POST", input);
    assert.equal(created.status, 201);
    assert.equal(
      created.data.local,
      true,
      "Use only a local memory server for this integration suite",
    );
    const event = created.data.event,
      path = `?id=${event.id}`;
    const shared = await request(path);
    assert.equal(shared.status, 200);
    assert.equal("ownerHash" in shared.data.event, false);
    assert.equal("ownerToken" in shared.data, false);
    const credentials = Array.from({ length: 5 }, () =>
      randomBytes(32).toString("hex"),
    );
    const results = await Promise.all(
      credentials.map((secret, i) =>
        request(
          path,
          "PATCH",
          {
            action: "vote",
            name: `Pessoa ${i}`,
            votes: Object.fromEntries(
              event.slots.map((s: { id: string }) => [s.id, "yes"]),
            ),
          },
          secret,
        ),
      ),
    );
    results.forEach((r) => assert.equal(r.status, 200));
    const updated = await request(path);
    assert.equal(updated.data.event.participants.length, 5);
    assert.equal(
      (
        await request(
          path,
          "PATCH",
          { action: "close", slotId: event.slots[0].id },
          credentials[0],
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await request(
          path,
          "PATCH",
          { action: "close", slotId: event.slots[0].id },
          created.data.ownerToken,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await request(
          path,
          "PATCH",
          {
            action: "vote",
            name: "QA",
            votes: Object.fromEntries(
              event.slots.map((s: { id: string }) => [s.id, "yes"]),
            ),
          },
          credentials[0],
        )
      ).status,
      409,
    );
    const rsvp = await request(
      path,
      "PATCH",
      { action: "rsvp", name: "Pessoa 0", rsvp: "yes" },
      credentials[0],
    );
    assert.equal(rsvp.status, 200);
    assert.equal(
      rsvp.data.event.participants.filter(
        (p: { rsvp: string }) => p.rsvp === "yes",
      ).length,
      1,
    );
    assert.equal((await request("?id=invalid")).status, 400);
    assert.equal(
      (await request("", "POST", { ...input, slots: ["2020-01-01T19:00"] }))
        .status,
      400,
    );
    assert.equal(
      (await request("", "POST", { ...input, description: "x".repeat(11000) }))
        .status,
      413,
    );
  },
);
