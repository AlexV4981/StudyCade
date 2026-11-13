import test from "node:test";
import assert from "node:assert/strict";
import { mostRecentNote, hasSectionBody, readingSection } from "./reading.js";

test("mostRecentNote returns latest readable document without mutating input", () => {
  const docs = [
    { id: "old", lastReadAt: "2026-10-01T00:00:00.000Z" },
    { id: "exam", exam: true, lastReadAt: "2026-11-12T00:00:00.000Z" },
    { id: "summary", examSummary: {}, lastReadAt: "2026-11-11T00:00:00.000Z" },
    { id: "bad", lastReadAt: "invalid" },
    { id: "new", lastReadAt: "2026-11-10T00:00:00.000Z" },
  ];
  const before = structuredClone(docs);
  assert.equal(mostRecentNote(docs)?.id, "new");
  assert.deepEqual(docs, before);
});
test("mostRecentNote preserves first item for equal timestamps", () => {
  const docs = [
    { id: "a", lastReadAt: "2026-11-10T00:00:00Z" },
    { id: "b", lastReadAt: "2026-11-10T00:00:00Z" },
  ];
  assert.equal(mostRecentNote(docs)?.id, "a");
  assert.equal(mostRecentNote([]), null);
});
test("readingSection selects requested nonempty section or available fallback", () => {
  const sections = [
    { id: "a", content: "# A" },
    { id: "b", content: "# B\nDetails" },
    { id: "c", content: "Body" },
  ];
  assert.equal(hasSectionBody(sections[0]), false);
  assert.equal(hasSectionBody(sections[1]), true);
  assert.equal(readingSection(sections, "b"), "b");
  assert.equal(readingSection(sections, "a"), "b");
  assert.equal(readingSection(sections, "missing"), "b");
  assert.equal(readingSection([{ id: "only", content: "# Only" }], "missing"), "only");
  assert.equal(readingSection([], "missing"), null);
});
