import React from "react";

const SUBJECTS = [
  "general",
  "mathematics",
  "calculus",
  "chemistry",
  "physics",
  "biology",
  "history",
  "programming",
  "languages",
  "geography",
  "markdown",
  "mixed",
];
export default function SubjectSelect({ value, onChange, auto = false }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {auto && <option value="">Auto-detect from material</option>}
      {SUBJECTS.map((x) => (
        <option key={x} value={x}>
          {x[0].toUpperCase() + x.slice(1)}
        </option>
      ))}
    </select>
  );
}

