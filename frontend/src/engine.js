export const MODES = [
  ["paper", "Study on paper", "✎"],
  ["flash", "Flashcards", "↻"],
  ["memory", "Memory", "▦"],
  ["match", "Match pairs", "⇄"],
  ["choice", "Multiple choice", "◉"],
  ["bank", "Word bank", "▤"],
  ["meteor", "Meteor Defense", "✦"],
];
export const SPEEDS = { slow: 14000, normal: 10000, fast: 7000 };
export function shuffle(cards) {
  const a = [...cards];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function eligiblePairs(cards) {
  const clean = (x) => x.trim().toLowerCase();
  const terms = new Set(cards.map((c) => clean(c.term)));
  const counts = new Map();
  cards.forEach((c) =>
    counts.set(clean(c.definition), (counts.get(clean(c.definition)) || 0) + 1),
  );
  return cards.filter(
    (c) =>
      clean(c.term) !== clean(c.definition) &&
      !terms.has(clean(c.definition)) &&
      counts.get(clean(c.definition)) === 1,
  );
}
export function optionsFor(cards, c, mode) {
  const key = mode === "meteor" ? "definition" : "term";
  const distinct = [
    ...new Map(
      cards
        .filter(
          (x) =>
            x.id !== c.id && x.term !== c.term && x.definition !== c.definition,
        )
        .map((x) => [x[key], x]),
    ).values(),
  ];
  return shuffle([c, ...shuffle(distinct).slice(0, mode === "bank" ? 7 : 3)]);
}
export function supportsQuiz(cards) {
  return (
    cards.length > 1 &&
    cards.every((card) =>
      cards.some(
        (other) =>
          other.id !== card.id &&
          other.term !== card.term &&
          other.definition !== card.definition,
      ),
    )
  );
}
export function result(correct) {
  return { right: correct ? 1 : 0, wrong: correct ? 0 : 1 };
}
export function initial(cards, mode) {
  const deck = mode === "paper" ? [...cards] : shuffle(cards);
  const pairs = shuffle(eligiblePairs(cards)).slice(0, 6);
  return {
    deck,
    index: 0,
    flipped: false,
    right: 0,
    lives: 3,
    elapsed: 0,
    speed: "normal",
    paused: mode === "meteor",
    started: false,
    answered: false,
    chosen: null,
    options: deck.length ? optionsFor(cards, deck[0], mode) : [],
    tiles: shuffle(
      pairs.flatMap((c) => [
        { ...c, side: "term" },
        { ...c, side: "definition" },
      ]),
    ),
    pairs,
    left: shuffle(pairs),
    rightPairs: shuffle(pairs),
    open: [],
    matched: [],
    picked: {},
    moves: 0,
    locked: false,
  };
}
export const signature = (cards) =>
  JSON.stringify(cards.map((c) => [c.id, c.term, c.definition]));
export function resumeRound(cards, mode, saved) {
  const fresh = () => initial(cards, mode);
  if (!saved || saved.signature !== signature(cards) || !saved.state)
    return fresh();
  const s = saved.state,
    byId = new Map(cards.map((c) => [c.id, c]));
  if (
    !Number.isInteger(s.index) ||
    s.index < 0 ||
    s.index > cards.length ||
    !Number.isInteger(s.right) ||
    s.right < 0 ||
    !Number.isInteger(s.lives) ||
    s.lives < 0 ||
    s.lives > 3 ||
    !Number.isFinite(s.elapsed) ||
    s.elapsed < 0 ||
    !SPEEDS[s.speed] ||
    !Number.isInteger(s.moves) ||
    s.moves < 0 ||
    !Array.isArray(s.matched) ||
    !Array.isArray(s.open)
  )
    return fresh();
  for (const key of ["deck", "options", "pairs", "left", "rightPairs", "tiles"])
    if (!Array.isArray(s[key]) || s[key].some((c) => !c || !byId.has(c.id)))
      return fresh();
  if (
    s.deck.length !== cards.length ||
    new Set(s.deck.map((c) => c.id)).size !== cards.length ||
    s.tiles.some((c) => !["term", "definition"].includes(c.side)) ||
    s.open.some((i) => !Number.isInteger(i) || i < 0 || i >= s.tiles.length)
  )
    return fresh();
  const out = {
    ...s,
    locked: false,
    open: [],
    picked: {},
    paused: mode === "meteor" ? true : !!s.paused,
  };
  for (const key of ["deck", "options", "pairs", "left", "rightPairs"])
    out[key] = s[key].map((c) => byId.get(c.id));
  out.tiles = s.tiles.map((c) => ({ ...byId.get(c.id), side: c.side }));
  if (mode === "meteor" && s.locked && s.chosen === out.deck[out.index]?.id) {
    out.index++;
    out.elapsed = 0;
    out.chosen = null;
    out.options = out.deck[out.index]
      ? optionsFor(cards, out.deck[out.index], mode)
      : [];
  }
  return out;
}
export function quoteRows(cards, delimiter = "\t") {
  return cards
    .map((c) =>
      [c.term, c.definition]
        .map((v) => '"' + String(v).replaceAll('"', '""') + '"')
        .join(delimiter),
    )
    .join("\n");
}
export function parseRows(text, delimiter = "\t") {
  const rows = [];
  let row = [],
    field = "",
    quoted = false,
    closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += c;
    } else if (c === '"' && !field && !closed) quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = "";
      closed = false;
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      field = "";
      closed = false;
    } else {
      if (closed) throw Error("Unexpected text after a closing quote.");
      field += c;
    }
  }
  if (quoted) throw Error("Close the quoted term or definition.");
  row.push(field);
  if (row.some((v) => v.trim())) rows.push(row);
  if (rows.some((r) => r.length !== 2))
    throw Error(
      "Each row needs exactly one term and one definition. Use quotes around multiline values.",
    );
  return rows.map(([term, definition]) => ({ term, definition }));
}
