import test from "node:test";
import assert from "node:assert/strict";
import { createCloudApi, createCloudStorage } from "./cloud.js";

const response = (status, data, etag) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get(name) {
    if (name.toLowerCase() === "content-type") return "application/json";
    if (name.toLowerCase() === "etag") return etag || null;
    return null;
  } },
  json: async () => data,
});

test("cloud reads and saves use owner-scoped same-origin requests with explicit versions", async () => {
  const calls = [];
  const storage = createCloudStorage({
    userId: "account-one",
    fetcher: async (path, options) => {
      calls.push({ path, options });
      return options.method === "PUT"
        ? response(200, { version: 1 }, '"v1"')
        : response(200, { state: null, version: 0 }, '"v0"');
    },
  });
  assert.equal(await storage.get(), undefined);
  const workspace = { version: 1, sets: [] };
  await storage.set(workspace);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.credentials, "same-origin");
  assert.equal(calls[0].options.headers["X-StudyCade-Account"], "account-one");
  assert.equal(calls[1].options.method, "PUT");
  assert.deepEqual(JSON.parse(calls[1].options.body), { state: workspace, version: 0 });
  const loaded = await storage.get();
  assert.deepEqual(loaded, workspace);
  loaded.sets.push({ id: "unexpected" });
  assert.deepEqual(await storage.get(), workspace);
  assert.equal(calls.length, 2);
});

test("cloud conflict never automatically replays a stale write", async () => {
  let puts = 0;
  const storage = createCloudStorage({
    userId: "owner",
    fetcher: async (_path, options) => {
      if (options.method === "PUT") {
        puts++;
        return response(409, { error: "version conflict" });
      }
      return response(200, { version: 0, state: null });
    },
  });
  await storage.get();
  await assert.rejects(() => storage.set({ version: 1 }), /changed on another device/);
  await assert.rejects(() => storage.set({ version: 1 }), /changed on another device/);
  assert.equal(puts, 1);
  await storage.reload();
  await assert.rejects(() => storage.set({ version: 1 }), /changed on another device/);
  assert.equal(puts, 2);
});

test("cleared cloud session rejects a response that arrives afterward", async () => {
  let complete;
  const storage = createCloudStorage({
    userId: "owner",
    fetcher: () => new Promise((resolve) => { complete = resolve; }),
  });
  const request = storage.get();
  await storage.clear();
  complete(response(200, { state: null, version: 0 }));
  await assert.rejects(request, /session changed/i);
});

test("signed-in cloud API bootstraps against remote state without guest database access", async () => {
  let reads = 0;
  const api = createCloudApi({
    user: { id: "owner-one", role: "cloud", email: "owner@studycade.local" },
    fetcher: async (_path, options) => {
      assert.equal(options.headers["X-StudyCade-Account"], "owner-one");
      reads++;
      return response(200, { state: null, version: 0 });
    },
  });
  const data = await api("/api/bootstrap");
  assert.equal(data.user.role, "cloud");
  assert.equal(data.sets.length, 1);
  assert.equal(reads, 1);
  assert.rejects(() => api("/api/admin/users"), /unavailable/i);
});
