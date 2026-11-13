import test from "node:test";
import assert from "node:assert/strict";
import { validateExam, updateExam, examSummary, examResult } from "./exam.js";

function makeExam() {
  return {
    questions: [{
      id: "q1", title: "Question one", question: "What is one plus one?",
      choices: [{id:"A",text:"Two"},{id:"B",text:"Three"}],
      answer: "A", explanation: "1 + 1 = 2",
    }],
    attempt: { answers: {}, currentQuestionId: "q1", submittedAt: null },
  };
}
test("exam validation accepts canonical shape and rejects malformed keys", () => {
  assert.ok(validateExam(makeExam()));
  const invalid = makeExam();
  invalid.questions[0].unexpected = true;
  assert.throws(() => validateExam(invalid), /Invalid MCQ exam/);
});
test("answer updates do not mutate original and score correctly", () => {
  const original = makeExam();
  const answered = updateExam(original, { questionId: "q1", choiceId: "A" });
  assert.deepEqual(original.attempt.answers, {});
  assert.deepEqual(examSummary(answered), { total: 1, answered: 1, submittedAt: null });
  assert.equal(examResult(answered), null);
  const submitted = updateExam(answered, { action: "submit" });
  assert.equal(examResult(submitted).correct, 1);
  assert.equal(examResult(submitted).percentage, 100);
  assert.throws(() => updateExam(submitted, { questionId: "q1", choiceId: "B" }), /submitted/);
});
test("answer clearing restores unanswered count", () => {
  const answered = updateExam(makeExam(), { questionId: "q1", choiceId: "B" });
  const cleared = updateExam(answered, { questionId: "q1", choiceId: null });
  assert.equal(examSummary(cleared).answered, 0);
});
