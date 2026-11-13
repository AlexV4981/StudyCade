import test from "node:test";
import assert from "node:assert/strict";
import { stored, save, clearDeviceSessions } from "./browser.js";

function fakeStorage(seed = {}) {
  const values = { ...seed };
  return {
    getItem(key) { return Object.hasOwn(values, key) ? values[key] : null; },
    setItem(key, value) { values[key] = String(value); },
    removeItem(key) { delete values[key]; },
    get values() { return values; },
    ...seed,
  };
}

test("session values round trip without changing unrelated browser storage", () => {
  const old = globalThis.sessionStorage;
  const session = fakeStorage();
  globalThis.sessionStorage = session;
  try {
    save("studycade:guest", { deck: "a", mode: "paper" });
    assert.deepEqual(stored("studycade:guest", {}), { deck: "a", mode: "paper" });
    assert.deepEqual(stored("missing", { fallback: true }), { fallback: true });
    session.setItem("bad", "{not-json");
    assert.equal(stored("bad", "fallback"), "fallback");
  } finally {
    if (old === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = old;
  }
});
test("device cache cleanup removes only StudyCade-prefixed keys", () => {
  const previousLocal = globalThis.localStorage;
  const previousSession = globalThis.sessionStorage;
  const local = fakeStorage({ "studycade:old": "1", unrelated: "keep" });
  const session = fakeStorage({ "studycade:new": "2", "another-app": "keep" });
  globalThis.localStorage = local;
  globalThis.sessionStorage = session;
  try {
    clearDeviceSessions();
    assert.equal(local.values["studycade:old"], undefined);
    assert.equal(local.values.unrelated, "keep");
    assert.equal(session.values["studycade:new"], undefined);
    assert.equal(session.values["another-app"], "keep");
  } finally {
    if (previousLocal === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousLocal;
    if (previousSession === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = previousSession;
  }
});
