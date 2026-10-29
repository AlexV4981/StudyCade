import React from "react";
import { studyStatus } from "./study.js";
export const STUDY_STATUSES = [
  { confidence: "red", reviewed: false, label: "✕ Needs practice" },
  { confidence: "yellow", reviewed: false, label: "⚑ Review later" },
  { confidence: "green", reviewed: true, label: "✓ Complete" },
];
export function StudyStatus({
  value,
  onChange,
  disabled = false,
  label = "Progress",
}) {
  const current = studyStatus(value);
  return React.createElement(
    "div",
    { className: "study-status", role: "group", "aria-label": label },
    ...STUDY_STATUSES.map((status) =>
      React.createElement(
        "button",
        {
          type: "button",
          key: status.confidence,
          className: `study-status-${status.confidence}`,
          "aria-pressed": current === status.confidence,
          disabled: disabled || !onChange,
          onClick: () => onChange(status),
        },
        status.label,
      ),
    ),
  );
}
