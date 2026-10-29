const clean = (text) =>
  String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
const fraction = (random) => {
  const n = random();
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5;
};
export function recallDelay(random = Math.random) {
  return 180000 + Math.floor(fraction(random) * 420000);
}
export function recallPool(decks, selection) {
  return decks.flatMap((deck) =>
    (deck.cards || [])
      .filter((card) => (selection[deck.id] || []).includes(card.id))
      .map((card) => ({
        ...card,
        id: JSON.stringify([String(deck.id), String(card.id)]),
        cardId: card.id,
        setId: deck.id,
        deckTitle: deck.title,
      })),
  );
}
function shuffled(items, random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(fraction(random) * (i + 1)));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function recallQuestion(pool, previousKey = null, random = Math.random) {
  const cards = pool.filter(
    (c) =>
      clean(c.term) &&
      clean(c.definition) &&
      clean(c.term) !== clean(c.definition),
  );
  const answers = new Map();
  for (const c of cards) {
    const key = clean(c.term);
    if (!answers.has(key)) answers.set(key, new Set());
    answers.get(key).add(clean(c.definition));
  }
  if (new Set(cards.map((c) => clean(c.definition))).size < 2) return null;
  const eligible = cards.filter((c) => answers.get(clean(c.term)).size === 1);
  if (!eligible.length) return null;
  const next = eligible.filter((c) => c.id !== previousKey),
    choices = next.length ? next : eligible;
  const card =
    choices[
      Math.min(
        choices.length - 1,
        Math.floor(fraction(random) * choices.length),
      )
    ];
  const alternatives = [
    ...new Map(
      cards
        .filter((c) => clean(c.definition) !== clean(card.definition))
        .map((c) => [clean(c.definition), c]),
    ).values(),
  ];
  const options = shuffled(
    [
      { id: card.id, text: card.definition, correct: true },
      ...shuffled(alternatives, random)
        .slice(0, 3)
        .map((c) => ({ id: c.id, text: c.definition, correct: false })),
    ],
    random,
  );
  return { card, options };
}
export function resolveRecall(question, optionId, now) {
  if (question.resolved) return question;
  const timedOut = now >= question.deadline;
  const chosen = question.options.find((o) => o.id === optionId);
  if (!timedOut && !chosen) return question;
  return {
    ...question,
    resolved: true,
    chosen: timedOut ? null : optionId,
    correct: !timedOut && !!chosen.correct,
    timedOut,
  };
}
