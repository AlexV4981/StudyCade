let deploymentPromise;
let config;
let cloud;

export async function request(path, body, method) {
  const r = await fetch(path, {
    credentials: "same-origin",
    method: method || (body ? "POST" : "GET"),
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.headers.get("content-type")?.includes("application/json"))
    throw Error("Your session may have expired. Refresh this page and retry.");
  let data;
  try {
    data = await r.json();
  } catch {
    throw Error("The server returned an unreadable response.");
  }
  if (!r.ok) throw Error(data.error || `Request failed (${r.status}).`);
  return data;
}
export async function getDeploymentConfig() {
  deploymentPromise ??= request("/api/deployment")
    .then(async (value) => {
      if (!["guest", "local", "cloudflare"].includes(value.mode))
        throw Error("Unknown deployment mode.");
      config = value;
      if (value.mode === "guest" && value.cloudAvailable) {
        const session = await request("/api/cloud/session");
        if (session.user)
          cloud = (await import("./cloud.js")).createCloudApi({
            user: session.user,
          });
      }
      return value;
    })
    .catch((error) => {
      deploymentPromise = undefined;
      throw error;
    });
  return deploymentPromise;
}
export function isGuestMode() {
  return config?.mode === "guest" && !cloud;
}
export function isCloudMode() {
  return !!cloud;
}
export async function reloadCloudWorkspace() {
  await getDeploymentConfig();
  if (!cloud) throw Error("Sign in to reload your cloud workspace.");
  return cloud.reload();
}
export async function clearCloudCache() {
  if (cloud) await cloud.clearCache();
}
export async function api(path, body, method) {
  // Auth/session routes never enter the guest engine or touch IndexedDB.
  if (path === "/api/cloud/workspace")
    throw Error("Use the signed-in workspace storage adapter for cloud state.");
  if (path.startsWith("/api/cloud/")) return request(path, body, method);
  await getDeploymentConfig();
  if (cloud) return cloud(path, body, method);
  if (config.mode === "guest")
    return (await import("./guest.js")).guestApi(path, body, method);
  return request(path, body, method);
}
