import test from "node:test";
import assert from "node:assert/strict";
import { buildStudyPrompt, MARKDOWN_PROMPT } from "./prompts.js";
import { EXAM_PROMPT } from "./examPrompt.js";

test("default StudyCade guide supports verified images without hallucinated URLs", () => {
  const { text, warnings } = buildStudyPrompt();
  assert.equal(warnings.length, 0);
  assert.equal(MARKDOWN_PROMPT, text);
  assert.match(text, /OPTIONAL WEB IMAGES/);
  assert.match(text, /direct public HTTPS URL/);
  assert.match(text, /source page/);
  assert.match(text, /Do not substitute a web search result/);
  assert.match(text, /never fabricate or guess/);
  assert.match(text, /private study notes/);
  assert.match(text, /prefix the entire image line with >/);
  assert.match(text, /every question must be solvable/i);
  assert.doesNotMatch(text, /remote image embeds and executable/i);
  assert.match(text, /----- BEGIN SOURCE DATA -----/);
});

test("opt-out removes external image discovery instructions while retaining source material", () => {
  const source = "## [BIO] Cell\n![Original label](/subjects/biology.svg)";
  const { text } = buildStudyPrompt({
    documents: [{ id: "doc-1", title: "Demo", content: source, subject: "biology" }],
    includeImages: false,
  });
  assert.match(text, /Do not search the web for illustrations/);
  assert.doesNotMatch(text, /OPTIONAL WEB IMAGES/);
  assert.match(text, /Preserve image references already in the supplied source/);
  assert.ok(text.includes(source));
  assert.equal((text.match(/----- BEGIN SOURCE DATA -----/g) || []).length, 1);
  assert.equal((text.match(/----- END SOURCE DATA -----/g) || []).length, 1);
});

test("image policy is subordinate to the real study content and all 12 format rules", () => {
  const { text } = buildStudyPrompt({ goal: "Practice synthetic microscopy notes.", kind: "practice" });
  for (let i = 1; i <= 12; i++) {
    assert.match(text, new RegExp(`^\\s*${i}\\. `, "m"));
  }
  assert.match(text, /all required quantities, conditions, units/i);
  assert.match(text, /or an unavailable diagram/i);
  assert.match(text, /Practice questions with progressive hints/);
  assert.match(text, /Practice synthetic microscopy notes/);
});

test("exam generator allows verified direct image URLs with explicit SOURCE provenance", () => {
  assert.match(EXAM_PROMPT, /Optional illustrations/);
  assert.match(EXAM_PROMPT, /HTTPS image URL/);
  assert.match(EXAM_PROMPT, /\[!SOURCE\]/);
  assert.match(EXAM_PROMPT, /all essential givens in text/);
  assert.match(EXAM_PROMPT, /Do not leave a placeholder URL/);
});
