let deploymentPromise;
let guest = false;

async function request(path, body, method) {
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

export function isGuestMode() {
  return guest;
}

export async function api(path, body, method) {
  deploymentPromise ??= request("/api/deployment")
    .then((config) => {
      if (!["guest", "local", "cloudflare"].includes(config.mode))
        throw Error("Unknown deployment mode.");
      guest = config.mode === "guest";
    })
    .catch((error) => {
      deploymentPromise = undefined;
      throw error;
    });
  await deploymentPromise;
  if (guest) return (await import("./guest.js")).guestApi(path, body, method);
  return request(path, body, method);
}
