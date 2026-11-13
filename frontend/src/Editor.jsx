import React, { useEffect, useRef, useState } from "react";
import { Content } from "./content.js";
import { api } from "./api.js";
import SubjectSelect from "./SubjectSelect.jsx";
import { quoteRows, parseRows } from "./engine.js";

export default function Editor({ deck, onClose, onSaved, onDeleted, onError, guest = false }) {
  const [title, setTitle] = useState(deck?.title || ""),
    [text, setText] = useState(deck?.cards ? quoteRows(deck.cards) : ""),
    [subject, setSubject] = useState(deck?.subject || ""),
    [visibility, setVisibility] = useState(deck?.visibility || "private"),
    [delimiter, setDelimiter] = useState("\t"),
    [latex, setLatex] = useState(""),
    [busy, setBusy] = useState(false);
  const dialog = useRef(),
    field = useRef(),
    area = useRef();
  useEffect(() => {
    dialog.current.showModal();
    import("mathlive")
      .then(({ MathfieldElement }) => {
        MathfieldElement.fontsDirectory = "/mathlive/fonts";
        MathfieldElement.soundsDirectory = null;
        if (field.current) {
          field.current.mathVirtualKeyboardPolicy = "manual";
        }
      })
      .catch(() => {});
    return () => {};
  }, []);
  return (
    <dialog ref={dialog} className="editor-dialog" onCancel={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const d = await api(
              deck ? `/api/sets/${encodeURIComponent(deck.id)}` : "/api/sets",
              {
                title,
                subject: subject.trim() || "general",
                visibility,
                cards: parseRows(text, delimiter).map((c, i) => ({
                  ...(deck?.cards?.find((old) => old.term === c.term) ||
                    (deck?.cards?.length === parseRows(text, delimiter).length
                      ? deck.cards[i]
                      : {})),
                  ...c,
                })),
                documentIds: deck?.documentIds || [],
              },
              deck ? "PUT" : "POST",
            );
            await onSaved(d.id || d.set?.id || deck?.id);
          } catch (e) {
            onError(e);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="section-heading">
          <h2>{deck ? "Edit your deck" : "Create a study deck"}</h2>
          <button type="button" onClick={onClose} aria-label="Close editor">
            ×
          </button>
        </div>
        <label>
          Deck title
          <input
            autoFocus
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            Subject override
            <SubjectSelect value={subject || "general"} onChange={setSubject} />
          </label>
          <label>
            Visibility
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
            >
              <option value="private">Private</option>
              {!guest && <option value="shared">Shared</option>}
            </select>
          </label>
        </div>
        <label>
          Term / definition separator
          <select
            value={delimiter}
            onChange={(e) => {
              try {
                setText(quoteRows(parseRows(text, delimiter), e.target.value));
                setDelimiter(e.target.value);
              } catch (err) {
                onError(err);
              }
            }}
          >
            <option value={"\t"}>Tab</option>
            <option value=";">Semicolon ;</option>
            <option value=",">Comma (CSV)</option>
          </select>
        </label>
        <label>
          Cards · one pair per line
          <textarea
            ref={area}
            required
            className="deck-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Term\tDefinition\nAnother term\tAnother definition"}
          />
        </label>
        <details>
          <summary>Visual equation editor</summary>
          <p className="muted small">
            Build an equation, then insert it into the card text at the cursor.
          </p>
          <math-field
            ref={field}
            onInput={(e) => setLatex(e.target.value)}
            aria-label="Equation editor"
          />
          <label>
            LaTeX
            <input
              value={latex}
              onChange={(e) => {
                setLatex(e.target.value);
                if (field.current) field.current.value = e.target.value;
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              const start = area.current.selectionStart,
                end = area.current.selectionEnd;
              setText(
                text.slice(0, start) + "$" + latex + "$" + text.slice(end),
              );
              area.current.focus();
            }}
          >
            Insert equation
          </button>
          <Content>{"$" + latex + "$"}</Content>
        </details>
        <div className="controls">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          {deck && (
            <button
              type="button"
              onClick={async () => {
                if (
                  !window.confirm(
                    `Delete “${deck.title}”? This removes its cards and study history.`,
                  )
                )
                  return;
                try {
                  await api(
                    `/api/sets/${encodeURIComponent(deck.id)}`,
                    undefined,
                    "DELETE",
                  );
                  await onDeleted();
                } catch (e) {
                  onError(e);
                }
              }}
            >
              Delete deck
            </button>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save deck →"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
