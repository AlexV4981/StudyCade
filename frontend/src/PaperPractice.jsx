import React, { useState } from "react";
import { Content } from "./content.js";
import { cardQuestion } from "./study.js";
import { StudyStatus } from "./StudyStatus.js";

export default function PaperPractice({
  card,
  number,
  topic,
  onStatus,
  onPrevious,
  onNext,
  canPrevious,
  canNext,
  showNavigation = true,
  onOpenSource,
}) {
  const [saving, setSaving] = useState(false);
  const q = cardQuestion(card, number, topic);
  async function change(status) {
    setSaving(true);
    try {
      await onStatus(card, status.confidence);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="paper-practice">
      <h3 className="study-question-title">
        Q{q.number} · {q.topic}
      </h3>
      <div className="study-question">
        <Content>{q.question}</Content>
      </div>
      {q.needsContext && (
        <p className="study-context-warning" role="note">
          This saved question refers to earlier material. Add the missing givens
          before solving; StudyCade will not guess them.
        </p>
      )}
      <p className="study-paper-cue">
        Work it out on paper. Take as long as you need.
      </p>
      {card.hints?.length > 0 && (
        <details
          key={`hint:${card.id}`}
          className="study-reveal study-reveal-hint"
        >
          <summary>Show hint</summary>
          {card.hints.map((hint, i) => (
            <Content key={i}>{hint}</Content>
          ))}
        </details>
      )}
      <details
        key={`${card.id}:${card.definition}`}
        className="study-reveal study-reveal-answer"
      >
        <summary>Reveal answer</summary>
        <Content>{card.definition}</Content>
        {card.explanation && (
          <>
            <h4>Worked solution</h4>
            <Content>{card.explanation}</Content>
          </>
        )}
      </details>
      <StudyStatus
        value={card.studyStatus}
        onChange={onStatus ? change : null}
        disabled={saving}
        label={`Progress for Q${q.number}`}
      />
      {showNavigation && (
        <div className="controls paper-navigation">
          <button disabled={!canPrevious || saving} onClick={onPrevious}>
            ← Previous question
          </button>
          <button
            className="primary"
            disabled={!canNext || saving}
            onClick={onNext}
          >
            Next question →
          </button>
        </div>
      )}
      {(q.question !== q.original ||
        card.provenance?.filename ||
        onOpenSource) && (
        <details key={`source:${card.id}`} className="study-source">
          <summary>Source details / original wording</summary>
          {card.provenance?.filename && <p>{card.provenance.filename}</p>}
          {q.question !== q.original && <Content>{q.original}</Content>}
          {onOpenSource && (
            <button onClick={onOpenSource}>Open source notes →</button>
          )}
        </details>
      )}
    </div>
  );
}
