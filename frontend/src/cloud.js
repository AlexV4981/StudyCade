import { createGuestApi } from "./guest.js";

const clone = (value) =>
  value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const conflictMessage =
  "Your cloud workspace changed on another device. Your changes were not saved. Copy any unsaved edits, then reload the cloud workspace before trying again.";

/** Cookie-authenticated first-party storage. No token, browser database or offline fallback. */
export function createCloudStorage({
  userId,
  fetcher = (...args) => fetch(...args),
} = {}) {
  if (typeof userId !== "string" || !userId)
    throw Error("Cloud account identity is required.");
  const accountId = userId;
  let state,
    version,
    etag,
    generation = 0,
    loaded = false,
    conflicted = false;
  async function decode(response) {
    if (!response.headers.get("content-type")?.includes("application/json"))
      throw Error(
        "Cloud storage returned an unreadable response. Your changes were not saved.",
      );
    const data = await response.json();
    if (!response.ok) {
      const error = Error(
        response.status === 401
          ? "Your cloud session has expired. Sign in again before saving; your changes were not saved."
          : data.error ||
              "Cloud storage is unavailable. Your changes were not saved.",
      );
      error.status = response.status;
      throw error;
    }
    return data;
  }
  async function read(explicit = false) {
    const operation = generation;
    if (loaded && !explicit) return clone(state);
    let response;
    try {
      response = await fetcher("/api/cloud/workspace", {
        credentials: "same-origin",
        headers: {
          "X-StudyCade-Account": accountId,
          ...(loaded && etag ? { "If-None-Match": etag } : {}),
        },
      });
    } catch {
      throw Error(
        "Could not reach cloud storage. Your work has not been saved. Reconnect and retry; there is no automatic local fallback.",
      );
    }
    if (operation !== generation)
      throw Error("The cloud session changed. This response was discarded.");
    if (response.status === 304) {
      if (!loaded)
        throw Error(
          "Cloud storage returned an invalid cache response. Reload the page.",
        );
      if (explicit) conflicted = false;
      return clone(state);
    }
    const data = await decode(response);
    if (operation !== generation)
      throw Error("The cloud session changed. This response was discarded.");
    if (
      !Number.isSafeInteger(data.version) ||
      data.version < 0 ||
      !(
        data.state === null ||
        (data.state &&
          typeof data.state === "object" &&
          !Array.isArray(data.state))
      )
    )
      throw Error("Cloud workspace data is invalid. No changes were saved.");
    state = data.state === null ? undefined : clone(data.state);
    version = data.version;
    etag = response.headers.get("etag") || undefined;
    loaded = true;
    if (explicit) conflicted = false;
    return clone(state);
  }
  return {
    get: () => read(),
    async set(next) {
      const operation = generation;
      if (conflicted) throw Error(conflictMessage);
      if (!loaded) await read();
      let response;
      try {
        response = await fetcher("/api/cloud/workspace", {
          method: "PUT",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "X-StudyCade-Account": accountId,
          },
          body: JSON.stringify({ state: next, version }),
        });
      } catch {
        // The server may have accepted a response that the connection lost. Never replay blindly.
        conflicted = true;
        throw Error(
          "The cloud save could not be confirmed. Your changes may not have reached the server. Copy unsaved edits and reload the cloud workspace before retrying.",
        );
      }
      if (operation !== generation)
        throw Error(
          "The cloud session changed. This save response was discarded.",
        );
      if (response.status === 409) {
        conflicted = true;
        throw Error(conflictMessage);
      }
      const data = await decode(response);
      if (operation !== generation)
        throw Error(
          "The cloud session changed. This save response was discarded.",
        );
      if (!Number.isSafeInteger(data.version) || data.version <= version) {
        conflicted = true;
        throw Error(
          "The cloud save returned an invalid version. Reload the workspace before retrying.",
        );
      }
      state = clone(next);
      version = data.version;
      etag = response.headers.get("etag") || undefined;
      loaded = true;
    },
    // Clearing a device cache never deletes or replaces a cloud workspace.
    async clear() {
      generation++;
      etag = undefined;
      state = undefined;
      version = undefined;
      loaded = false;
      conflicted = false;
    },
    reload: () => read(true),
  };
}

export function createCloudApi({ user, fetcher, preview } = {}) {
  if (!user || user.role !== "cloud" || typeof user.id !== "string")
    throw Error("A signed-in cloud session is required.");
  const storage = createCloudStorage({ userId: user.id, fetcher });
  const engine = createGuestApi({ storage, ...(preview ? { preview } : {}) });
  let generation = 0,
    queue = Promise.resolve();
  const run = async (path, body, method, operation) => {
    if (operation !== generation)
      throw Error(
        "The cloud session changed. This pending operation was discarded.",
      );
    const data = await engine(path, body, method);
    if (operation !== generation)
      throw Error("The cloud session changed. This response was discarded.");
    if (path === "/api/bootstrap") return { ...data, user: clone(user) };
    if (path === "/api/backup" || path === "/api/export")
      return { ...data, mode: "cloud" };
    if (path === "/api/tutor")
      return {
        ...data,
        method: "private-cloud-source-retrieval",
        warnings: (data.warnings || []).map((w) =>
          w.replace("Guest mode", "This source tutor"),
        ),
      };
    if (path === "/api/study-files" && (!method || method === "GET") && !body)
      return { ...data, account: user.email };
    return data;
  };
  const api = (path, body, method) => {
    const operation = generation;
    const next = queue.then(() => run(path, body, method, operation));
    queue = next.catch(() => {});
    return next;
  };
  api.accountId = user.id;
  api.reload = () => {
    const next = queue.then(() => storage.reload());
    queue = next.catch(() => {});
    return next;
  };
  api.clearCache = () => {
    generation++;
    return storage.clear();
  };
  return api;
}
