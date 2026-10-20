const keys = (v, wanted) =>
  v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.keys(v).sort().join("|") === wanted.split("|").sort().join("|");
const text = (v, n) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= n;
const invalid = () => {
  throw Error("Invalid MCQ exam data. Check the format and answer key.");
};
export function validateExam(e) {
  if (
    !keys(e, "questions|attempt") ||
    !Array.isArray(e.questions) ||
    !e.questions.length ||
    e.questions.length > 200
  )
    invalid();
  const ids = new Map(),
    prompts = new Set();
  for (const [i, q] of e.questions.entries()) {
    if (
      !keys(q, "id|title|question|choices|answer|explanation") ||
      q.id !== `q${i + 1}` ||
      !text(q.title, 200) ||
      !text(q.question, 10000) ||
      typeof q.explanation !== "string" ||
      q.explanation.length > 20000 ||
      !Array.isArray(q.choices) ||
      q.choices.length < 2 ||
      q.choices.length > 6
    )
      invalid();
    const prompt = q.question.toLowerCase().replace(/\s+/g, " ").trim();
    if (prompts.has(prompt)) invalid();
    prompts.add(prompt);
    const seen = new Set();
    q.choices.forEach((c, n) => {
      if (!keys(c, "id|text") || c.id !== "ABCDEF"[n] || !text(c.text, 10000))
        invalid();
      const k = c.text.toLowerCase().replace(/\s+/g, " ").trim();
      if (seen.has(k)) invalid();
      seen.add(k);
    });
    const options = new Set(q.choices.map((c) => c.id));
    if (!options.has(q.answer)) invalid();
    ids.set(q.id, options);
  }
  const a = e.attempt;
  if (
    !keys(a, "answers|currentQuestionId|submittedAt") ||
    !ids.has(a.currentQuestionId) ||
    !a.answers ||
    typeof a.answers !== "object" ||
    Array.isArray(a.answers) ||
    Object.keys(a.answers).length > e.questions.length
  )
    invalid();
  for (const [k, v] of Object.entries(a.answers))
    if (!ids.get(k)?.has(v)) invalid();
  if (
    a.submittedAt !== null &&
    !(
      typeof a.submittedAt === "string" &&
      a.submittedAt.length <= 50 &&
      /(?:Z|[+-]\d{2}:\d{2})$/.test(a.submittedAt) &&
      Number.isFinite(Date.parse(a.submittedAt))
    )
  )
    invalid();
  return e;
}
export function updateExam(exam, patch) {
  validateExam(exam);
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) invalid();
  const e = JSON.parse(JSON.stringify(exam)),
    a = e.attempt;
  if (keys(patch, "action") && patch.action === "submit") {
    a.submittedAt ||= new Date().toISOString();
    return e;
  }
  if (a.submittedAt)
    throw Error(
      "This exam is submitted. Import a new copy for another attempt.",
    );
  if (keys(patch, "questionId|choiceId")) {
    if (!e.questions.some((q) => q.id === patch.questionId)) invalid();
    if (patch.choiceId === null) delete a.answers[patch.questionId];
    else a.answers[patch.questionId] = patch.choiceId;
    a.currentQuestionId = patch.questionId;
  } else if (keys(patch, "currentQuestionId"))
    a.currentQuestionId = patch.currentQuestionId;
  else invalid();
  return validateExam(e);
}
export function examSummary(e) {
  validateExam(e);
  return {
    total: e.questions.length,
    answered: Object.keys(e.attempt.answers).length,
    submittedAt: e.attempt.submittedAt,
  };
}
export function examResult(e) {
  validateExam(e);
  if (!e.attempt.submittedAt) return null;
  const rows = e.questions.map((q) => ({
    ...q,
    chosen: e.attempt.answers[q.id] ?? null,
    correct: e.attempt.answers[q.id] === q.answer,
  }));
  const correct = rows.filter((q) => q.correct).length;
  return {
    total: rows.length,
    correct,
    percentage: Math.round((100 * correct) / rows.length),
    unanswered: rows.filter((q) => q.chosen === null).length,
    missed: rows.filter((q) => !q.correct),
    rows,
  };
}
