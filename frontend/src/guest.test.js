import test from "node:test";
import assert from "node:assert/strict";
import { createGuestApi } from "./guest.js";

function memoryStorage() {
  let state = null;
  return {
    get: async () => structuredClone(state),
    set: async (value) => { state = structuredClone(value); },
    clear: async () => { state = null; },
    snapshot: () => structuredClone(state),
  };
}

test("guest bootstrap initializes isolated local workspace without using preview service", async () => {
  const storage = memoryStorage();
  let previews = 0;
  const api = createGuestApi({ storage, preview: async () => { previews++; return {}; } });
  const initial = await api("/api/bootstrap");
  assert.equal(initial.user.role, "guest");
  assert.equal(initial.sets.length, 1);
  assert.equal(initial.sets[0].id, "welcome");
  assert.equal(previews, 0);
  assert.equal(storage.snapshot().sets.length, 1);
  await assert.rejects(() => api("/api/admin/users"), /unavailable/i);
  assert.equal(previews, 0);
});

test("guest deck edits persist without changing other storage and builtin deck remains protected", async () => {
  const left = memoryStorage();
  const right = memoryStorage();
  const api = createGuestApi({ storage: left });
  const other = createGuestApi({ storage: right });
  const created = await api("/api/sets", {
    title: "New deck", subject: "general",
    cards: [{ term: "Term", definition: "Definition" }],
  });
  assert.ok(created.id);
  const loaded = await api("/api/sets/" + encodeURIComponent(created.id));
  assert.equal(loaded.cards[0].term, "Term");
  assert.equal((await other("/api/bootstrap")).sets.length, 1);
  await assert.rejects(() => api("/api/sets/welcome", undefined, "DELETE"), /read-only/);
  await api("/api/sets/" + encodeURIComponent(created.id), undefined, "DELETE");
  assert.equal((await api("/api/bootstrap")).sets.length, 1);
  assert.equal((await other("/api/bootstrap")).sets.length, 1);
});

test("guest attempts replay idempotently and conflicting replay is rejected", async () => {
  const api = createGuestApi({ storage: memoryStorage() });
  const created = await api("/api/sets", {
    title: "Quiz deck", cards: [{ term: "First", definition: "One" }],
  });
  const deck = await api("/api/sets/" + encodeURIComponent(created.id));
  const event = { setId: created.id, cardId: deck.cards[0].id, correct: true, eventId: "event-1" };
  assert.equal((await api("/api/attempts", event)).recorded, true);
  assert.equal((await api("/api/attempts", event)).duplicate, true);
  await assert.rejects(() => api("/api/attempts", { ...event, correct: false }), /already used/);
  const result = await api("/api/bootstrap");
  const row = result.progress.find((entry) => entry.setId === created.id);
  assert.deepEqual({right: row.right, wrong: row.wrong}, {right: 1, wrong: 0});
});

test("guest import requires an explicit fresh preview", async () => {
  const storage = memoryStorage();
  const requests = [];
  const api = createGuestApi({
    storage,
    preview: async (body) => {
      requests.push(body);
      return { title: "Synthetic notes", subject: "general", sections: [], cards: [], warnings: [], hash: "test" };
    },
  });
  const body = { name: "notes.md", content: "Synthetic disposable text", folder: "My notes", mode: "notes", visibility: "private" };
  await assert.rejects(() => api("/api/import/commit", body), /preview/i);
  assert.equal(requests.length, 0);
  await api("/api/import/preview", { name: body.name, content: body.content });
  assert.equal(requests.length, 1);
  const saved = await api("/api/import/commit", body);
  assert.ok(saved.documentId);
  const bootstrap = await api("/api/bootstrap");
  assert.equal(bootstrap.documents.length, 1);
  assert.equal(requests.length, 1);
});
