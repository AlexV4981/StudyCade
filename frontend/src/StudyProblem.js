import React, { createContext, useContext, useState } from "react";
import { humanQuestion } from "./study.js";
import { StudyStatus } from "./StudyStatus.js";
export const StudyContext = createContext(null);
export function StudyProblem(props) {
  const study = useContext(StudyContext);
  const [saving, setSaving] = useState(false);
  const Renderer = study.Renderer;
  const prompt = props["data-prompt"];
  const questionId = props["data-question-id"];
  const q = humanQuestion(
    prompt,
    Number(props["data-number"]),
    props["data-topic"],
  );
  const parts = JSON.parse(props["data-parts"]);
  const render = (text) =>
    React.createElement(Renderer, { practice: false }, text);
  const review =
    study.reviews?.find(
      (r) => r.sectionId === study.sectionId && r.questionId === questionId,
    ) ||
    (study.questionCount === 1
      ? study.reviews?.find(
          (r) => r.sectionId === study.sectionId && !r.questionId,
        )
      : null);
  async function change(status) {
    if (!study.onReview) return;
    setSaving(true);
    try {
      await study.onReview(study.sectionId, status, questionId);
    } finally {
      setSaving(false);
    }
  }
  return React.createElement(
    "section",
    {
      className: "study-problem",
      "aria-label": `Question ${q.number}: ${q.topic}`,
    },
    React.createElement(
      "h3",
      { className: "study-question-title" },
      `Q${q.number} · ${q.topic}`,
    ),
    React.createElement(
      "div",
      { className: "study-question" },
      render(q.question),
    ),
    q.needsContext &&
      React.createElement(
        "p",
        { className: "study-context-warning", role: "note" },
        "This saved question refers to earlier material. Add the missing givens before solving; StudyCade will not guess them.",
      ),
    React.createElement(
      "p",
      { className: "study-paper-cue" },
      "Work it out on paper, then reveal the answer.",
    ),
    ...parts
      .filter((p) => p.kind !== "SOURCE")
      .map((part, i) =>
        React.createElement(
          "details",
          {
            className: `study-reveal study-reveal-${part.kind.toLowerCase()}`,
            key: `${prompt}:${i}`,
          },
          React.createElement(
            "summary",
            null,
            part.kind === "HINT"
              ? "Show hint"
              : part.kind === "ANSWER"
                ? "Reveal answer"
                : "Show worked solution",
          ),
          render(part.text),
        ),
      ),
    !parts.some((p) => p.kind === "ANSWER") &&
      React.createElement(
        "p",
        { className: "study-context-warning" },
        "No answer was included in this source. Add a verified answer before marking it complete.",
      ),
    !study.onReview &&
      React.createElement(
        "p",
        { className: "study-paper-cue" },
        "Import this file as study notes to save question progress.",
      ),
    React.createElement(StudyStatus, {
      value: review,
      onChange: study.onReview ? change : null,
      disabled: saving || study.disabled,
      label: `Progress for Q${q.number}`,
    }),
    (q.question !== q.original || parts.some((p) => p.kind === "SOURCE")) &&
      React.createElement(
        "details",
        { className: "study-source" },
        React.createElement(
          "summary",
          null,
          "Source details / original wording",
        ),
        q.question !== q.original && render(q.original),
        ...parts
          .filter((p) => p.kind === "SOURCE")
          .map((p, i) =>
            React.createElement("div", { key: i }, render(p.text)),
          ),
      ),
  );
}
