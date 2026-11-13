import React, { useEffect, useState, useRef, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { Content } from "./content.js";
import Importer from "./Importer.jsx";
import Editor from "./Editor.jsx";
import Settings from "./Settings.jsx";
import { stored, save, clearDeviceSessions } from "./browser.js";
import Games from "./Games.jsx";
import PromptStudio from "./PromptStudio.jsx";
import Notes from "./Notes.jsx";
import PaperPractice from "./PaperPractice.jsx";
import { RecallProvider } from "./ForcedRecall.jsx";
import { mostRecentNote, readingSection } from "./reading.js";
import { MARKDOWN_PROMPT, SUBJECT_CODES, subjectsOf } from "./prompts.js";
import { SubjectIdentity, SubjectArtwork } from "./subjects.jsx";
import { MODES } from "./engine.js";
import "katex/dist/katex.min.css";
import "./style.css";
import "./study.css";
import {
  api,
  getDeploymentConfig,
  reloadCloudWorkspace,
  clearCloudCache,
} from "./api.js";
const InteractiveExplorer = lazy(() => import("./InteractiveExplorer.jsx"));
const PROMPT = MARKDOWN_PROMPT;
function App() {
  const [data, setData] = useState(null),
    [page, setPage] = useState("home"),
    [query, setQuery] = useState(""),
    [listPage, setListPage] = useState(0),
    [deck, setDeck] = useState(null),
    [mode, setMode] = useState("paper"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [document, setDocument] = useState(null),
    [editing, setEditing] = useState(false);
  const progressQueue = useRef(Promise.resolve());
  const readingQueue = useRef(Promise.resolve());
  const lastReading = useRef(new Map());
  const documentSerial = useRef(0);
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
          MODES.some((x) => x[0] === session.mode) ? session.mode : "paper",
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
  async function saveCardStatus(card, confidence) {
    if (!deck) return;
    const setId = deck.id;
    try {
      const saved = await api(
        `/api/sets/${encodeURIComponent(setId)}/cards/${card.id}/status`,
        { confidence },
        "PATCH",
      );
      setDeck((current) =>
        current?.id === setId
          ? {
              ...current,
              cards: current.cards.map((c) =>
                c.id === card.id ? { ...c, studyStatus: saved.studyStatus } : c,
              ),
            }
          : current,
      );
    } catch (error) {
      report(error);
    }
  }
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
  function saveReading(id, sectionId, force = false) {
    const task = readingQueue.current
      .catch(() => {})
      .then(async () => {
        if (!force && lastReading.current.get(id) === sectionId) return;
        const reading = await api(
          `/api/documents/${encodeURIComponent(id)}/reading`,
          { sectionId },
          "PATCH",
        );
        lastReading.current.set(id, sectionId);
        setData((current) =>
          current
            ? {
                ...current,
                documents: current.documents.map((note) =>
                  note.id === id ? { ...note, ...reading } : note,
                ),
              }
            : current,
        );
        setDocument((current) =>
          current?.id === id ? { ...current, ...reading } : current,
        );
      });
    readingQueue.current = task;
    return task;
  }
  async function openDoc(id, sectionId) {
    const version = ++documentSerial.current;
    setBusy(true);
    try {
      const note = await api("/api/documents/" + encodeURIComponent(id));
      if (version !== documentSerial.current) return;
      const requested = sectionId || note.lastSectionId;
      const focus = readingSection(note.sections, requested);
      setDocument({ ...note, focusSectionId: focus });
      setPage("notes");
      if (focus)
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            window.document
              .querySelector(`[data-section-id="${CSS.escape(focus)}"]`)
              ?.scrollIntoView({ behavior: "instant" }),
          ),
        );
      await saveReading(id, focus, true);
    } catch (e) {
      report(e);
    } finally {
      if (version === documentSerial.current) setBusy(false);
    }
  }
  const recentNote = mostRecentNote(data?.documents || []);
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
                  <span>GAME RESULTS</span>
                  <strong>
                    {attempts ? Math.round((rights / attempts) * 100) : "—"}
                    {attempts ? "%" : ""}
                    <small>correct game answers</small>
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
              <section className="continue panel continue-notes">
                <div>
                  <span className="eyebrow">PICK UP YOUR STUDY NOTES</span>
                  <h2>{recentNote?.title || "Your next reading session"}</h2>
                  <p>
                    {recentNote
                      ? "Continue from your last section."
                      : "Open your notes and we’ll remember where you stop."}
                  </p>
                </div>
                <button
                  className="primary"
                  disabled={!data}
                  onClick={() =>
                    recentNote
                      ? openDoc(recentNote.id, recentNote.lastSectionId)
                      : (setDocument(null), nav("notes"))
                  }
                >
                  {recentNote ? "Continue reading →" : "Open study notes →"}
                </button>
              </section>
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
                          "Read, work on paper, then reveal the answer.",
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
                  {deck.cards?.length ? (
                    <Games
                      key={`${deck.id}:${mode}:${deck.roundVersion}`}
                      cards={deck.cards}
                      mode={mode}
                      onRecord={record}
                      deckTitle={deck.title}
                      onStatus={saveCardStatus}
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
                    {deck.cards?.map((c, i) => (
                      <div className="card-row" key={c.id}>
                        <PaperPractice
                          card={c}
                          number={i + 1}
                          topic={deck.title}
                          onStatus={saveCardStatus}
                          showNavigation={false}
                          onOpenSource={
                            c.provenance?.documentId || deck.documentIds?.[0]
                              ? () =>
                                  openDoc(
                                    c.provenance?.documentId ||
                                      deck.documentIds[0],
                                    c.provenance?.sectionId,
                                  )
                              : null
                          }
                        />
                      </div>
                    ))}
                  </details>
                </>
              ) : (
                <div className="empty panel">
                  <span className="finish-icon">▧</span>
                  <h2>Your library is on the left.</h2>
                  <p>
                    Pick a deck to study on paper or explore the practice games.
                  </p>
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
              sets={sets}
              openDoc={openDoc}
              onReadingProgress={saveReading}
              onRecallAttempt={async (correct, card, eventId) => {
                await api("/api/attempts", {
                  setId: card.setId,
                  cardId: card.cardId,
                  correct,
                  eventId,
                });
                await refresh();
              }}
              onDocumentsChanged={async () => {
                const next = await refresh();
                setDocument((current) =>
                  current &&
                  next.documents.some((note) => note.id === current.id)
                    ? current
                    : null,
                );
                return next;
              }}
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
createRoot(document.getElementById("root")).render(
  window.location.pathname.startsWith("/interactive/")
    ? <Suspense fallback={<main role="status" style={{ padding: "2rem" }}>Loading interactive chemistry…</main>}>
        <InteractiveExplorer />
      </Suspense>
    : <RecallProvider><App /></RecallProvider>,
);
