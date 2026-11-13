import test from "node:test";
import assert from "node:assert/strict";
import { MODES, SPEEDS, eligiblePairs, optionsFor, supportsQuiz, result, initial, signature, resumeRound, quoteRows, parseRows } from "./engine.js";

const cards = [
  { id: "a", term: "Alpha", definition: "First" },
  { id: "b", term: "Beta", definition: "Second" },
  { id: "c", term: "Gamma", definition: "Third" },
];

test("quiz modes and speeds remain available", () => {
  assert.ok(MODES.some(([id]) => id === "paper"));
  assert.ok(SPEEDS.normal > 0);
});
test("pair filter eliminates ambiguous and self-matching cards", () => {
  assert.deepEqual(eligiblePairs(cards).map(c => c.id), ["a", "b", "c"]);
  assert.deepEqual(eligiblePairs([
    { id: "a", term: "x", definition: "x" },
    { id: "b", term: "one", definition: "same" },
    { id: "c", term: "two", definition: "same" },
  ]), []);
});
test("round modes do not mutate source and can restore compatible saved progress", () => {
  const old = structuredClone(cards);
  const current = initial(cards, "paper");
  assert.deepEqual(current.deck, cards);
  assert.deepEqual(cards, old);
  const restored = resumeRound(cards, "paper", { signature: signature(cards), state: current });
  assert.deepEqual(restored.deck, cards);
  assert.deepEqual(restored.open, []);
  assert.equal(restored.locked, false);
  const changed = resumeRound(cards.slice(1), "paper", { signature: signature(cards), state: current });
  assert.equal(changed.deck.length, 2);
});
test("option selection, support check, grading", () => {
  assert.equal(optionsFor(cards, cards[0], "choice").length, 3);
  assert.equal(supportsQuiz(cards), true);
  assert.equal(supportsQuiz(cards.slice(0, 1)), false);
  assert.deepEqual(result(true), { right: 1, wrong: 0 });
  assert.deepEqual(result(false), { right: 0, wrong: 1 });
});
test("CSV/TSV roundtrip preserves embedded quotes, delimiters, and newlines", () => {
  const input = [
    { term: 'Al"pha', definition: "one\ttwo" },
    { term: "A\nB", definition: "C" },
  ];
  assert.deepEqual(parseRows(quoteRows(input)), input);
  assert.throws(() => parseRows('"unclosed\tdefinition'), /Close the quoted/);
});
