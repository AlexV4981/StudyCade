import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Content } from "./content.js";
import Games from "./Games.jsx";
import PromptStudio from "./PromptStudio.jsx";
import { MARKDOWN_PROMPT, SUBJECT_CODES, subjectsOf } from "./prompts.js";
import { SubjectIdentity, SubjectArtwork } from "./subjects.jsx";
import { MODES, quoteRows, parseRows } from "./engine.js";
import "katex/dist/katex.min.css";
import "./style.css";
import {
  api,
  getDeploymentConfig,
  reloadCloudWorkspace,
  clearCloudCache,
} from "./api.js";
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
function SubjectSelect({ value, onChange, auto = false }) {
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
function stored(key, fallback) {
  try {
    return JSON.parse(sessionStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
function clearDeviceSessions() {
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of Object.keys(storage))
      if (key.startsWith("studycade:")) storage.removeItem(key);
  }
}
function downloadJson(value, name) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const PROMPT = MARKDOWN_PROMPT;
function App() {
  const [data, setData] = useState(null),
    [page, setPage] = useState("home"),
    [query, setQuery] = useState(""),
    [listPage, setListPage] = useState(0),
    [deck, setDeck] = useState(null),
    [mode, setMode] = useState("flash"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [document, setDocument] = useState(null),
    [editing, setEditing] = useState(false);
  const progressQueue = useRef(Promise.resolve());
  const serial = useRef(0);
  const report = (e) => setError(e.message || String(e));
  async function refresh() {
    const d = await api("/api/bootstrap");
    setData(d);
    return d;
  }
  useEffect(() => {
    // Remove persistent card/email caches left by older versions. New rounds
    // use tab-scoped session storage; guest libraries use IndexedDB separately.
    try {
      for (const key of Object.keys(localStorage))
        if (key.startsWith("studycade:")) localStorage.removeItem(key);
    } catch {}
    refresh()
      .then((d) => {
        if (d.user.role === "cloud") {
          try {
            clearDeviceSessions();
          } catch {}
        }
        const session =
          d.user.role === "cloud"
            ? {}
            : stored(`studycade:${d.user.email}`, {});
        setMode(
          MODES.some((x) => x[0] === session.mode) ? session.mode : "flash",
        );
        if (d.sets.some((s) => s.id === session.deck))
          loadDeck(session.deck, false);
        else if (d.sets[0]) loadDeck(d.sets[0].id, false);
      })
      .catch(report);
  }, []);
  async function loadDeck(id, navigate = true) {
    const n = ++serial.current;
    setBusy(true);
    setError("");
    try {
      const d = await api("/api/sets/" + encodeURIComponent(id));
      if (n !== serial.current) return;
      setDeck({ ...d, roundVersion: n });
      if (navigate) setPage("study");
    } catch (e) {
      report(e);
    } finally {
      if (n === serial.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (data && deck && data.user.role !== "cloud")
      save(`studycade:${data.user.email}`, { deck: deck.id, mode });
  }, [data?.user.email, deck?.id, mode]);
  function record(correct, card, event) {
    if (!deck) return;
    const setId = deck.id;
    setData((d) => ({
      ...d,
      progress: (d.progress || []).some((p) => p.setId === setId)
        ? d.progress.map((p) =>
            p.setId === setId
              ? {
                  ...p,
                  right: p.right + Number(correct),
                  wrong: p.wrong + Number(!correct),
                }
              : p,
          )
        : [
            ...(d.progress || []),
            { setId, right: Number(correct), wrong: Number(!correct) },
          ],
    }));
    progressQueue.current = progressQueue.current
      .catch(() => {})
      .then(() =>
        card?.id !== undefined
          ? api("/api/attempts", {
              setId,
              cardId: card.id,
              correct,
              confidence:
                event === "review" ? (correct ? "high" : "low") : undefined,
              eventId: crypto.randomUUID(),
            })
          : api("/api/progress", {
              setId,
              right: Number(correct),
              wrong: Number(!correct),
            }),
      )
      .then(() => refresh())
      .catch(async (e) => {
        report(e);
        try {
          await refresh();
        } catch {
          setData((d) => ({
            ...d,
            progress: (d.progress || []).map((p) =>
              p.setId === setId
                ? {
                    ...p,
                    right: Math.max(0, p.right - Number(correct)),
                    wrong: Math.max(0, p.wrong - Number(!correct)),
                  }
                : p,
            ),
          }));
        }
      });
  }
  const sets = data?.sets || [],
    filtered = sets.filter((s) =>
      `${s.title} ${s.subject || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    ),
    progress = data?.progress || [],
    rights = progress.reduce((a, p) => a + p.right, 0),
    attempts = progress.reduce((a, p) => a + p.right + p.wrong, 0);
  const canEdit = ["admin", "editor", "guest", "cloud"].includes(
    data?.user.role,
  );
  async function openDoc(id, sectionId) {
    setBusy(true);
    try {
      setDocument({
        ...(await api("/api/documents/" + encodeURIComponent(id))),
        focusSectionId: sectionId,
      });
      setPage("notes");
      if (sectionId)
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            window.document
              .querySelector(`[data-section-id="${CSS.escape(sectionId)}"]`)
              ?.scrollIntoView({ behavior: "instant" }),
          ),
        );
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  const nav = (p) => {
    setPage(p);
    setError("");
  };
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            nav("home");
          }}
        >
          <span className="brand-icon">✳</span>
          <span>
            StudyCade<small>MAKE KNOWLEDGE STICK</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          {[
            ["home", "⌂", "Overview"],
            ["study", "▣", "Practice"],
            ["notes", "▤", "Study notes"],
            ["import", "↥", "Import material"],
            ["tutor", "✧", "Source tutor"],
          ].map(([p, icon, label]) => (
            <button
              key={p}
              className={page === p ? "nav-item active" : "nav-item"}
              aria-current={page === p ? "page" : undefined}
              onClick={() => nav(p)}
            >
              <span>{icon}</span>
              {label}
              {p === "tutor" && <span className="tiny-tag">PROMPTS</span>}
            </button>
          ))}
        </nav>
        <div className="library-heading">
          <span className="eyebrow">YOUR STUDY LIBRARY</span>
          <span>{sets.length}</span>
        </div>
        <label className="search">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Search study decks"
            placeholder="Find a deck…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setListPage(0);
            }}
          />
        </label>
        <div className="library">
          {filtered.slice(listPage * 25, listPage * 25 + 25).map((s) => (
            <button
              key={s.id}
              className={`deck-nav ${deck?.id === s.id ? "selected" : ""}`}
              onClick={() => loadDeck(s.id)}
            >
              <SubjectArtwork item={s} compact />
              <span>
                {s.title}
                <small>
                  {s.cardCount} {s.cardCount === 1 ? "card" : "cards"} ·{" "}
                  {subjectsOf(s)
                    .map((x) => SUBJECT_CODES[x])
                    .join(" + ")}
                </small>
              </span>
            </button>
          ))}
          {!filtered.length && (
            <p className="muted small">No matching decks.</p>
          )}
        </div>
        {filtered.length > 25 && (
          <div className="controls small">
            <button
              disabled={!listPage}
              onClick={() => setListPage(listPage - 1)}
            >
              ←
            </button>
            <span>
              {listPage + 1} / {Math.ceil(filtered.length / 25)}
            </span>
            <button
              disabled={(listPage + 1) * 25 >= filtered.length}
              onClick={() => setListPage(listPage + 1)}
            >
              →
            </button>
          </div>
        )}
        <button
          className="nav-item settings-link"
          onClick={() => nav("settings")}
        >
          ⚙ Settings & backup
        </button>
        <div className="account">
          <span className="avatar">
            {data?.user.email?.[0]?.toUpperCase() || "S"}
          </span>
          <div>
            <strong>
              {data?.user.displayName || data?.user.email || "Connecting…"}
            </strong>
            <small>{data?.user.role || "Study workspace"}</small>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>YOUR PERSONAL LEARNING SPACE</span>
          <span className="top-status">
            <i /> One concept at a time
          </span>
        </header>
        <main id="main" tabIndex="-1">
          {data?.user.role === "guest" && (
            <div className="notice" role="note">
              <span>
                <strong>Guest workspace · saved in this browser.</strong> Your
                notes and progress are separate from other visitors. Import
                previews temporarily send text to this service for parsing. Use
                Settings & backup to export or clear this device.
              </span>
            </div>
          )}
          {data?.user.role === "cloud" && (
            <div className="notice cloud-notice" role="note">
              <span>
                <strong>
                  Private cloud workspace · synced between your devices.
                </strong>{" "}
                Saves go to your signed-in workspace. Guest material stays in
                this browser until you explicitly copy or restore it into cloud.
                Cloud data has no offline browser cache.
              </span>
            </div>
          )}
          {error && (
            <div className="alert" role="alert">
              {error}
              <button onClick={() => setError("")} aria-label="Dismiss error">
                ×
              </button>
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button
                onClick={() => setNotice("")}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          )}
          {busy && (
            <p role="status" className="loading">
              Loading your material…
            </p>
          )}
          {page === "home" && (
            <>
              <div className="page-title">
                <div>
                  <span className="eyebrow">
                    A LITTLE PRACTICE. LASTING KNOWLEDGE.
                  </span>
                  <h1>
                    Make room for your next
                    <br />
                    <em>“I’ve got this.”</em>
                  </h1>
                  <p className="lead">
                    Your notes, your pace, your next small breakthrough.
                  </p>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="orbit" />
                  <span className="art-star">✧</span>
                  <div className="art-card back">A little every day.</div>
                  <div className="art-card front">
                    <span>THE SCIENCE OF LEARNING</span>
                    <b>
                      Recall.
                      <br />
                      Connect.
                      <br />
                      Remember.
                    </b>
                    <i>✳</i>
                  </div>
                </div>
              </div>
              <div className="stats">
                <div>
                  <span>YOUR LIBRARY</span>
                  <strong>
                    {sets.length}
                    <small>study decks</small>
                  </strong>
                </div>
                <div>
                  <span>KNOWLEDGE IN MOTION</span>
                  <strong>
                    {attempts}
                    <small>practice attempts</small>
                  </strong>
                </div>
                <div>
                  <span>BUILDING CONFIDENCE</span>
                  <strong>
                    {attempts ? Math.round((rights / attempts) * 100) : "—"}
                    {attempts ? "%" : ""}
                    <small>correct answers</small>
                  </strong>
                </div>
              </div>
              {deck && (
                <section className="continue panel">
                  <div>
                    <span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span>
                    <h2>{deck.title}</h2>
                    <p>
                      {deck.cards?.length}{" "}
                      {deck.cards?.length === 1 ? "card" : "cards"} ·{" "}
                      {MODES.find((x) => x[0] === mode)?.[1]}
                    </p>
                  </div>
                  <button className="primary" onClick={() => nav("study")}>
                    Continue studying →
                  </button>
                </section>
              )}
              <div className="section-heading">
                <div>
                  <span className="eyebrow">GOOD THINGS TAKE PRACTICE</span>
                  <h2>A way to learn for every mood.</h2>
                </div>
              </div>
              <div className="mode-cards">
                {MODES.map(([id, label, icon], i) => (
                  <button
                    key={id}
                    className="mode-card"
                    onClick={() => {
                      setMode(id);
                      nav("study");
                    }}
                  >
                    <span className={`mode-icon tone-${i}`}>{icon}</span>
                    <h3>{label}</h3>
                    <p>
                      {
                        [
                          "Turn a question into a connection.",
                          "Find the pairs. Train your recall.",
                          "Connect terms with their meaning.",
                          "A fresh question. A little clarity.",
                          "Put the right words in place.",
                          "Think quickly. Make it stick.",
                        ][i]
                      }
                    </p>
                    <span className="mode-action">
                      Start practicing <b>↗</b>
                    </span>
                  </button>
                ))}
              </div>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">READY WHEN YOU ARE</span>
                  <h2>Explore your decks</h2>
                </div>
                {canEdit && (
                  <button
                    onClick={() => {
                      setEditing(true);
                      setPage("study");
                    }}
                  >
                    + Create deck
                  </button>
                )}
              </div>
              <div className="deck-cards">
                {sets.slice(0, 9).map((s) => (
                  <button
                    key={s.id}
                    className="deck-card panel"
                    onClick={() => loadDeck(s.id)}
                  >
                    <SubjectArtwork item={s} />
                    <SubjectIdentity item={s} />
                    <h3>{s.title}</h3>
                    <p>
                      {s.cardCount} {s.cardCount === 1 ? "card" : "cards"}{" "}
                      <span>Open deck →</span>
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}
          {page === "study" && (
            <>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">YOUR PRACTICE SPACE</span>
                  <h1>{deck?.title || "Choose your next challenge."}</h1>
                  <p className="muted">
                    Build understanding, one good question at a time.
                  </p>
                </div>
                {canEdit && (
                  <div className="controls">
                    <button onClick={() => setEditing(true)}>
                      + Create deck
                    </button>
                    {deck && !deck.builtin && (
                      <button onClick={() => setEditing(deck)}>
                        Edit deck
                      </button>
                    )}
                  </div>
                )}
              </div>
              {deck ? (
                <>
                  <div className="deck-meta">
                    <SubjectIdentity item={deck} />
                    <span className="set-identifier">Set #{deck.id}</span>
                    <span>
                      {deck.cards?.length}{" "}
                      {deck.cards?.length === 1 ? "card" : "cards"}
                    </span>
                    <span>
                      {deck.builtin
                        ? deck.id === "welcome"
                          ? "Starter set"
                          : "Curated collection"
                        : deck.visibility || "Private deck"}
                    </span>
                  </div>
                  <div
                    className="mode-tabs"
                    role="group"
                    aria-label="Practice mode"
                  >
                    {MODES.map(([id, label, icon]) => (
                      <button
                        key={id}
                        aria-pressed={id === mode}
                        className={id === mode ? "active" : ""}
                        onClick={() => setMode(id)}
                      >
                        <span>{icon}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                  {deck.subject === "mixed" && (
                    <p className="mixed-subject-notice" role="status">
                      Mixed subjects: {subjectsOf(deck).join(" + ")}. Each card
                      keeps its own subject identifier and original notation.
                    </p>
                  )}
                  {deck.cards?.length ? (
                    <Games
                      key={`${deck.id}:${mode}:${deck.roundVersion}`}
                      cards={deck.cards}
                      mode={mode}
                      onRecord={record}
                      persistRound={data?.user.role !== "cloud"}
                      sessionKey={`studycade:round:${data.user.email}:${deck.id}:${mode}`}
                      defaultSourceId={deck.documentIds?.[0]}
                      onOpenSource={openDoc}
                      onImport={() => nav("import")}
                      isStarter={deck.id === "welcome"}
                    />
                  ) : (
                    <div className="empty panel">
                      This deck has no cards yet.
                    </div>
                  )}
                  <details className="panel card-list">
                    <summary>
                      Browse all {deck.cards?.length}{" "}
                      {deck.cards?.length === 1 ? "card" : "cards"}
                    </summary>
                    {deck.cards?.map((c) => (
                      <div className="card-row" key={c.id}>
                        <Content>{c.term}</Content>
                        <div>
                          <Content>{c.definition}</Content>
                          {c.provenance && (
                            <div className="small muted">
                              Source:{" "}
                              {c.provenance.filename || "Study material"} ·{" "}
                              {c.provenance.sectionId}
                              {(c.provenance.documentId ||
                                deck.documentIds?.[0]) && (
                                <button
                                  className="text-button"
                                  onClick={() =>
                                    openDoc(
                                      c.provenance.documentId ||
                                        deck.documentIds[0],
                                      c.provenance.sectionId,
                                    )
                                  }
                                >
                                  Open source ↗
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </details>
                </>
              ) : (
                <div className="empty panel">
                  <span className="finish-icon">▧</span>
                  <h2>Your library is on the left.</h2>
                  <p>Pick a deck to explore six different ways to practice.</p>
                  {sets[0] && (
                    <button
                      className="primary"
                      onClick={() => loadDeck(sets[0].id)}
                    >
                      Start with {sets[0].title} →
                    </button>
                  )}
                </div>
              )}
            </>
          )}
          {page === "import" && (
            <Importer
              onError={report}
              onSaved={async () => {
                await refresh();
                setNotice("Material added to your library.");
              }}
            />
          )}
          {page === "notes" && (
            <Notes
              documents={data?.documents || []}
              document={document}
              openDoc={openDoc}
              setDocument={setDocument}
              onError={report}
              onImport={() => nav("import")}
              onCollectionCreated={async (id) => {
                await refresh();
                await loadDeck(id);
              }}
            />
          )}
          {page === "tutor" && (
            <PromptStudio
              documents={data?.documents || []}
              deck={deck}
              loadDocument={(id) =>
                api("/api/documents/" + encodeURIComponent(id))
              }
              onError={report}
            />
          )}
          {page === "settings" && (
            <Settings
              user={data?.user}
              onError={report}
              onRestore={async () => {
                await refresh();
                setNotice("Backup restored.");
              }}
            />
          )}
          <footer className="page-footer">
            <span>✳ StudyCade</span>
            <span>Small steps. Stronger understanding.</span>
          </footer>
        </main>
      </div>
      {editing && (
        <Editor
          guest={["guest", "cloud"].includes(data?.user.role)}
          deck={editing === true ? null : editing}
          onClose={() => setEditing(false)}
          onDeleted={async () => {
            setEditing(false);
            setDeck(null);
            await refresh();
          }}
          onSaved={async (id) => {
            setEditing(false);
            await refresh();
            loadDeck(id);
          }}
          onError={report}
        />
      )}
    </div>
  );
}
function Importer({ onError, onSaved }) {
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
            <SubjectIdentity item={item} />
          </div>
          {item.warnings?.map((w, i) => (
            <p className="warning" key={i}>
              {w}
            </p>
          ))}
          <details open>
            <summary>Read preview</summary>
            <Content>{item.source || item.content}</Content>
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
function Notes({
  documents,
  document: doc,
  openDoc,
  setDocument,
  onError,
  onImport,
  onCollectionCreated,
}) {
  const [visibleSections, setVisibleSections] = useState(25);
  useEffect(() => {
    setVisibleSections(
      Math.max(
        25,
        (doc?.sections?.findIndex((s) => s.id === doc.focusSectionId) ?? -1) +
          1,
      ),
    );
  }, [doc?.id, doc?.focusSectionId]);
  const [selectedDocs, setSelectedDocs] = useState([]),
    [collectionTitle, setCollectionTitle] = useState("Mixed-source practice"),
    [combining, setCombining] = useState(false);
  const [q, setQ] = useState(""),
    [files, setFiles] = useState([]),
    [raw, setRaw] = useState(null),
    [prompt, setPrompt] = useState(false),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    api("/api/study-files")
      .then((d) => setFiles(d.files || []))
      .catch(onError);
  }, []);
  async function review(sectionId, update) {
    try {
      const previous = Array.isArray(doc.reviews)
        ? doc.reviews.find((r) => r.sectionId === sectionId) || {}
        : doc.reviews?.[sectionId] || {};
      const r = await api(
        `/api/documents/${encodeURIComponent(doc.id)}/review`,
        {
          sectionId,
          reviewed: !!previous.reviewed,
          confidence: previous.confidence || "",
          ...update,
        },
        "PATCH",
      );
      setDocument({
        ...doc,
        reviews: r.reviews || {
          ...doc.reviews,
          [sectionId]: { ...doc.reviews?.[sectionId], ...update },
        },
      });
    } catch (e) {
      onError(e);
    }
  }
  async function openFile(f) {
    try {
      const d = await api(
        `/api/study-files/${encodeURIComponent(f.folder)}/${encodeURIComponent(f.name)}`,
      );
      setRaw(d);
      setDocument(null);
    } catch (e) {
      onError(e);
    }
  }
  const shown = doc || raw;
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">READ. RECALL. REFLECT.</span>
          <h1>{shown?.title || shown?.name || "Your study notes."}</h1>
        </div>
        <div className="controls">
          <button onClick={() => setPrompt(!prompt)}>Copy prompt</button>
          <button className="primary" onClick={onImport}>
            + Import material
          </button>
        </div>
      </div>
      {prompt && (
        <div className="panel import-panel">
          <Content>{PROMPT}</Content>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(PROMPT);
                setCopied(true);
              } catch {
                onError(
                  Error(
                    "Copy unavailable. Select the prompt text and copy it.",
                  ),
                );
              }
            }}
          >
            {copied ? "Copied ✓" : "Copy study guide prompt"}
          </button>
        </div>
      )}
      {shown ? (
        <>
          <div className="controls">
            <SubjectIdentity item={shown} />
            <button
              onClick={() => {
                setDocument(null);
                setRaw(null);
              }}
            >
              ← All notes
            </button>
            <button onClick={() => window.print()}>Print / save PDF</button>
            <label className="search">
              <input
                aria-label="Search notes"
                placeholder="Find text or section…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
          </div>
          {shown.warnings?.map((w, i) => (
            <p className="warning" key={i}>
              {w}
            </p>
          ))}
          <div className="notes-layout">
            <aside className="outline panel">
              <span className="eyebrow">ON THIS PAGE</span>
              {doc?.sections?.map((s, i) => {
                const r = Array.isArray(doc.reviews)
                  ? doc.reviews.find((r) => r.sectionId === s.id) || {}
                  : doc.reviews?.[s.id] || {};
                return (
                  <div className="outline-section" key={s.id}>
                    <a
                      href={`#section-${i}`}
                      onClick={() =>
                        setVisibleSections((n) => Math.max(n, i + 1))
                      }
                    >
                      {s.title}
                    </a>
                    <button
                      aria-pressed={!!r.reviewed}
                      onClick={() => review(s.id, { reviewed: !r.reviewed })}
                    >
                      {r.reviewed ? "✓ Reviewed" : "Mark reviewed"}
                    </button>
                    <label className="small">
                      Confidence
                      <select
                        value={r.confidence || ""}
                        onChange={(e) =>
                          review(s.id, { confidence: e.target.value })
                        }
                      >
                        <option value="">Not set</option>
                        <option value="green">Green · confident</option>
                        <option value="yellow">Yellow · practicing</option>
                        <option value="red">Red · revisit</option>
                      </select>
                    </label>
                  </div>
                );
              })}
              {!doc?.sections?.length && (
                <p className="muted small">
                  Imported notes have reviewable section outlines.
                </p>
              )}
            </aside>
            <article className="notes-paper panel">
              {doc?.sections?.length ? (
                doc.sections.slice(0, visibleSections).map((s, i) => (
                  <section
                    id={`section-${i}`}
                    data-section-id={s.id}
                    key={s.id}
                    className={
                      q &&
                      (s.title + " " + s.content)
                        .toLowerCase()
                        .includes(q.toLowerCase())
                        ? "search-hit"
                        : ""
                    }
                  >
                    {!/^\s*#{1,6}\s/.test(s.content || "") && (
                      <h2>{s.title}</h2>
                    )}
                    <Content>{s.content}</Content>
                  </section>
                ))
              ) : (
                <Content>{shown.source || shown.content}</Content>
              )}
              {doc?.sections?.length > visibleSections && (
                <div className="controls">
                  <p className="small muted">
                    Showing {visibleSections} of {doc.sections.length} sections.
                    All source material is retained.
                  </p>
                  <button onClick={() => setVisibleSections((n) => n + 25)}>
                    Load 25 more sections
                  </button>
                </div>
              )}
              {q && (
                <p role="status" className="muted small">
                  Sections containing “{q}” are highlighted.
                </p>
              )}
            </article>
          </div>
        </>
      ) : (
        <div className="document-cards">
          {documents.length > 1 && (
            <div className="panel import-panel">
              <h2>Connect ideas across your notes.</h2>
              <p className="muted small">
                Select two to twenty documents below to build one mixed-source
                practice deck. Every suggested card keeps its original source
                reference.
              </p>
              <div className="controls">
                <label>
                  Deck title
                  <input
                    value={collectionTitle}
                    onChange={(e) => setCollectionTitle(e.target.value)}
                    maxLength={100}
                  />
                </label>
                <button
                  className="primary"
                  disabled={
                    combining ||
                    selectedDocs.length < 2 ||
                    !collectionTitle.trim()
                  }
                  onClick={async () => {
                    setCombining(true);
                    try {
                      const d = await api("/api/collections", {
                        documentIds: selectedDocs,
                        title: collectionTitle,
                        visibility: "private",
                      });
                      await onCollectionCreated(d.setId || d.id);
                    } catch (e) {
                      onError(e);
                    } finally {
                      setCombining(false);
                    }
                  }}
                >
                  {combining
                    ? "Combining source material…"
                    : `Create mixed-source deck (${selectedDocs.length} selected)`}
                </button>
              </div>
            </div>
          )}
          {documents.map((d) => (
            <div className="panel document-card" key={d.id}>
              <label className="check-row">
                <input
                  type="checkbox"
                  aria-label={`Include ${d.title || d.name} in mixed-source deck`}
                  checked={selectedDocs.includes(d.id)}
                  disabled={
                    !selectedDocs.includes(d.id) && selectedDocs.length >= 20
                  }
                  onChange={(e) =>
                    setSelectedDocs(
                      e.target.checked
                        ? [...selectedDocs, d.id]
                        : selectedDocs.filter((x) => x !== d.id),
                    )
                  }
                />
              </label>
              <button className="document-open" onClick={() => openDoc(d.id)}>
                <span className="document-icon">▤</span>
                <div>
                  <SubjectIdentity item={d} />
                  <h2>{d.title || d.name}</h2>
                  <p className="muted">
                    {d.folder || "Your library"} · Open study guide →
                  </p>
                </div>
              </button>
            </div>
          ))}
          {files.map((f, i) => (
            <div className="panel saved-file" key={i}>
              <div>
                <strong>{f.name}</strong>
                <small>
                  {f.folder} · {Math.ceil(f.size / 1024)} KB
                </small>
              </div>
              <div className="controls">
                <button onClick={() => openFile(f)}>Open</button>
                <button
                  onClick={async () => {
                    if (!window.confirm(`Delete ${f.name} from ${f.folder}?`))
                      return;
                    try {
                      await api(
                        `/api/study-files/${encodeURIComponent(f.folder)}/${encodeURIComponent(f.name)}`,
                        undefined,
                        "DELETE",
                      );
                      setFiles(files.filter((x) => x !== f));
                    } catch (e) {
                      onError(e);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!documents.length && !files.length && (
            <div className="empty panel">
              <span className="finish-icon">▤</span>
              <h2>A clear place for your notes.</h2>
              <p>
                Import a study guide to read, review sections, and track your
                confidence.
              </p>
              <button className="primary" onClick={onImport}>
                Import your first notes →
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
function CloudAccount({ user, onError }) {
  const [available, setAvailable] = useState(false),
    [email, setEmail] = useState(""),
    [message, setMessage] = useState(() =>
      window.location.hash === "#cloud-sign-in-failed"
        ? "The sign-in link expired or opened in a different browser. Request a new link here and open it in this browser."
        : "",
    ),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    getDeploymentConfig()
      .then((c) => setAvailable(!!c.cloudAvailable))
      .catch(onError);
  }, []);
  useEffect(() => {
    if (window.location.hash === "#cloud-signed-out-local")
      setMessage(
        "Signed out on this device. The cloud service could not confirm session revocation. Keep exported backups safe and retry sign-in/sign-out when connectivity returns.",
      );
  }, []);
  if (!available) return null;
  const switchWorkspace = async () => {
    await clearCloudCache();
    try {
      clearDeviceSessions();
    } catch {}
    window.location.reload();
  };
  async function start(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const d = await api("/api/cloud/auth/start", { email: email.trim() });
      setMessage(
        d.message ||
          "If this email is approved for cloud access, a sign-in link has been sent.",
      );
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel import-panel cloud-account">
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR PRIVATE SYNCED WORKSPACE</span>
          <h2>
            {user?.role === "cloud"
              ? "Cloud saving is connected."
              : "Continue on your other device."}
          </h2>
        </div>
        <span className="badge">
          {user?.role === "cloud" ? "Signed in" : "Optional cloud account"}
        </span>
      </div>
      {user?.role === "cloud" ? (
        <>
          <p className="muted">
            Your notes, decks and progress save to your private cloud workspace.
            Sign in with the same approved email on your laptop or desktop.
            Guest notes stay separate until you explicitly copy them.
          </p>
          <div className="controls">
            <button
              onClick={async () => {
                if (
                  !window.confirm(
                    "Reload the latest cloud workspace? Copy any unsaved edits first; reloading will discard them.",
                  )
                )
                  return;
                setBusy(true);
                try {
                  await reloadCloudWorkspace();
                  await switchWorkspace();
                } catch (error) {
                  onError(error);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              Reload cloud workspace
            </button>
            <button
              onClick={async () => {
                if (
                  !window.confirm(
                    "Copy all guest notes, decks, files and progress from this browser into your signed-in cloud workspace? This explicitly uploads that material. Existing guest and cloud data will be kept.",
                  )
                )
                  return;
                setBusy(true);
                try {
                  const backup = await (
                    await import("./guest.js")
                  ).guestApi("/api/backup");
                  await api("/api/restore", backup);
                  await switchWorkspace();
                } catch (error) {
                  onError(error);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              Copy browser guest material into cloud
            </button>
            <button
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await api("/api/cloud/auth/logout", {});
                  if (!result.revocationConfirmed)
                    window.location.hash = "cloud-signed-out-local";
                  await switchWorkspace();
                } catch (error) {
                  onError(error);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              Sign out · return to guest
            </button>
          </div>
          <p className="small muted">
            Signing out keeps both workspaces. Cloud saves require a connection;
            failed saves are shown and never silently moved into guest storage.
          </p>
        </>
      ) : (
        <>
          <p className="muted">
            Use an approved email to receive a one-time sign-in link. Signing in
            opens a separate private cloud workspace. Nothing from this
            browser’s guest library is uploaded automatically.
          </p>
          <form className="cloud-auth-form" onSubmit={start}>
            <label htmlFor="cloud-email">
              Approved email
              <input
                id="cloud-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                maxLength={254}
              />
            </label>
            <button disabled={busy} className="primary">
              {busy ? "Please wait…" : "Email a sign-in link"}
            </button>
          </form>
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
          <p className="small muted">
            No password or sign-in token is saved in browser storage. Your email
            is used for private sign-in with Supabase. Open the link in the same
            browser that requested it on each device. You can keep using the
            guest workspace without signing in.
          </p>
        </>
      )}
    </section>
  );
}
function Settings({ user, onError, onRestore }) {
  const [users, setUsers] = useState([]),
    [audit, setAudit] = useState([]),
    [email, setEmail] = useState(""),
    [role, setRole] = useState("viewer"),
    [active, setActive] = useState(true),
    [restore, setRestore] = useState(null);
  useEffect(() => {
    if (user?.role === "admin") {
      api("/api/admin/users")
        .then((d) => setUsers(d.users || d))
        .catch(onError);
      api("/api/admin/audit")
        .then((d) => setAudit(d.events || d))
        .catch(onError);
    }
  }, [user?.role]);
  const exportData = (path, name) => async (event) => {
    if (!["guest", "cloud"].includes(user?.role)) return;
    event.preventDefault();
    try {
      downloadJson(await api(path), name);
    } catch (error) {
      onError(error);
    }
  };
  return (
    <>
      <span className="eyebrow">YOUR WORKSPACE, YOUR CONTROL</span>
      <h1>Settings & backup.</h1>
      <CloudAccount user={user} onError={onError} />
      <section className="panel import-panel">
        <h2>Keep a copy of your learning.</h2>
        <p className="muted">
          Download your study data or restore an existing StudyCade backup.
        </p>
        <div className="controls">
          <a
            className="button"
            href="/api/export"
            download
            onClick={exportData("/api/export", "studycade-export.json")}
          >
            Export study data ↓
          </a>
          <a
            className="button primary"
            href="/api/backup"
            download
            onClick={exportData("/api/backup", "studycade-backup.json")}
          >
            Download full backup ↓
          </a>
          <label className="button">
            Choose backup to restore
            <input
              type="file"
              accept=".json"
              onChange={async (e) => {
                try {
                  const f = e.target.files[0];
                  if (f) {
                    if (f.size > 20_000_000)
                      throw Error("Backup exceeds 20 MB.");
                    setRestore(JSON.parse(await f.text()));
                  }
                } catch (e) {
                  onError(e);
                }
              }}
            />
          </label>
        </div>
        {restore && (
          <div className="warning">
            <p>
              Restore this backup into this workspace? Guest and cloud restores
              add private material without replacing existing decks. Download
              your current backup first.
            </p>
            <button onClick={() => setRestore(null)}>Cancel</button>{" "}
            <button
              className="primary"
              onClick={async () => {
                try {
                  await api("/api/restore", restore);
                  setRestore(null);
                  await onRestore();
                } catch (e) {
                  onError(e);
                }
              }}
            >
              Confirm restore
            </button>
          </div>
        )}
      </section>
      <section className="panel import-panel">
        <h2>Data on this device</h2>
        <p className="muted">
          {user?.role === "guest"
            ? "Guest work is stored in this browser profile. Export a backup before using a different browser or clearing its storage. Anyone using this same browser profile can open it."
            : user?.role === "cloud"
              ? "Cloud material stays in memory while this page is open and is saved to your private account. Clearing this device cache never deletes the cloud workspace. Sign out when you finish on a shared device."
              : "Saved game sessions stay in this tab until it is closed. Clear them when you finish on a shared device."}
        </p>
        <button
          onClick={async () => {
            if (
              user?.role === "guest" &&
              !window.confirm(
                "Clear all StudyCade guest notes, decks and progress from this browser? Download a backup first. This cannot be undone.",
              )
            )
              return;
            try {
              if (user?.role === "guest")
                await (await import("./guest.js")).clearGuestData();
              if (user?.role === "cloud") await clearCloudCache();
              clearDeviceSessions();
              window.location.reload();
            } catch (error) {
              onError(error);
            }
          }}
        >
          {user?.role === "guest"
            ? "Clear guest data from this device"
            : user?.role === "cloud"
              ? "Clear this device cache · keep cloud data"
              : "Clear saved game sessions"}
        </button>
      </section>
      {user?.role === "admin" && (
        <>
          <section className="panel import-panel">
            <h2>Workspace access</h2>
            <form
              className="controls"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await api("/api/admin/users", { email, role, active });
                  const d = await api("/api/admin/users");
                  setUsers(d.users || d);
                  setEmail("");
                } catch (e) {
                  onError(e);
                }
              }}
            >
              <label>
                Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Role
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  {["viewer", "editor", "admin"].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                Active account
              </label>
              <button className="primary">Save user</button>
            </form>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.email}>
                      <td>
                        <button
                          className="text-button"
                          onClick={() => {
                            setEmail(u.email);
                            setRole(u.role);
                            setActive(!!u.active);
                          }}
                        >
                          {u.email}
                        </button>
                      </td>
                      <td>{u.role}</td>
                      <td>{u.active ? "Active" : "Inactive"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel import-panel">
            <h2>Recent account activity</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Action</th>
                    <th>Account</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.slice(0, 50).map((e, i) => (
                    <tr key={i}>
                      <td>{e.createdAt || e.timestamp || e.at}</td>
                      <td>{e.action || e.event}</td>
                      <td>{e.email || e.actor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
function Editor({ deck, onClose, onSaved, onDeleted, onError, guest = false }) {
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
createRoot(document.getElementById("root")).render(<App />);
