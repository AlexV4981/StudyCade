// Browser-only helpers. Do not put cloud tokens or study content in localStorage.
export function stored(key, fallback) {
  try {
    return JSON.parse(sessionStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function save(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
export function clearDeviceSessions() {
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of Object.keys(storage))
      if (key.startsWith("studycade:")) storage.removeItem(key);
  }
}
export function downloadJson(value, name) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
