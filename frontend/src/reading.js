export function mostRecentNote(documents = []) {
  let latest = null;
  let latestTimestamp = -Infinity;
  for (const document of documents) {
    if (document.examSummary || document.exam ||
        typeof document.lastReadAt !== "string") continue;
    const timestamp = Date.parse(document.lastReadAt);
    if (Number.isFinite(timestamp) && timestamp > latestTimestamp) {
      latest = document;
      latestTimestamp = timestamp;
    }
  }
  return latest;
}

export function hasSectionBody(section) {
  return !!String(section?.content || "")
    .replace(/^\s*#{1,6}[^\n]*(?:\n|$)/, "")
    .trim();
}
export function readingSection(sections = [], requested) {
  const start = sections.findIndex((section) => section.id === requested);
  if (start >= 0 && hasSectionBody(sections[start])) return sections[start].id;
  return (
    sections.slice(Math.max(0, start)).find(hasSectionBody)?.id ||
    sections.find(hasSectionBody)?.id ||
    sections[0]?.id ||
    null
  );
}
