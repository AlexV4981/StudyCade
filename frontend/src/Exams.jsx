import React, { useRef, useState } from "react";
import { api } from "./api.js";
import { Content } from "./content.js";
import { validateExam, examResult, examSummary } from "./exam.js";
import { EXAM_PROMPT } from "./examPrompt.js";
import { humanQuestion, humanTopic } from "./study.js";
import "./exams.css";
export default function Exams({
  documents = [],
  document,
  onError,
  onDocumentsChanged,
}) {
  const [active, setActive] = useState(() =>
      document?.exam
        ? { ...document, exam: validateExam(document.exam) }
        : null,
    ),
    [source, setSource] = useState(""),
    [name, setName] = useState("practice-exam.md"),
    [preview, setPreview] = useState(null),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false),
    [remove, setRemove] = useState(null),
    [deleted, setDeleted] = useState([]),
    [all, setAll] = useState(false),
    [reviewLimit, setReviewLimit] = useState(10),
    [message, setMessage] = useState(""),
    [copied, setCopied] = useState(false);
  const version = useRef(0),
    current = useRef(null);
  current.current = active?.id;
  const exams = documents.filter(
    (d) => (d.examSummary || d.exam) && !deleted.includes(d.id),
  );
  const exam = active?.exam,
    attempt = exam?.attempt,
    result = exam ? examResult(exam) : null;
  const index = exam
      ? exam.questions.findIndex((q) => q.id === attempt.currentQuestionId)
      : 0,
    q = exam?.questions[index];
  const display = q ? humanQuestion(q.question, index + 1, q.title) : null;
  const answered = attempt ? Object.keys(attempt.answers).length : 0;
  async function load(id) {
    const serial = ++version.current;
    setBusy(true);
    setMessage("");
    try {
      const d = await api("/api/documents/" + encodeURIComponent(id));
      validateExam(d.exam);
      if (serial !== version.current) return;
      setActive(d);
      setConfirm(false);
      setAll(false);
      setReviewLimit(10);
    } catch (e) {
      onError(e);
    } finally {
      if (serial === version.current) setBusy(false);
    }
  }
  async function save(patch) {
    if (busy || !active) return;
    const id = active.id;
    setBusy(true);
    setMessage("Saving…");
    try {
      const r = await api(
        "/api/documents/" + encodeURIComponent(id) + "/exam",
        patch,
        "PATCH",
      );
      validateExam(r.exam);
      if (current.current === id) {
        setActive((d) => (d?.id === id ? { ...d, exam: r.exam } : d));
        setMessage(
          r.exam.attempt.submittedAt ? "Results saved." : "Progress saved.",
        );
        setConfirm(false);
      }
      await onDocumentsChanged?.();
    } catch (e) {
      setMessage(
        "Save not confirmed. Check the error above; reload if requested.",
      );
      onError(e);
    } finally {
      setBusy(false);
    }
  }
  async function readFile(file) {
    if (!file) return;
    setBusy(true);
    setPreview(null);
    try {
      if (file.size > 2000000 || !/\.(md|markdown|txt)$/i.test(file.name))
        throw Error("Choose a UTF-8 Markdown file under 2 MB.");
      const text = new TextDecoder("utf-8", { fatal: true }).decode(
        await file.arrayBuffer(),
      );
      setSource(text);
      setName(file.name);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }
  async function parse() {
    setBusy(true);
    setPreview(null);
    try {
      const d = await api("/api/import/preview", {
        name,
        content: source,
        kind: "exam",
      });
      validateExam(d.exam);
      setPreview(d);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }
  async function importExam() {
    if (!preview) return;
    setBusy(true);
    try {
      const saved = await api("/api/import/commit", {
        name,
        content: source,
        kind: "exam",
        mode: "exam",
        folder: "Practice exams",
        title: preview.title,
      });
      setPreview(null);
      setSource("");
      setMessage("Exam saved. Reload if it is not listed.");
      await onDocumentsChanged?.();
      await load(saved.documentId);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }
  async function deleteExam(id) {
    setBusy(true);
    try {
      await api(
        "/api/documents/" + encodeURIComponent(id),
        undefined,
        "DELETE",
      );
      setDeleted((ids) => [...ids, id]);
      setRemove(null);
      await onDocumentsChanged?.();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="exams-workspace">
      <div className="section-heading">
        <div>
          <span className="eyebrow">PRACTICE. FINISH. REVIEW.</span>
          <h1>{active ? humanTopic(active.title) : "Practice exams"}</h1>
        </div>
        {active && (
          <button
            disabled={busy}
            onClick={() => {
              version.current++;
              setActive(null);
              setMessage("");
            }}
          >
            ← All exams
          </button>
        )}
      </div>
      {!active ? (
        <>
          {message && <p role="status">{message}</p>}
          <section
            className="panel exam-import"
            aria-label="Import practice exam"
          >
            <h2>Upload an MCQ exam</h2>
            <p>
              Generate an exam with your preferred AI, then upload or paste its
              Markdown here. Questions, choices and math use the same reader as
              your notes.
            </p>
            <details>
              <summary>Get the AI exam prompt and format</summary>
              <p>
                Review the AI’s answer key before using the exam. This is
                self-study; your original file contains its answers.
              </p>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(EXAM_PROMPT);
                    setCopied(true);
                  } catch (e) {
                    onError(
                      Error(
                        "Copy unavailable. Select and copy the prompt below.",
                      ),
                    );
                  }
                }}
              >
                {copied ? "Copied ✓" : "Copy exam prompt"}
              </button>
              <textarea
                readOnly
                aria-label="AI exam prompt"
                value={EXAM_PROMPT}
              />
            </details>
            <label>
              Upload exam (.md / .markdown / .txt)
              <input
                type="file"
                accept=".md,.markdown,.txt"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  readFile(file);
                }}
              />
            </label>
            <label>
              File name
              <input
                value={name}
                disabled={busy}
                onChange={(e) => {
                  setName(e.target.value);
                  setPreview(null);
                }}
              />
            </label>
            <label>
              Or paste exam Markdown
              <textarea
                aria-label="Exam Markdown"
                value={source}
                disabled={busy}
                onChange={(e) => {
                  setSource(e.target.value);
                  setPreview(null);
                }}
                placeholder="# [CALC] Practice exam…"
              />
            </label>
            <button
              className="primary"
              disabled={busy || !source.trim()}
              onClick={parse}
            >
              {busy ? "Working…" : "Check exam format"}
            </button>
            {preview && (
              <div className="exam-preview" role="status">
                <h3>{humanTopic(preview.title)}</h3>
                <p>
                  {preview.exam.questions.length} MCQ question
                  {preview.exam.questions.length === 1 ? "" : "s"} · one correct
                  choice each. Answers stay hidden until submission.
                </p>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={importExam}
                >
                  Save exam & start
                </button>
              </div>
            )}
          </section>
          <section aria-label="Saved exams">
            <h2>Your exams</h2>
            {!exams.length && (
              <p>No exams yet. Upload a Markdown exam to begin.</p>
            )}
            {exams.map((d) => {
              const s = d.examSummary || examSummary(d.exam);
              return (
                <div className="panel exam-list-row" key={d.id}>
                  <div>
                    <h3>{humanTopic(d.title)}</h3>
                    <p>
                      {s.submittedAt
                        ? "Completed"
                        : `${s.answered} of ${s.total} answered`}{" "}
                      · {s.total} question{s.total === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="controls">
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => load(d.id)}
                    >
                      {s.submittedAt ? "View results" : "Continue exam"}
                    </button>
                    <button disabled={busy} onClick={() => setRemove(d.id)}>
                      Delete exam
                    </button>
                  </div>
                  {remove === d.id && (
                    <div role="group" aria-label="Confirm exam deletion">
                      <p>
                        Delete this exam, its saved answers and source file?
                      </p>
                      <button disabled={busy} onClick={() => setRemove(null)}>
                        Cancel
                      </button>
                      <button disabled={busy} onClick={() => deleteExam(d.id)}>
                        Delete permanently
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        </>
      ) : result ? (
        <section className="panel exam-results" aria-label="Exam results">
          <h2>Exam complete</h2>
          <p className="exam-score">
            {result.correct} / {result.total} correct · {result.percentage}%
          </p>
          <p>
            {result.missed.length} missed, including {result.unanswered}{" "}
            unanswered.
          </p>
          <p role="status">{message || "Your completed result is saved."}</p>
          <label className="check-row">
            <input
              type="checkbox"
              checked={all}
              onChange={(e) => setAll(e.target.checked)}
            />
            Show all questions and answers
          </label>
          {!result.missed.length && !all && (
            <p>✓ You answered every question correctly.</p>
          )}
          {(all ? result.rows : result.missed)
            .slice(0, reviewLimit)
            .map((row, i) => {
              const d = humanQuestion(
                row.question,
                Number(row.id.slice(1)),
                row.title,
              );
              return (
                <section className="exam-review" key={row.id}>
                  <h3>
                    {d.number && `Q${d.number} · `}
                    {d.topic} —{" "}
                    {row.correct
                      ? "Correct"
                      : row.chosen
                        ? "Incorrect"
                        : "Unanswered"}
                  </h3>
                  <Content>{d.question}</Content>
                  <p>
                    Your answer: <strong>{row.chosen || "Unanswered"}</strong>
                  </p>
                  {row.chosen && (
                    <Content>
                      {row.choices.find((c) => c.id === row.chosen).text}
                    </Content>
                  )}
                  <p>
                    Correct answer: <strong>{row.answer}</strong>
                  </p>
                  <Content>
                    {row.choices.find((c) => c.id === row.answer).text}
                  </Content>
                  {row.explanation && (
                    <>
                      <h4>Worked solution</h4>
                      <Content>{row.explanation}</Content>
                    </>
                  )}
                </section>
              );
            })}
          {(all ? result.rows : result.missed).length > reviewLimit && (
            <button onClick={() => setReviewLimit((n) => n + 10)}>
              Show 10 more questions
            </button>
          )}
        </section>
      ) : (
        <section className="panel exam-taking" aria-label="Active exam">
          <div className="exam-progress">
            <strong>
              Question {index + 1} of {exam.questions.length}
            </strong>
            <span>
              {answered} answered · {exam.questions.length - answered} remaining
            </span>
          </div>
          <progress
            max={exam.questions.length}
            value={answered}
            aria-label="Exam questions answered"
          />
          <nav
            className="exam-question-nav"
            aria-label="Exam question navigation"
          >
            {exam.questions.map((row, i) => (
              <button
                key={row.id}
                disabled={busy}
                aria-current={q.id === row.id ? "step" : undefined}
                aria-label={`Question ${i + 1}, ${attempt.answers[row.id] ? "answered" : "unanswered"}`}
                onClick={() => save({ currentQuestionId: row.id })}
              >
                {i + 1}
                {attempt.answers[row.id] ? " ✓" : ""}
              </button>
            ))}
          </nav>
          <h2 className="study-question-title">
            Q{display.number} · {display.topic}
          </h2>
          <div className="study-question">
            <Content>{display.question}</Content>
          </div>
          <p>
            Choose one answer. Take as long as you need; you can change choices
            before finishing.
          </p>
          <div
            className="exam-choices"
            role="group"
            aria-label="Answer choices, select one"
          >
            {q.choices.map((choice) => (
              <button
                className="exam-choice"
                aria-pressed={attempt.answers[q.id] === choice.id}
                disabled={busy}
                key={choice.id}
                onClick={() => save({ questionId: q.id, choiceId: choice.id })}
              >
                <strong>{choice.id})</strong>
                <Content>{choice.text}</Content>
              </button>
            ))}
          </div>
          <div className="controls exam-navigation">
            <button
              disabled={busy || index === 0}
              onClick={() =>
                save({ currentQuestionId: exam.questions[index - 1].id })
              }
            >
              ← Previous question
            </button>
            <button
              disabled={busy || !attempt.answers[q.id]}
              onClick={() => save({ questionId: q.id, choiceId: null })}
            >
              Clear choice
            </button>
            <button
              disabled={busy || index === exam.questions.length - 1}
              onClick={() =>
                save({ currentQuestionId: exam.questions[index + 1].id })
              }
            >
              Next question →
            </button>
          </div>
          <p role="status" className="small muted">
            {message || "Saved progress is restored when you return."}
          </p>
          {!confirm ? (
            <button
              className="primary"
              disabled={busy}
              onClick={() => setConfirm(true)}
            >
              Finish exam
            </button>
          ) : (
            <div
              className="exam-submit"
              role="group"
              aria-label="Confirm exam submission"
            >
              <h3>Submit your answers?</h3>
              <p>
                {exam.questions.length - answered} unanswered. Unanswered
                questions count as missed. Answers are locked after submission.
              </p>
              <div className="controls">
                <button disabled={busy} onClick={() => setConfirm(false)}>
                  Keep working
                </button>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => save({ action: "submit" })}
                >
                  Submit exam & show results
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
