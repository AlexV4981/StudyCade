export function mostRecentNote(documents = []) {
  return documents
    .filter(
      (d) =>
        !d.examSummary &&
        !d.exam &&
        typeof d.lastReadAt === "string" &&
        Number.isFinite(Date.parse(d.lastReadAt)),
    )
    .reduce(
      (latest, d) =>
        !latest || Date.parse(d.lastReadAt) > Date.parse(latest.lastReadAt)
          ? d
          : latest,
      null,
    );
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
