import React, { useState } from "react";
import { Content } from "./content.js";
import { countRecall } from "./study.js";
import { api } from "./api.js";

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
export function SubjectSelect({ value, onChange, auto = false }) {
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

export default function Importer({ onError, onSaved }) {
  const [items, setItems] = useState([]),
    [active, setActive] = useState(0),
    [folder, setFolder] = useState("My notes"),
    [mode, setMode] = useState("notes"),
    [subject, setSubject] = useState(""),
    [inputMode, setInputMode] = useState("paste"),
    [pasteName, setPasteName] = useState("Pasted notes"),
    [pasteFormat, setPasteFormat] = useState("md"),
    [pasteContent, setPasteContent] = useState(""),
    [busy, setBusy] = useState(false);
  const item = items[active];
  async function upload(files) {
    if (busy || !files.length) return;
    setBusy(true);
    setItems([]);
    try {
      const next = [];
      for (const f of files) {
        if (!/\.(md|markdown|txt|csv|tsv)$/i.test(f.name))
          throw Error(
            "Choose Markdown, text, CSV or TSV files. PDFs can be extracted with the bundled import tool; see the setup guide.",
          );
        if (f.size > 2_000_000) throw Error(`${f.name} exceeds 2 MB.`);
        const content = await f.text();
        const preview = await api("/api/import/preview", {
          name: f.name,
          content,
          subject,
        });
        next.push({ name: f.name, content, ...preview });
      }
      setItems(next);
      setActive(0);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }
  async function commit() {
    setBusy(true);
    try {
      for (const f of items)
        await api("/api/import/commit", {
          name: f.name,
          content: f.content,
          folder,
          mode,
          title: f.title,
          visibility: "private",
          subject: subject || f.subject,
          cards: f.cards,
        });
      setItems([]);
      setPasteContent("");
      await onSaved();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <span className="eyebrow">FROM MATERIAL TO MASTERY</span>
      <h1>Bring your learning together.</h1>
      <p className="lead">
        Turn your notes into a readable study guide, a deck, or both.
      </p>
      <div className="panel import-panel">
        <div className="controls" role="group" aria-label="Import source">
          <button
            aria-pressed={inputMode === "paste"}
            className={inputMode === "paste" ? "selected" : ""}
            onClick={() => setInputMode("paste")}
          >
            Paste text
          </button>
          <button
            aria-pressed={inputMode === "files"}
            className={inputMode === "files" ? "selected" : ""}
            onClick={() => setInputMode("files")}
          >
            Upload files
          </button>
        </div>
        <div className="form-grid">
          <label>
            Save in folder
            <input value={folder} onChange={(e) => setFolder(e.target.value)} />
          </label>
          <label>
            Subject override
            <SubjectSelect value={subject} onChange={setSubject} auto />
          </label>
        </div>
        {inputMode === "paste" ? (
          <div className="paste-import">
            <div className="form-grid">
              <label>
                Material name
                <input
                  value={pasteName}
                  maxLength={110}
                  onChange={(e) => {
                    setPasteName(e.target.value);
                    setItems([]);
                  }}
                />
              </label>
              <label>
                Pasted format
                <select
                  value={pasteFormat}
                  onChange={(e) => {
                    setPasteFormat(e.target.value);
                    setItems([]);
                  }}
                >
                  <option value="md">Markdown notes</option>
                  <option value="txt">Plain text</option>
                  <option value="tsv">Tab-separated cards (TSV)</option>
                  <option value="csv">Comma-separated cards (CSV)</option>
                </select>
              </label>
            </div>
            <label>
              Paste your material
              <textarea
                rows={12}
                value={pasteContent}
                onChange={(e) => {
                  setPasteContent(e.target.value);
                  setItems([]);
                }}
                placeholder={
                  pasteFormat === "tsv"
                    ? "Term\tDefinition\nDerivative\tInstantaneous rate of change"
                    : pasteFormat === "csv"
                      ? "Term,Definition\nDerivative,Instantaneous rate of change"
                      : "Paste notes, Markdown from your favorite model, or study material here…"
                }
                aria-describedby="paste-help"
              />
            </label>
            <p id="paste-help" className="muted small">
              {pasteFormat === "tsv" || pasteFormat === "csv"
                ? "Use two columns: term and definition, one card per row. An optional Term/Definition header is supported. Quote values containing line breaks or the separator."
                : "Math and chemistry notation are preserved. For cards, use **Term**: Definition or paired [!RECALL] and [!ANSWER] callouts. Plain notes can also be saved without cards."}{" "}
              Up to 2 MB. Preview and choose notes, a deck, or both before
              saving.
            </p>
            <button
              className="primary"
              disabled={busy || !pasteContent.trim() || !pasteName.trim()}
              onClick={() => {
                const base = pasteName
                  .trim()
                  .replace(/\.(md|markdown|txt|csv|tsv)$/i, "");
                upload([
                  {
                    name: `${base}.${pasteFormat}`,
                    size: new Blob([pasteContent]).size,
                    text: async () => pasteContent,
                  },
                ]);
              }}
            >
              Preview pasted material →
            </button>
          </div>
        ) : (
          <label
            className="drop-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              upload(e.dataTransfer.files);
            }}
          >
            <span>↥</span>
            <h2>Make these notes your own.</h2>
            <p>Choose files or drag them here</p>
            <input
              type="file"
              multiple
              accept=".md,.markdown,.txt,.csv,.tsv"
              disabled={busy}
              onChange={(e) => upload(e.target.files)}
            />
            <small>Markdown, text, CSV and TSV · up to 2 MB each</small>
          </label>
        )}
        <p className="muted small">
          PDFs can be extracted with the bundled import tool; see the setup
          guide. For this upload, choose readable text, Markdown, CSV or TSV.
        </p>
      </div>
      {busy && <p role="status">Preparing your material…</p>}
      {items.length > 0 && (
        <section className="panel import-panel">
          <div className="controls">
            {items.map((x, i) => (
              <button
                className={active === i ? "selected" : ""}
                key={i}
                onClick={() => setActive(i)}
              >
                {x.name}
              </button>
            ))}
          </div>
          <label>
            Title
            <input
              value={item.title}
              onChange={(e) =>
                setItems((xs) =>
                  xs.map((x, i) =>
                    i === active ? { ...x, title: e.target.value } : x,
                  ),
                )
              }
            />
          </label>
          <div className="controls">
            <label>
              Create{" "}
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="notes">Study notes</option>
                <option value="deck">Flashcard deck</option>
                <option value="practice">Notes + practice deck</option>
              </select>
            </label>
          </div>
          {item.warnings?.map((w, i) => (
            <p className="warning" key={i}>
              {w}
            </p>
          ))}
          <details open>
            <summary>Read preview</summary>
            <Content
              study={{
                topic: item.title || item.name,
                questionCount: countRecall(item.source || item.content),
                reviews: [],
              }}
            >
              {item.source || item.content}
            </Content>
          </details>
          <details open={mode !== "notes"}>
            <summary>
              {item.cards?.length || 0} suggested cards · review before saving
            </summary>
            {item.cards?.map((c, i) => (
              <div className="form-grid suggested-card" key={i}>
                <label>
                  Term
                  <textarea
                    value={c.term}
                    onChange={(e) =>
                      setItems((xs) =>
                        xs.map((x, j) =>
                          j === active
                            ? {
                                ...x,
                                cards: x.cards.map((c, k) =>
                                  k === i ? { ...c, term: e.target.value } : c,
                                ),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Definition
                  <textarea
                    value={c.definition}
                    onChange={(e) =>
                      setItems((xs) =>
                        xs.map((x, j) =>
                          j === active
                            ? {
                                ...x,
                                cards: x.cards.map((c, k) =>
                                  k === i
                                    ? { ...c, definition: e.target.value }
                                    : c,
                                ),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                </label>
              </div>
            ))}
          </details>
          <button
            className="primary"
            disabled={busy || !folder.trim()}
            onClick={commit}
          >
            Save {items.length} {items.length === 1 ? "file" : "files"} to
            library →
          </button>
        </section>
      )}
    </>
  );
}
