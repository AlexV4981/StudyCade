import React, { useEffect, useMemo, useRef, useState } from "react";
import { Content } from "./content.js";
import { MARKDOWN_PROMPT } from "./prompts.js";
import { api } from "./api.js";
import ForcedRecall from "./ForcedRecall.jsx";
import "./notes.css";
import Exams from "./Exams.jsx";
import { StudyStatus } from "./StudyStatus.js";
import { countRecall, humanTopic } from "./study.js";
import { hasSectionBody } from "./reading.js";

const fileKey = (f) => JSON.stringify([f.folder, f.name]);
const filePath = (f) =>
  `/api/study-files/${encodeURIComponent(f.folder)}/${encodeURIComponent(f.name)}`;
export default function Notes(props) {
  const [tab, setTab] = useState(props.document?.exam ? "exams" : "notes");
  useEffect(() => {
    if (props.document?.id) setTab(props.document.exam ? "exams" : "notes");
  }, [props.document?.id]);
  return (
    <>
      <div className="notes-tabs" role="group" aria-label="Study notes view">
        <button aria-pressed={tab === "notes"} onClick={() => setTab("notes")}>
          Notes
        </button>
        <button aria-pressed={tab === "exams"} onClick={() => setTab("exams")}>
          Exams
        </button>
      </div>
      {tab === "exams" ? (
        <Exams
          document={props.document}
          documents={props.documents}
          onError={props.onError}
          onDocumentsChanged={props.onDocumentsChanged}
        />
      ) : (
        <NotesReader
          {...props}
          document={props.document?.exam ? null : props.document}
        />
      )}
    </>
  );
}
function NotesReader({
  documents = [],
  document: doc,
  openDoc,
  setDocument,
  onError,
  onImport,
  onCollectionCreated,
  sets = [],
  onDocumentsChanged,
  onReadingProgress,
  onRecallAttempt,
}) {
  const studySections = useMemo(
    () => (doc?.sections || []).filter(hasSectionBody),
    [doc?.sections],
  );
  const [visibleSections, setVisibleSections] = useState(25);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [deletedDocIds, setDeletedDocIds] = useState([]);
  const activeDocuments = documents.filter(
    (item) =>
      !item.examSummary && !item.exam && !deletedDocIds.includes(item.id),
  );
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [sequence, setSequence] = useState([]);
  const [collectionTitle, setCollectionTitle] = useState(
    "Mixed-source practice",
  );
  const [combining, setCombining] = useState(false);
  const [files, setFiles] = useState([]);
  const [raw, setRaw] = useState(null);
  const [q, setQ] = useState("");
  const [prompt, setPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const paper = useRef(null);
  const lastSectionInteraction = useRef(0);
  const progressCallback = useRef(onReadingProgress);
  progressCallback.current = onReadingProgress;
  const standaloneFiles = files.filter(
    (f) =>
      !documents.some(
        (d) => d.folder === f.folder && (d.filename || d.name) === f.name,
      ),
  );
  async function refreshFiles() {
    const data = await api("/api/study-files");
    setFiles(data.files || []);
  }
  useEffect(() => {
    refreshFiles().catch(onError);
  }, []);
  useEffect(() => {
    const ids = new Set(activeDocuments.map((d) => d.id));
    setSelectedDocs((old) => old.filter((id) => ids.has(id)));
    setSequence((old) =>
      old.filter((item) => !item.documentId || ids.has(item.documentId)),
    );
  }, [documents]);
  useEffect(() => {
    setVisibleSections(
      Math.max(
        25,
        (studySections.findIndex((s) => s.id === doc.focusSectionId) ?? -1) + 1,
      ),
    );
    setQ("");
    lastSectionInteraction.current = Date.now();
    if (doc) setRaw(null);
  }, [doc?.id, doc?.focusSectionId]);
  useEffect(() => {
    if (
      !doc?.sections?.length ||
      !paper.current ||
      !progressCallback.current ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    let timer;
    let lastId;
    const visible = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting)
            visible.set(entry.target, entry.boundingClientRect.top);
          else visible.delete(entry.target);
        });
        const ordered = [...visible.keys()].sort(
          (a, b) =>
            a.getBoundingClientRect().top - b.getBoundingClientRect().top,
        );
        const atBottom =
          window.innerHeight + window.scrollY >=
          window.document.documentElement.scrollHeight - 4;
        const active = atBottom
          ? paper.current.querySelector("[data-section-id]:last-of-type")
          : ordered[0];
        const sectionId = active?.dataset.sectionId;
        clearTimeout(timer);
        if (sectionId && sectionId !== lastId)
          timer = setTimeout(() => {
            if (Date.now() - lastSectionInteraction.current < 1000) return;
            lastId = sectionId;
            Promise.resolve(
              progressCallback.current?.(doc.id, sectionId),
            ).catch(onError);
          }, 650);
      },
      { rootMargin: "-10% 0px -55% 0px", threshold: 0 },
    );
    paper.current
      .querySelectorAll("[data-section-id]")
      .forEach((section) => observer.observe(section));
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [doc?.id, visibleSections]);
  const practiceSections = useMemo(() => {
    let first = 1;
    return new Map(
      (doc?.sections || []).map((section) => {
        const count = countRecall(section.content),
          value = { count, first };
        first += count;
        return [section.id, value];
      }),
    );
  }, [doc?.sections]);
  function reviewFor(id) {
    return Array.isArray(doc.reviews)
      ? doc.reviews.find((r) => r.sectionId === id && !r.questionId) || {}
      : doc.reviews?.[id] || {};
  }
  async function review(sectionId, status, questionId) {
    const update = {
      reviewed: status.reviewed,
      confidence: status.confidence,
      ...(questionId ? { questionId } : {}),
    };
    lastSectionInteraction.current = Date.now();
    setReviewing(sectionId);
    try {
      const result = await api(
        `/api/documents/${encodeURIComponent(doc.id)}/review`,
        { sectionId, ...update },
        "PATCH",
      );
      const fallback = Array.isArray(doc.reviews)
        ? [
            ...doc.reviews.filter(
              (r) => r.sectionId !== sectionId || r.questionId !== questionId,
            ),
            { sectionId, ...update },
          ]
        : { ...doc.reviews, [sectionId]: update };
      setDocument((current) =>
        current?.id === doc.id
          ? { ...current, reviews: result.reviews || fallback }
          : current,
      );
      await progressCallback.current?.(doc.id, sectionId);
    } catch (error) {
      onError(error);
    } finally {
      setReviewing(null);
    }
  }
  async function openFile(file) {
    try {
      const result = await api(filePath(file));
      setDocument(null);
      setRaw({ ...result, folder: file.folder, name: file.name });
    } catch (error) {
      onError(error);
    }
  }
  function toggle(id, values, setter) {
    setter(
      values.includes(id) ? values.filter((x) => x !== id) : [...values, id],
    );
  }
  async function deleteSelected() {
    setDeleting(true);
    const removedDocs = new Set();
    const removedFiles = new Set();
    async function refreshRemaining() {
      const results = await Promise.allSettled([
        Promise.resolve().then(() => onDocumentsChanged?.()),
        api("/api/study-files"),
      ]);
      if (results[1].status === "fulfilled") {
        const currentFiles = (results[1].value.files || []).filter(
          (file) => !removedFiles.has(fileKey(file)),
        );
        setFiles(currentFiles);
        const keys = new Set(currentFiles.map(fileKey));
        setSelectedFiles((previous) => previous.filter((key) => keys.has(key)));
      }
      const bootstrap =
        results[0].status === "fulfilled" ? results[0].value : null;
      if (Array.isArray(bootstrap?.documents)) {
        const ids = new Set(bootstrap.documents.map((item) => item.id));
        setSelectedDocs((previous) =>
          previous.filter((id) => ids.has(id) && !removedDocs.has(id)),
        );
      }
      return results.find((result) => result.status === "rejected")?.reason;
    }
    try {
      if (selectedDocs.length) {
        await api("/api/documents/delete", { documentIds: selectedDocs });
        selectedDocs.forEach((id) => removedDocs.add(id));
        const sourceKeys = new Set(
          documents
            .filter((item) => removedDocs.has(item.id))
            .map((item) =>
              fileKey({
                folder: item.folder,
                name: item.filename || item.name,
              }),
            ),
        );
        sourceKeys.forEach((key) => removedFiles.add(key));
        setDeletedDocIds((previous) => [
          ...new Set([...previous, ...removedDocs]),
        ]);
        setSelectedDocs((previous) =>
          previous.filter((id) => !removedDocs.has(id)),
        );
        setSequence((previous) =>
          previous.filter((item) => !removedDocs.has(item.documentId)),
        );
        setFiles((previous) =>
          previous.filter((file) => !sourceKeys.has(fileKey(file))),
        );
        if (removedDocs.has(doc?.id)) setDocument(null);
      }
      for (const key of selectedFiles) {
        const file = standaloneFiles.find((item) => fileKey(item) === key);
        if (!file) continue;
        await api(filePath(file), undefined, "DELETE");
        removedFiles.add(key);
        setFiles((previous) =>
          previous.filter((item) => fileKey(item) !== key),
        );
        setSelectedFiles((previous) => previous.filter((item) => item !== key));
      }
      const refreshError = await refreshRemaining();
      if (refreshError) throw refreshError;
      setConfirmDelete(false);
    } catch (error) {
      // Reconcile partial success without masking the original deletion error.
      await refreshRemaining();
      onError(error);
    } finally {
      setDeleting(false);
    }
  }
  const shown = doc || raw;
  const totalSelected = selectedDocs.length + selectedFiles.length;
  const allSelected =
    activeDocuments.length + standaloneFiles.length > 0 &&
    selectedDocs.length === activeDocuments.length &&
    selectedFiles.length === standaloneFiles.length;
  const sequenceIndex = sequence.findIndex((item) =>
    doc
      ? item.documentId === doc.id
      : raw && item.file && fileKey(item.file) === fileKey(raw),
  );
  function openSequence(item) {
    if (!item) return;
    return item.documentId ? openDoc(item.documentId) : openFile(item.file);
  }
  function studySelected() {
    const queue = [
      ...selectedDocs.map((documentId) => ({ documentId })),
      ...standaloneFiles
        .filter((file) => selectedFiles.includes(fileKey(file)))
        .map((file) => ({ file })),
    ];
    setSequence(queue);
    openSequence(queue[0]);
  }
  return (
    <div className="notes-workspace">
      <div className="section-heading">
        <div>
          <span className="eyebrow">READ. RECALL. REFLECT.</span>
          <h1>
            {humanTopic(shown?.title || shown?.name || "Your study notes.")}
          </h1>
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
          <Content>{MARKDOWN_PROMPT}</Content>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(MARKDOWN_PROMPT);
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
          {sequenceIndex >= 0 && (
            <nav
              className="controls notes-sequence"
              aria-label="Selected notes"
            >
              <button
                disabled={sequenceIndex === 0}
                onClick={() => openSequence(sequence[sequenceIndex - 1])}
              >
                ← Previous note
              </button>
              <span>
                Note {sequenceIndex + 1} of {sequence.length}
              </span>
              <button
                disabled={sequenceIndex === sequence.length - 1}
                onClick={() => openSequence(sequence[sequenceIndex + 1])}
              >
                Next note →
              </button>
            </nav>
          )}
          {shown.warnings?.length > 0 && (
            <details className="reader-import-notes">
              <summary>Import notes</summary>
              {shown.warnings.map((warning, i) => (
                <p className="warning" key={i}>
                  {warning}
                </p>
              ))}
            </details>
          )}
          <details className="reader-recall">
            <summary>Optional timed recall</summary>
            <ForcedRecall
              sets={sets}
              onError={onError}
              onRecord={onRecallAttempt}
            />
          </details>
          <article
            key={doc?.id || fileKey(raw || {})}
            ref={paper}
            className="notes-paper panel notes-reader"
          >
            {doc?.sections?.length ? (
              studySections.slice(0, visibleSections).map((section, i) => (
                <section
                  id={`section-${i}`}
                  data-section-id={section.id}
                  key={section.id}
                  className={
                    q &&
                    `${section.title} ${section.content}`
                      .toLowerCase()
                      .includes(q.toLowerCase())
                      ? "search-hit"
                      : ""
                  }
                >
                  {!/^\s*#{1,6}\s/.test(section.content || "") && (
                    <h2>{humanTopic(section.title)}</h2>
                  )}
                  <Content
                    study={{
                      sectionId: section.id,
                      topic: section.title,
                      reviews: Array.isArray(doc.reviews) ? doc.reviews : [],
                      startNumber: practiceSections.get(section.id)?.first || 1,
                      questionCount:
                        practiceSections.get(section.id)?.count || 0,
                      onReview: review,
                      disabled: reviewing !== null,
                    }}
                  >
                    {section.content}
                  </Content>
                  {!practiceSections.get(section.id)?.count && (
                    <StudyStatus
                      value={reviewFor(section.id)}
                      onChange={(status) => review(section.id, status)}
                      disabled={reviewing !== null}
                      label={`Status for ${humanTopic(section.title)}`}
                    />
                  )}
                </section>
              ))
            ) : (
              <Content
                study={{
                  topic: shown.title || shown.name,
                  questionCount: countRecall(shown.source || shown.content),
                  reviews: [],
                }}
              >
                {shown.source || shown.content}
              </Content>
            )}
            {studySections.length > visibleSections && (
              <div className="controls">
                <p className="small muted">
                  Showing {visibleSections} of {studySections.length} sections.
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
        </>
      ) : (
        <>
          {(activeDocuments.length > 0 || standaloneFiles.length > 0) && (
            <div className="panel notes-selection">
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => {
                    setSelectedDocs(
                      e.target.checked ? activeDocuments.map((d) => d.id) : [],
                    );
                    setSelectedFiles(
                      e.target.checked ? standaloneFiles.map(fileKey) : [],
                    );
                  }}
                />
                Select all notes and files
              </label>
              {totalSelected > 0 && (
                <div
                  className="controls"
                  role="toolbar"
                  aria-label="Selected notes actions"
                >
                  <span>{totalSelected} selected</span>
                  <button className="primary" onClick={studySelected}>
                    Study selected ({totalSelected})
                  </button>
                  <button onClick={() => setConfirmDelete(true)}>
                    Delete selected
                  </button>
                </div>
              )}
            </div>
          )}
          {confirmDelete && (
            <div
              className="panel notes-delete-confirm"
              role="alertdialog"
              aria-labelledby="delete-notes-title"
              aria-describedby="delete-notes-description"
            >
              <h2 id="delete-notes-title">
                Delete {totalSelected} selected{" "}
                {totalSelected === 1 ? "item" : "items"}?
              </h2>
              <p id="delete-notes-description">
                The selected notes and their saved source files will be removed.
                This cannot be undone.
              </p>
              <div className="controls">
                <button
                  autoFocus
                  disabled={deleting}
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </button>
                <button disabled={deleting} onClick={deleteSelected}>
                  {deleting ? "Deleting…" : "Delete selected items"}
                </button>
              </div>
            </div>
          )}
          <div className="document-cards">
            {activeDocuments.map((item) => (
              <div className="panel document-card" key={item.id}>
                <label className="check-row">
                  <input
                    type="checkbox"
                    aria-label={`Select ${item.title || item.name}`}
                    checked={selectedDocs.includes(item.id)}
                    onChange={() =>
                      toggle(item.id, selectedDocs, setSelectedDocs)
                    }
                  />
                </label>
                <button
                  className="document-open"
                  onClick={() => {
                    setSequence([]);
                    openDoc(item.id);
                  }}
                >
                  <span className="document-icon" aria-hidden="true">
                    ▤
                  </span>
                  <div>
                    <h2>{item.title || item.name}</h2>
                    <p className="muted">Open study guide →</p>
                  </div>
                </button>
              </div>
            ))}
            {standaloneFiles.map((file) => (
              <div className="panel saved-file" key={fileKey(file)}>
                <label className="check-row">
                  <input
                    type="checkbox"
                    aria-label={`Select ${file.name}`}
                    checked={selectedFiles.includes(fileKey(file))}
                    onChange={() =>
                      toggle(fileKey(file), selectedFiles, setSelectedFiles)
                    }
                  />
                </label>
                <div>
                  <strong>{file.name}</strong>
                  <small>{Math.ceil(file.size / 1024)} KB</small>
                </div>
                <button
                  onClick={() => {
                    setSequence([]);
                    openFile(file);
                  }}
                >
                  Open
                </button>
              </div>
            ))}
            {!activeDocuments.length && !standaloneFiles.length && (
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
          {activeDocuments.length > 1 && (
            <details className="panel notes-combine">
              <summary>Create a mixed-source practice deck</summary>
              <p className="muted small">
                Select two to twenty notes to combine into a deck. Study
                selected opens your notes directly.
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
                    selectedDocs.length > 20 ||
                    !collectionTitle.trim()
                  }
                  onClick={async () => {
                    setCombining(true);
                    try {
                      const result = await api("/api/collections", {
                        documentIds: selectedDocs,
                        title: collectionTitle,
                        visibility: "private",
                      });
                      await onCollectionCreated(result.setId || result.id);
                    } catch (error) {
                      onError(error);
                    } finally {
                      setCombining(false);
                    }
                  }}
                >
                  {combining
                    ? "Combining source material…"
                    : `Create mixed-source deck (${selectedDocs.length} notes)`}
                </button>
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
