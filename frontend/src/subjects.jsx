import React from "react";
import { SUBJECT_CODES, SUBJECT_NAMES, subjectsOf } from "./prompts.js";
const ART = {
  general: "general",
  mathematics: "calculus",
  calculus: "calculus",
  chemistry: "chemistry",
  physics: "physics",
  biology: "biology",
  history: "history",
  programming: "programming",
  languages: "languages",
  geography: "geography",
  markdown: "general",
  mixed: "general",
};
export function SubjectArtwork({ item, compact = false }) {
  const subjects = subjectsOf(item).slice(0, 3);
  return (
    <span
      className={`subject-artwork ${compact ? "compact" : ""}`}
      aria-hidden="true"
    >
      {subjects.map((s) => (
        <img
          key={s}
          src={`/subjects/${ART[s] || "general"}.svg`}
          alt=""
          loading="lazy"
        />
      ))}
    </span>
  );
}
export function SubjectIdentity({ item, compact = false }) {
  const subjects = subjectsOf(item);
  const mixed = subjects.length > 1 || item?.subject === "mixed";
  return (
    <span
      className={`subject-identity ${compact ? "compact" : ""}`}
      aria-label={`Study type: ${mixed ? "Mixed subjects: " : ""}${subjects.map((s) => SUBJECT_NAMES[s]).join(" and ")}`}
    >
      {mixed && <span className="subject-code mixed-code">MIXED</span>}
      {subjects
        .filter((s) => s !== "mixed")
        .map((s) => (
          <span className={`subject-code subject-${s}`} key={s}>
            <b>{SUBJECT_CODES[s]}</b>
            {!compact && <span>{SUBJECT_NAMES[s]}</span>}
          </span>
        ))}
    </span>
  );
}
