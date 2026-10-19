import React, { useState, useEffect } from "react";
import { buildStudyPrompt } from "./prompts.js";
export default function PromptStudio({
  documents,
  deck,
  loadDocument,
  onError,
}) {
  const [selected, setSelected] = useState([]),
    [sources, setSources] = useState([]),
    [includeDeck, setIncludeDeck] = useState(false),
    [goal, setGoal] = useState(""),
    [kind, setKind] = useState("guide"),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    let active = true;
    setBusy(true);
    Promise.all(selected.map(loadDocument))
      .then((d) => {
        if (active) setSources(d);
      })
      .catch((e) => {
        if (active) setSources([]);
        onError(e);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [selected]);
  const built = buildStudyPrompt({
    documents: sources,
    deck: includeDeck ? deck : null,
    goal,
    kind,
  });
  async function copy() {
    try {
      await navigator.clipboard.writeText(built.text);
      setCopied(true);
    } catch {
      onError(
        Error(
          "Copy is unavailable. Select the prompt below and copy it manually.",
        ),
      );
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([built.text], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "studycade-markdown-prompt.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <span className="eyebrow">YOUR MODEL. YOUR MATERIAL.</span>
      <h1>Create a better study file.</h1>
      <p className="lead">
        Choose your context, copy the prompt into your favorite model, then
        import its Markdown file here.
      </p>
      <div className="tutor-layout">
        <aside className="panel source-picker">
          <h2>Include from your library</h2>
          <p className="muted small">
            Selected text is added to the prompt on this device.
          </p>
          {documents.map((d) => (
            <label className="check-row" key={d.id}>
              <input
                type="checkbox"
                checked={selected.includes(d.id)}
                onChange={(e) => {
                  setCopied(false);
                  setSelected(
                    e.target.checked
                      ? [...selected, d.id]
                      : selected.filter((id) => id !== d.id),
                  );
                }}
              />
              <span>{d.title}</span>
            </label>
          ))}
          {deck && (
            <label className="check-row">
              <input
                type="checkbox"
                checked={includeDeck}
                onChange={(e) => {
                  setIncludeDeck(e.target.checked);
                  setCopied(false);
                }}
              />
              <span>Active set: {deck.title}</span>
            </label>
          )}
          {!documents.length && !deck && (
            <p className="muted">
              No saved sources yet. The template includes a place to attach
              notes in your model.
            </p>
          )}
          <div className="source-note">
            Use any model you prefer. Copying or downloading creates
            instructions; StudyCade does not contact an AI provider.
          </div>
        </aside>
        <section className="panel prompt-studio">
          <label>
            Output type
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setCopied(false);
              }}
            >
              <option value="guide">Study guide + flashcards</option>
              <option value="practice">Practice + worked solutions</option>
              <option value="tutor">Guided tutoring recap</option>
            </select>
          </label>
          <label>
            What would you like to work on?
            <textarea
              value={goal}
              maxLength={2000}
              onChange={(e) => {
                setGoal(e.target.value);
                setCopied(false);
              }}
              placeholder="For example: explain substitution and give me progressively harder practice."
            />
          </label>
          {busy && <p role="status">Loading selected context…</p>}
          {built.warnings.map((w, i) => (
            <p className="warning" key={i}>
              {w}
            </p>
          ))}
          <div className="controls">
            <button className="primary" disabled={busy} onClick={copy}>
              {copied ? "Copied ✓" : "Copy Markdown prompt"}
            </button>
            <button disabled={busy} onClick={download}>
              Download prompt
            </button>
          </div>
          <label>
            Complete prompt + selected context
            <textarea
              className="prompt-preview"
              aria-label="Complete Markdown prompt"
              value={built.text}
              readOnly
              spellCheck={false}
            />
          </label>
          <ol className="prompt-steps">
            <li>
              Copy this prompt into your preferred model and attach any
              additional source files there.
            </li>
            <li>Save its response as a UTF-8 .md file.</li>
            <li>
              Use Import material to review notation, subject IDs and suggested
              cards. Choose Notes + practice deck to make those cards available
              for forced recall while reading your notes.
            </li>
          </ol>
        </section>
      </div>
    </>
  );
}
