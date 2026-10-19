export function mostRecentNote(documents = []) {
  return documents
    .filter(
      (d) =>
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
