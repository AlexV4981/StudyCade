const validQuestion = (v) =>
  typeof v === "string" &&
  /^q[1-9]\d{0,3}$/.test(v) &&
  Number(v.slice(1)) <= 2000;
import { SUBJECT_CODES } from "./prompts.js";
import { validateExam, updateExam, examSummary } from "./exam.js";
/** Browser-only guest workspace. Nothing here sends stored material to a server. */
export const GUEST_USER = Object.freeze({
  email: "guest@studycade.local",
  role: "guest",
  displayName: "Guest",
});
const DB_NAME = "studycade-guest-v1",
  STORE = "workspace";
const storeQueues = new WeakMap();
const clone = (value) => JSON.parse(JSON.stringify(value));
const bad = (message) => {
  throw Error(message);
};
const bytes = (value) =>
  new TextEncoder().encode(
    typeof value === "string" ? value : JSON.stringify(value),
  ).length;
function safe(value, depth = 0) {
  if (depth > 32) bad("Data is nested too deeply.");
  if (
    value === undefined ||
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  )
    return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) bad("Invalid numeric data.");
    return;
  }
  if (
    typeof value !== "object" ||
    (!Array.isArray(value) &&
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
  )
    bad("Invalid data object.");
  for (const key of Object.keys(value)) {
    if (["__proto__", "prototype", "constructor"].includes(key))
      bad("Unsafe object key in data.");
    safe(value[key], depth + 1);
  }
}
function text(value, label, max, empty = false) {
  if (
    typeof value !== "string" ||
    (!empty && !value.trim()) ||
    value.length > max
  )
    bad(`${label} must be ${empty ? "0" : "1"}–${max} characters.`);
  return value.trim();
}
function filename(value) {
  value = text(value, "File or folder name", 160);
  if (/[\\/\x00-\x1f]/.test(value) || value === "." || value === "..")
    bad("Choose a plain file or folder name without path separators.");
  return value;
}
function privateOnly(body) {
  if (body.visibility && body.visibility !== "private")
    bad(
      "Guest material is private to this browser. Shared visibility is unavailable.",
    );
}
const SUBJECTS = new Set(Object.keys(SUBJECT_CODES));
function subject(value = "general") {
  if (!SUBJECTS.has(value)) bad("Choose a supported subject.");
  return value;
}
function labels(values) {
  const concrete = [
    ...new Set(
      values.filter(
        (v) => SUBJECTS.has(v) && !["general", "mixed"].includes(v),
      ),
    ),
  ];
  const subjects = concrete.length
    ? concrete
    : values.includes("mixed")
      ? ["mixed"]
      : ["general"];
  const primary = subjects.length === 1 ? subjects[0] : "mixed";
  return {
    subject: primary,
    subjectIdentifier: SUBJECT_CODES[primary],
    subjects,
  };
}
function labelsOf(value, fallback = "general") {
  if (value.subject) subject(value.subject);
  if (value.subjects !== undefined) {
    boundedArray(value.subjects, 12, "subject labels");
    value.subjects.forEach(subject);
  }
  const provided = value.subjects?.length
    ? value.subjects
    : value.subject
      ? [value.subject]
      : [fallback];
  return labels(provided);
}
function warnings(value = []) {
  return boundedArray(value, 1000, "warnings").map((w) =>
    text(w, "Warning", 5000),
  );
}
function setLabels(set, extra = []) {
  const result = labels([
    ...extra,
    ...set.cards.flatMap((c) => c.subjects || [c.subject || "general"]),
  ]);
  Object.assign(set, result);
  set.warnings = warnings(set.warnings || []);
  if (
    result.subject === "mixed" &&
    !set.warnings.some((w) => w.startsWith("Mixed subjects:"))
  )
    set.warnings.push(
      "Mixed subjects: each card keeps its own subject identifier.",
    );
  return set;
}
function boundedArray(value, max, label) {
  if (!Array.isArray(value) || value.length > max)
    bad(`Invalid ${label}; maximum ${max} items.`);
  return value;
}
const id = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
const now = () => new Date().toISOString();
function emptyState() {
  return {
    version: 1,
    nextCard: 2,
    sets: [
      {
        id: "welcome",
        title: "Welcome",
        owner: GUEST_USER.email,
        visibility: "private",
        builtin: true,
        subject: "general",
        subjectIdentifier: "GEN",
        subjects: ["general"],
        warnings: [],
        documentIds: [],
        source: "Welcome",
        cards: [
          {
            id: 1,
            term: "CARD",
            definition: "CARD",
            explanation: "",
            hints: [],
            subject: "general",
            subjectIdentifier: "GEN",
            subjects: ["general"],
          },
        ],
      },
    ],
    documents: [],
    files: [],
    progress: [],
    attempts: [],
    schedules: [],
  };
}
export function createIndexedDBStorage(name = DB_NAME) {
  let connection;
  async function db() {
    if (!globalThis.indexedDB)
      bad(
        "Browser storage is unavailable. Allow IndexedDB or use another browser to save guest work.",
      );
    if (!connection)
      connection = new Promise((resolve, reject) => {
        const request = indexedDB.open(name, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(
            Error(
              "Guest storage could not be opened. Check browser privacy settings.",
            ),
          );
        request.onblocked = () =>
          reject(
            Error(
              "Guest storage is blocked by another tab. Close other StudyCade tabs and retry.",
            ),
          );
      });
    return connection;
  }
  async function transaction(mode, action) {
    const database = await db();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE, mode);
      let value;
      const request = action(tx.objectStore(STORE));
      if (request)
        request.onsuccess = () => {
          value = request.result;
        };
      tx.oncomplete = () => resolve(value);
      tx.onabort = tx.onerror = () =>
        reject(
          Error(
            "Guest work could not be saved. Browser storage may be full or unavailable. Export a backup before clearing data.",
          ),
        );
    });
  }
  return {
    get: () => transaction("readonly", (store) => store.get("state")),
    set: (value) =>
      transaction("readwrite", (store) => store.put(value, "state")),
    clear: () => transaction("readwrite", (store) => store.clear()),
    withLock: (work) =>
      globalThis.navigator?.locks
        ? globalThis.navigator.locks.request(`studycade:${name}`, work)
        : work(),
  };
}
function cardsFrom(body, state, minimum = 1) {
  const input = boundedArray(body.cards, 2000, "cards");
  if (input.length < minimum) bad("Add at least one card.");
  const terms = new Set();
  return input.map((c) => {
    if (!c || typeof c !== "object" || bytes(c) > 100000)
      bad("Invalid or oversized card.");
    const term = text(c.term, "Term", 10000),
      definition = text(c.definition, "Definition", 20000);
    const key = term.toLowerCase();
    if (terms.has(key)) bad("Card terms must be unique.");
    terms.add(key);
    if (
      c.studyStatus !== undefined &&
      !["red", "yellow", "green"].includes(c.studyStatus)
    )
      bad("Invalid study status.");
    const out = {
      id: state.nextCard++,
      term,
      definition,
      studyStatus: c.studyStatus ?? "red",
    };
    out.explanation =
      c.explanation === undefined
        ? ""
        : text(c.explanation, "Card explanation", 20000, true);
    out.hints = boundedArray(
      c.hints === undefined ? [] : c.hints,
      50,
      "card hints",
    ).map((v) => text(v, "Card hint", 10000, true));
    out.tags = boundedArray(
      c.tags === undefined ? [] : c.tags,
      100,
      "card tags",
    ).map((v) => text(v, "Card tag", 100, true));
    if (c.difficulty !== undefined)
      out.difficulty = text(c.difficulty, "Card difficulty", 100, true);
    if (c.originalTerm !== undefined)
      out.originalTerm = text(
        c.originalTerm,
        "Original card term",
        10000,
        true,
      );
    if (c.topics !== undefined)
      out.topics = boundedArray(c.topics, 100, "card topics").map((v) =>
        text(v, "Card topic", 200, true),
      );
    if (c.metadata !== undefined) {
      if (
        !c.metadata ||
        Array.isArray(c.metadata) ||
        typeof c.metadata !== "object"
      )
        bad("Card metadata must be an object.");
      out.metadata = clone(c.metadata);
    }
    if (c.provenance !== undefined) {
      if (
        !c.provenance ||
        Array.isArray(c.provenance) ||
        typeof c.provenance !== "object"
      )
        bad("Card provenance must be an object.");
      out.provenance = clone(c.provenance);
      for (const [key, limit] of [
        ["filename", 160],
        ["sectionId", 200],
        ["documentId", 150],
        ["method", 100],
      ]) {
        if (c.provenance[key] !== undefined)
          out.provenance[key] = text(c.provenance[key], `Source ${key}`, limit);
      }
      for (const key of ["lineStart", "lineEnd"])
        if (
          c.provenance[key] !== undefined &&
          (!Number.isInteger(c.provenance[key]) ||
            c.provenance[key] < 1 ||
            c.provenance[key] > 2000000)
        )
          bad("Source line numbers must be positive integers.");
      if (
        c.provenance.generated !== undefined &&
        typeof c.provenance.generated !== "boolean"
      )
        bad("Source generation status must be a boolean.");
    }
    Object.assign(out, labelsOf(c, body.subject || "general"));
    out.warnings = warnings(c.warnings || []);
    return out;
  });
}
function newSet(state, body) {
  privateOnly(body);
  const set = {
    id: id(),
    title: text(body.title, "Deck title", 100),
    visibility: "private",
    owner: GUEST_USER.email,
    builtin: false,
    subject: subject(body.subject || "general"),
    documentIds: boundedArray(
      body.documentIds || [],
      250,
      "document links",
    ).map(String),
    source: "Browser-local guest material",
    cards: cardsFrom(body, state),
  };
  if (set.documentIds.some((d) => !state.documents.some((doc) => doc.id === d)))
    bad("Unknown source document.");
  setLabels(set, labelsOf(body).subjects);
  set.warnings = [
    ...new Set([...set.warnings, ...warnings(body.warnings || [])]),
  ];
  state.sets.push(set);
  return set;
}
function summary(set) {
  const { cards, ...rest } = set;
  return { ...rest, cardCount: cards.length };
}
function requireSet(state, key) {
  return (
    state.sets.find((s) => s.id === key) ||
    bad("Deck not found in this browser.")
  );
}
function requireDoc(state, key) {
  return (
    state.documents.find((d) => d.id === key) ||
    bad("Document not found in this browser.")
  );
}
function addProgress(state, setId, right, wrong) {
  const row = state.progress.find((p) => p.setId === setId);
  if (row) {
    row.right += right;
    row.wrong += wrong;
  } else state.progress.push({ setId, right, wrong });
}
function normalizeSections(value, fallback = "general") {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      bad("Invalid document sections.");
    }
  }
  safe(value);
  return boundedArray(value || [], 2000, "sections").map((s, i) => ({
    id: text(
      s.id === undefined ? `section-${i + 1}` : s.id,
      "Section identifier",
      200,
    ),
    title: text(s.title || "Section", "Section title", 1000),
    content:
      typeof s.content === "string" && bytes(s.content) <= 2000000
        ? s.content
        : bad("Section content must be text."),
    level:
      Number.isInteger(s.level) && s.level >= 1 && s.level <= 6 ? s.level : 2,
    ...labelsOf(s, fallback),
    warnings: warnings(s.warnings || []),
  }));
}
function sourceText(body) {
  filename(body.name);
  if (typeof body.content !== "string" || bytes(body.content) > 2_000_000)
    bad("Choose source text under 2 MB.");
  if (!/\.(md|markdown|txt|csv|tsv)$/i.test(body.name))
    bad("Choose Markdown, text, CSV or TSV.");
  if (body.subject) subject(body.subject);
}
function backupPayload(state) {
  return {
    version: 2,
    mode: "guest",
    exportedAt: now(),
    sets: state.sets,
    documents: state.documents,
    files: state.files,
    progress: state.progress,
    attempts: state.attempts,
    schedules: state.schedules,
    reviews: state.documents.flatMap((d) =>
      d.reviews.map((r) => ({ ...r, documentId: d.id })),
    ),
  };
}
function validateState(s) {
  safe(s);
  if (s.version !== 1 || bytes(s) > 40_000_000)
    bad("Guest storage is damaged or exceeds the local workspace limit.");
  for (const k of [
    "sets",
    "documents",
    "files",
    "progress",
    "attempts",
    "schedules",
  ])
    if (!Array.isArray(s[k]))
      bad("Guest storage is damaged. Restore a backup or clear guest data.");
  if (!Number.isSafeInteger(s.nextCard) || s.nextCard < 1)
    bad("Guest storage is damaged.");
  return s;
}
async function defaultPreview(body) {
  const r = await fetch("/api/import/preview", {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.headers.get("content-type")?.includes("application/json"))
    bad(
      "The transient text preview service is unavailable. Retry later; your browser material is unchanged.",
    );
  const d = await r.json();
  if (!r.ok) bad(d.error || "Text preview failed.");
  return d;
}
/** Injectable storage is an asynchronous {get,set,clear} snapshot store; preview is explicit transient processing. */
export function createGuestApi({
  storage = createIndexedDBStorage(),
  preview = defaultPreview,
} = {}) {
  const previews = [];
  async function run(path, body, method) {
    method = method || (body ? "POST" : "GET");
    if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method))
      bad("Unsupported guest request.");
    if (
      typeof path !== "string" ||
      !path.startsWith("/api/") ||
      path.includes("?")
    )
      bad("Invalid guest API path.");
    if (path.startsWith("/api/admin"))
      bad("Account administration is unavailable in browser-local guest mode.");
    if (body !== undefined) {
      safe(body);
      if (bytes(body) > (path === "/api/restore" ? 20_000_000 : 5_000_000))
        bad("Request is too large.");
      body = clone(body);
    }
    if (path === "/api/deployment" && method === "GET")
      return { mode: "guest" };
    if (path === "/api/import/preview" && method === "POST") {
      sourceText(body);
      const result = await preview(clone(body));
      safe(result);
      if (bytes(result) > 5_000_000) bad("The preview response is too large.");
      previews.push({
        name: body.name,
        content: body.content,
        subject: body.subject || "",
        kind: body.kind || "notes",
        result: clone(result),
      });
      if (previews.length > 10) previews.shift();
      return clone(result);
    }
    let state = await storage.get();
    if (state === undefined || state === null) {
      state = emptyState();
      await storage.set(clone(state));
    } else state = validateState(clone(state));
    const parts = path
      .slice(5)
      .split("/")
      .map((p) => {
        try {
          return decodeURIComponent(p);
        } catch {
          bad("Invalid encoded path.");
        }
      });
    const route = parts[0];
    let answer,
      write = method !== "GET";
    if (path === "/api/bootstrap" && method === "GET")
      answer = {
        user: GUEST_USER,
        sets: state.sets.map(summary),
        documents: state.documents.map(
          ({ content, source, reviews, cards, exam, ...d }) => ({
            ...d,
            ...(exam ? { examSummary: examSummary(exam) } : {}),
          }),
        ),
        progress: state.progress,
      };
    else if (path === "/api/sets" && method === "GET")
      answer = { sets: state.sets.map(summary) };
    else if (path === "/api/sets" && method === "POST") {
      const set = newSet(state, body);
      answer = { id: set.id, setId: set.id, ...summary(set) };
    } else if (
      route === "sets" &&
      parts.length === 5 &&
      parts[2] === "cards" &&
      parts[4] === "status" &&
      method === "PATCH"
    ) {
      const set = requireSet(state, parts[1]);
      const card = set.cards.find((c) => String(c.id) === parts[3]);
      if (!card) bad("Card not found.");
      if (!["red", "yellow", "green"].includes(body.confidence))
        bad("Invalid study status.");
      card.studyStatus = body.confidence;
      answer = { studyStatus: card.studyStatus };
    } else if (route === "sets" && parts.length === 2) {
      const set = requireSet(state, parts[1]);
      if (method === "GET")
        answer = {
          ...set,
          cards: set.cards.map((c) => ({
            ...c,
            studyStatus: c.studyStatus ?? "red",
          })),
        };
      else if (method === "DELETE") {
        if (set.builtin) bad("The Welcome deck is read-only.");
        state.sets = state.sets.filter((s) => s !== set);
        state.progress = state.progress.filter((p) => p.setId !== set.id);
        state.attempts = state.attempts.filter((a) => a.setId !== set.id);
        const ids = new Set(set.cards.map((c) => c.id));
        state.schedules = state.schedules.filter((s) => !ids.has(s.cardId));
        answer = { deleted: true };
      } else if (method === "PUT") {
        if (set.builtin) bad("The Welcome deck is read-only.");
        privateOnly(body);
        const oldIds = new Set(set.cards.map((c) => c.id));
        const next = cardsFrom(body, state);
        next.forEach((c, i) => {
          const previous = set.cards.find((old) => old.id === body.cards[i].id);
          if (previous) {
            c.id = previous.id;
            c.studyStatus = previous.studyStatus ?? "red";
          }
        });
        Object.assign(set, {
          title: text(body.title, "Deck title", 100),
          subject: subject(body.subject || set.subject),
          cards: next,
        });
        setLabels(set, labelsOf(body, set.subject).subjects);
        if (body.documentIds) {
          boundedArray(body.documentIds, 250, "document links");
          if (
            body.documentIds.some(
              (d) => !state.documents.some((doc) => doc.id === d),
            )
          )
            bad("Unknown source document.");
          set.documentIds = [...body.documentIds];
        }
        const retained = new Set(next.map((c) => c.id));
        state.attempts = state.attempts.filter(
          (a) => !oldIds.has(a.cardId) || retained.has(a.cardId),
        );
        state.schedules = state.schedules.filter(
          (a) => !oldIds.has(a.cardId) || retained.has(a.cardId),
        );
        answer = { id: set.id };
      } else bad("Unsupported deck request.");
    } else if (
      route === "documents" &&
      ((parts.length === 2 && method === "DELETE") ||
        (path === "/api/documents/delete" && method === "POST"))
    ) {
      const identifiers =
        method === "DELETE"
          ? [parts[1]]
          : boundedArray(body.documentIds, 250, "documents");
      if (
        !identifiers.length ||
        new Set(identifiers).size !== identifiers.length
      )
        bad("Choose distinct documents.");
      const removed = identifiers.map((key) => requireDoc(state, key));
      const ids = new Set(identifiers);
      const removedCards = new Set(
        removed.flatMap((doc) => (doc.cards || []).map((card) => card.id)),
      );
      state.documents = state.documents.filter((doc) => !ids.has(doc.id));
      state.files = state.files.filter(
        (file) =>
          !removed.some(
            (doc) =>
              doc.folder === file.folder &&
              (doc.filename || doc.name) === file.name,
          ) ||
          state.documents.some(
            (doc) =>
              doc.folder === file.folder &&
              (doc.filename || doc.name) === file.name,
          ),
      );
      for (const container of [...state.sets, ...state.documents]) {
        if (container.documentIds)
          container.documentIds = container.documentIds.filter(
            (key) => !ids.has(key),
          );
        for (const card of container.cards || [])
          if (ids.has(card.provenance?.documentId)) {
            delete card.provenance.documentId;
            delete card.provenance.sectionId;
          }
      }
      state.schedules = state.schedules.filter(
        (entry) => !removedCards.has(entry.cardId),
      );
      answer = { deleted: true, documentIds: identifiers };
    } else if (route === "documents" && parts.length >= 2) {
      const doc = requireDoc(state, parts[1]);
      if (parts.length === 2 && method === "GET") answer = doc;
      else if (
        parts.length === 3 &&
        parts[2] === "exam" &&
        method === "PATCH"
      ) {
        if (!doc.exam) bad("Exam not found.");
        doc.exam = updateExam(doc.exam, body);
        answer = { exam: doc.exam };
      } else if (
        parts.length === 3 &&
        parts[2] === "reading" &&
        method === "PATCH"
      ) {
        if (
          body.sectionId !== null &&
          !doc.sections.some((section) => section.id === body.sectionId)
        )
          bad("Unknown document section.");
        doc.lastSectionId = body.sectionId;
        doc.lastReadAt = now();
        answer = {
          lastSectionId: doc.lastSectionId,
          lastReadAt: doc.lastReadAt,
        };
      } else if (
        parts[2] === "review" &&
        parts.length === 3 &&
        method === "PATCH"
      ) {
        for (const change of boundedArray(
          body.reviews || [body],
          2000,
          "reviews",
        )) {
          if (!doc.sections.some((s) => s.id === change.sectionId))
            bad("Unknown document section.");
          if (
            change.questionId !== undefined &&
            !validQuestion(change.questionId)
          )
            bad("Invalid question identifier.");
          const reviewed = change.reviewed ?? false,
            confidence = change.confidence || "";
          if (
            typeof reviewed !== "boolean" ||
            !["", "red", "yellow", "green"].includes(confidence)
          )
            bad("Invalid review state.");
          doc.reviews = doc.reviews.filter(
            (r) =>
              r.sectionId !== change.sectionId ||
              r.questionId !== change.questionId,
          );
          doc.reviews.push({
            sectionId: change.sectionId,
            ...(change.questionId === undefined
              ? {}
              : { questionId: change.questionId }),
            reviewed,
            confidence,
          });
        }
        if (doc.reviews.length > 4000) bad("Too many reviews.");
        answer = { reviews: doc.reviews };
      } else bad("Unsupported document request.");
    } else if (path === "/api/import/commit" && method === "POST") {
      sourceText(body);
      privateOnly(body);
      if (!["notes", "deck", "practice", "exam"].includes(body.mode || "notes"))
        bad("Choose notes, deck or practice.");
      const folder = filename(body.folder),
        name = filename(body.name);
      if (state.files.some((f) => f.folder === folder && f.name === name))
        bad(
          "A file with this name already exists in this folder. Rename it before importing.",
        );
      const cached = [...previews]
        .reverse()
        .find(
          (p) =>
            p.name === name &&
            p.kind === (body.mode === "exam" ? "exam" : "notes") &&
            p.content === body.content &&
            (!body.subject ||
              p.subject === body.subject ||
              p.result.subject === body.subject),
        );
      if (!cached)
        bad(
          "Preview this file before saving it. A fresh preview is required after changing its source or subject.",
        );
      const parsed = cached.result;
      const exam =
        body.mode === "exam" ? validateExam(clone(parsed.exam)) : null;
      const documentId = id();
      const docLabels = labelsOf(parsed, body.subject || "general");
      const sections = normalizeSections(parsed.sections, docLabels.subject);
      const generated = boundedArray(
        body.mode === "exam" ? [] : body.cards || parsed.cards || [],
        2000,
        "suggested cards",
      ).map((c) => ({
        ...c,
        ...labelsOf(
          c,
          sections.find((s) => s.id === c.provenance?.sectionId)?.subject ||
            docLabels.subject,
        ),
        provenance: { ...(c.provenance || {}), documentId, filename: name },
      }));
      const doc = {
        id: documentId,
        title: text(body.title || parsed.title || name, "Document title", 200),
        ...docLabels,
        name,
        filename: name,
        folder,
        content: body.content,
        source: body.content,
        hash: String(parsed.hash || ""),
        sections,
        warnings: warnings(parsed.warnings || []),
        reviews: [],
        cards: generated.length
          ? cardsFrom({ cards: generated, subject: docLabels.subject }, state)
          : [],
        createdAt: now(),
        ...(exam ? { exam, cards: [] } : {}),
      };
      state.documents.push(doc);
      state.files.push({
        folder,
        name,
        content: body.content,
        size: bytes(body.content),
      });
      answer = { documentId };
      if (["deck", "practice"].includes(body.mode)) {
        const set = newSet(state, {
          title: doc.title.slice(0, 100),
          subject: doc.subject,
          subjects: doc.subjects,
          warnings: doc.warnings,
          cards: generated,
          documentIds: [documentId],
        });
        answer.setId = set.id;
      }
    } else if (path === "/api/collections" && method === "POST") {
      privateOnly(body);
      const ids = boundedArray(body.documentIds, 20, "source documents");
      if (ids.length < 2 || new Set(ids).size !== ids.length)
        bad("Choose two to twenty distinct source documents.");
      const docs = ids.map((d) => requireDoc(state, d));
      let cards = [];
      const seen = new Set(),
        terms = new Set();
      for (const doc of docs) {
        const suggestions = doc.cards || [];
        for (const c of suggestions) {
          const pair = JSON.stringify([c.term, c.definition]);
          if (seen.has(pair)) continue;
          seen.add(pair);
          let term = c.term;
          if (terms.has(term.toLowerCase())) term = `${term} — ${doc.filename}`;
          let n = 2,
            base = term;
          while (terms.has(term.toLowerCase())) term = `${base} (${n++})`;
          terms.add(term.toLowerCase());
          cards.push({
            ...c,
            term,
            ...(term !== c.term ? { originalTerm: c.term } : {}),
            provenance: {
              ...(c.provenance || {}),
              documentId: doc.id,
              filename: doc.filename,
            },
          });
        }
      }
      if (!cards.length)
        bad(
          "These sources have no extractable question–answer pairs. Add explicit questions and answers, then import again.",
        );
      const set = newSet(state, {
        ...body,
        cards,
        ...labels(docs.flatMap((d) => d.subjects || [d.subject])),
        warnings: docs.flatMap((d) => d.warnings || []),
      });
      answer = { id: set.id, setId: set.id };
    } else if (path === "/api/attempts" && method === "POST") {
      const set = requireSet(state, body.setId);
      if (
        !set.cards.some((c) => c.id === body.cardId) ||
        typeof body.correct !== "boolean" ||
        !["", "low", "medium", "high", "green", "yellow", "red"].includes(
          body.confidence || "",
        )
      )
        bad("Invalid card attempt.");
      const eventId = text(body.eventId, "Attempt identifier", 120);
      const existing = state.attempts.find((a) => a.eventId === eventId);
      if (existing) {
        if (
          existing.cardId !== body.cardId ||
          existing.correct !== body.correct ||
          existing.setId !== body.setId ||
          existing.confidence !== (body.confidence || "")
        )
          bad("Attempt identifier already used.");
        answer = { recorded: true, duplicate: true };
      } else {
        if (state.attempts.length >= 100000)
          bad(
            "Guest attempt limit reached. Export a backup before clearing your history.",
          );
        state.attempts.push({
          setId: set.id,
          cardId: body.cardId,
          correct: body.correct,
          confidence: body.confidence || "",
          eventId,
          createdAt: now(),
        });
        addProgress(state, set.id, Number(body.correct), Number(!body.correct));
        const previous = state.schedules.find((s) => s.cardId === body.cardId),
          repetitions = body.correct ? (previous?.repetitions || 0) + 1 : 0,
          intervalDays = body.correct
            ? repetitions === 1
              ? 1
              : repetitions === 2
                ? 3
                : Math.min(365, (previous?.intervalDays || 3) * 2)
            : 0;
        const schedule = {
          cardId: body.cardId,
          repetitions,
          intervalDays,
          ease: 2.5,
          dueAt: new Date(Date.now() + intervalDays * 86400000).toISOString(),
        };
        state.schedules = state.schedules.filter(
          (s) => s.cardId !== body.cardId,
        );
        state.schedules.push(schedule);
        answer = { recorded: true, schedule };
      }
    } else if (path === "/api/progress" && method === "POST") {
      requireSet(state, body.setId);
      if (
        ![0, 1].includes(body.right) ||
        ![0, 1].includes(body.wrong) ||
        body.right + body.wrong !== 1
      )
        bad("Record exactly one correct or incorrect answer.");
      addProgress(state, body.setId, body.right, body.wrong);
      answer = { saved: true };
    } else if (path === "/api/study-files" && method === "GET")
      answer = {
        account: GUEST_USER.email,
        files: state.files.map(({ content, ...f }) => f),
      };
    else if (path === "/api/study-files" && method === "POST") {
      filename(body.folder);
      sourceText(body);
      const file = {
        folder: body.folder,
        name: body.name,
        content: body.content,
        size: bytes(body.content),
      };
      const previous = state.files.findIndex(
        (f) => f.folder === file.folder && f.name === file.name,
      );
      if (previous < 0) state.files.push(file);
      else state.files[previous] = file;
      answer = { saved: true, ...file };
    } else if (route === "study-files" && parts.length === 3) {
      const folder = filename(parts[1]),
        name = filename(parts[2]);
      const file =
        state.files.find((f) => f.folder === folder && f.name === name) ||
        bad("File not found in this browser.");
      if (method === "GET") answer = file;
      else if (method === "DELETE") {
        state.files = state.files.filter((f) => f !== file);
        answer = { deleted: true };
      } else bad("Unsupported file request.");
    } else if (
      ["/api/export", "/api/backup"].includes(path) &&
      method === "GET"
    )
      answer = backupPayload(state);
    else if (path === "/api/restore" && method === "POST")
      answer = restore(state, body);
    else if (path === "/api/tutor" && method === "POST") {
      boundedArray(body.documentIds || [], 20, "tutor source documents");
      text(body.question, "Question", 10000);
      const words =
        body.question.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [];
      const docs = (body.documentIds || []).map((d) => requireDoc(state, d));
      const sources = docs
        .flatMap((d) =>
          d.sections.map((s) => ({
            documentId: d.id,
            sectionId: s.id,
            title: s.title,
            excerpt: s.content.slice(0, 3000),
            score: words.filter((w) => s.content.toLowerCase().includes(w))
              .length,
          })),
        )
        .filter((s) => s.score)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);
      if (body.setId) {
        const set = requireSet(state, body.setId);
        for (const c of set.cards
          .filter((c) =>
            words.some((w) =>
              (c.term + " " + c.definition).toLowerCase().includes(w),
            ),
          )
          .slice(0, 4))
          sources.push({
            ...(c.provenance || {}),
            title: c.term,
            excerpt: c.definition,
          });
      }
      answer = {
        answer: sources.length
          ? sources.map((s) => `### ${s.title}\n\n${s.excerpt}`).join("\n\n")
          : "No matching local source passages were found. Select notes or a deck and ask about a concept in that material.",
        sources,
        verified: false,
        method: "browser-local-source-retrieval",
        warnings: [
          "Guest mode retrieves your local source passages. It does not send them to an AI service or provide verified calculations.",
        ],
      };
      write = false;
    } else bad("This operation is unavailable in browser-local guest mode.");
    if (write) {
      if (
        state.sets.length > 1000 ||
        state.documents.length > 250 ||
        state.files.length > 250 ||
        bytes(JSON.stringify(backupPayload(state), null, 2)) > 19900000
      )
        bad(
          "Guest workspace backup limit reached. This change was not saved. Export your existing backup and remove material before retrying; saved data always fits the 20 MB restore limit.",
        );
      await storage.set(clone(state));
    }
    return clone(answer);
  }
  const enqueue = (work) => {
    const next = (storeQueues.get(storage) || Promise.resolve()).then(() =>
      storage.withLock ? storage.withLock(work) : work(),
    );
    storeQueues.set(
      storage,
      next.catch(() => {}),
    );
    return next;
  };
  const api = (path, body, method) => enqueue(() => run(path, body, method));
  api.clear = () =>
    enqueue(async () => {
      previews.length = 0;
      await storage.clear();
    });
  return api;
}
function restore(state, body) {
  if (!body || ![1, 2].includes(body.version))
    bad("Choose a supported StudyCade version 1 or 2 backup.");
  const sets = boundedArray(body.sets || [], 1000, "backup decks"),
    docs = boundedArray(body.documents || [], 250, "backup documents"),
    files = boundedArray(body.files || [], 250, "backup files"),
    reviews = boundedArray(body.reviews || [], 500000, "backup reviews"),
    attempts = boundedArray(body.attempts || [], 100000, "backup attempts"),
    schedules = boundedArray(body.schedules || [], 100000, "backup schedules"),
    progress = boundedArray(body.progress || [], 1000, "backup progress");
  const docMap = new Map(),
    setMap = new Map(),
    cardMap = new Map(),
    batch = id(),
    root = `Restored-${batch.slice(0, 12)}`,
    newDocs = [];
  const oldId = (v, label) => {
    if (
      !["number", "string"].includes(typeof v) ||
      String(v).length > 150 ||
      String(v) === "" ||
      ["__proto__", "constructor", "prototype"].includes(String(v))
    )
      bad(`Invalid backup ${label} identifier.`);
    return String(v);
  };
  const folder = (value) =>
    `${root}-${filename(value || "Notes")}`.slice(0, 160);
  const addFile = (oldFolder, name, content) => {
    const f = {
      folder: folder(oldFolder),
      name: filename(name),
      content,
      size: bytes(content),
    };
    if (typeof content !== "string" || f.size > 2_000_000)
      bad("Invalid or oversized backup file.");
    const existing = state.files.find(
      (x) => x.folder === f.folder && x.name === f.name,
    );
    if (existing && existing.content !== content)
      bad("Backup contains conflicting files.");
    if (!existing) state.files.push(f);
    return f;
  };
  for (const input of docs) {
    const key = oldId(input.id, "document");
    if (docMap.has(key)) bad("Backup contains duplicate document identifiers.");
    const content = input.content ?? input.source;
    if (typeof content !== "string" || bytes(content) > 2_000_000)
      bad("Invalid backup document content.");
    const newId = id();
    docMap.set(key, newId);
    const name = filename(input.filename || input.name || "restored.md"),
      file = addFile(input.folder, name, content);
    const d = {
      id: newId,
      title: text(input.title || name, "Document title", 200),
      ...labelsOf(input),
      filename: name,
      name,
      folder: file.folder,
      content,
      source: content,
      sections: normalizeSections(input.sections, input.subject || "general"),
      reviews: [],
      warnings: warnings(input.warnings || []),
      hash: typeof input.hash === "string" ? input.hash : "",
      cards: [],
      createdAt: now(),
    };
    if (input.exam !== undefined) d.exam = validateExam(clone(input.exam));
    state.documents.push(d);
    newDocs.push([input, d]);
  }
  function remapCard(input, defaultDoc) {
    const c = { ...input };
    if (typeof c.metadata === "string") {
      try {
        c.metadata = JSON.parse(c.metadata);
      } catch {
        bad("Invalid card metadata.");
      }
      safe(c.metadata);
      Object.assign(c, c.metadata);
      delete c.metadata;
    }
    if (c.provenance) {
      if (Array.isArray(c.provenance) || typeof c.provenance !== "object")
        bad("Card provenance must be an object.");
      c.provenance = { ...c.provenance };
      const old = c.provenance.documentId;
      if (old !== undefined) {
        const mapped = docMap.get(oldId(old, "source document"));
        if (!mapped) bad("Card refers to an unknown backup document.");
        c.provenance.documentId = mapped;
      } else if (defaultDoc) c.provenance.documentId = defaultDoc;
      const doc = state.documents.find((d) => d.id === c.provenance.documentId);
      if (doc) {
        c.provenance.filename = doc.filename;
        if (
          c.provenance.sectionId &&
          !doc.sections.some((s) => s.id === c.provenance.sectionId)
        )
          bad("Card refers to an unknown backup section.");
      }
    }
    return c;
  }
  for (const [input, d] of newDocs) {
    const suggestions = boundedArray(input.cards || [], 2000, "document cards");
    if (suggestions.length)
      d.cards = cardsFrom(
        { cards: suggestions.map((c) => remapCard(c, d.id)) },
        state,
      );
    for (const r of boundedArray(input.reviews || [], 4000, "document reviews"))
      reviews.push({ ...r, documentId: input.id });
  }
  for (const input of sets) {
    const key = oldId(input.id, "deck");
    if (input.builtin && key === "welcome") {
      if (
        !Array.isArray(input.cards) ||
        input.cards.length !== 1 ||
        input.cards[0].term !== "CARD" ||
        input.cards[0].definition !== "CARD"
      )
        bad(
          "The backup Welcome deck does not match the canonical CARD/CARD content.",
        );
      if (setMap.has(key)) bad("Backup contains duplicate deck identifiers.");
      const welcome = requireSet(state, "welcome");
      setMap.set(key, welcome.id);
      if (input.cards[0].id !== undefined) {
        const originalCardId = oldId(input.cards[0].id, "card");
        if (cardMap.has(originalCardId))
          bad("Backup contains duplicate card identifiers.");
        cardMap.set(originalCardId, {
          id: welcome.cards[0].id,
          setId: welcome.id,
        });
      }
      continue;
    }
    if (setMap.has(key)) bad("Backup contains duplicate deck identifiers.");
    let links = input.documentIds || input.document_ids || [];
    if (typeof links === "string") {
      try {
        links = JSON.parse(links);
      } catch {
        bad("Invalid source links.");
      }
    }
    links = boundedArray(links, 250, "deck source links").map(
      (old) =>
        docMap.get(oldId(old, "document")) ||
        bad("Deck refers to an unknown backup document."),
    );
    const originals = boundedArray(input.cards, 2000, "backup cards");
    const set = newSet(state, {
      title: input.title,
      ...labelsOf(input),
      warnings: warnings(input.warnings || []),
      cards: originals.map((c) => remapCard(c)),
      documentIds: links,
    });
    setMap.set(key, set.id);
    originals.forEach((c, i) => {
      if (c.id === undefined) return;
      const old = oldId(c.id, "card");
      if (cardMap.has(old)) bad("Backup contains duplicate card identifiers.");
      cardMap.set(old, { id: set.cards[i].id, setId: set.id });
    });
  }
  for (const f of files) addFile(f.folder, f.name || f.filename, f.content);
  for (const r of reviews) {
    const mapped = docMap.get(
      oldId(r.documentId ?? r.document_id, "review document"),
    );
    if (!mapped) bad("Review refers to an unknown backup document.");
    const d = requireDoc(state, mapped),
      sectionId = r.sectionId ?? r.section_id,
      confidence = r.confidence || "";
    if (
      !d.sections.some((s) => s.id === sectionId) ||
      (r.questionId !== undefined && !validQuestion(r.questionId)) ||
      ![false, true, 0, 1].includes(r.reviewed) ||
      !["", "red", "yellow", "green"].includes(confidence)
    )
      bad("Invalid backup section review.");
    d.reviews = d.reviews.filter(
      (v) => v.sectionId !== sectionId || v.questionId !== r.questionId,
    );
    d.reviews.push({
      sectionId,
      ...(r.questionId === undefined ? {} : { questionId: r.questionId }),
      reviewed: !!r.reviewed,
      confidence,
    });
    if (d.reviews.length > 4000) bad("Too many reviews.");
  }
  for (const p of progress) {
    const original = oldId(p.setId ?? p.set_id, "progress deck"),
      mapped = setMap.get(original);
    if (!mapped) {
      if (sets.some((s) => String(s.id) === original && s.builtin)) continue;
      bad("Progress refers to an unknown backup deck.");
    }
    const right = p.right ?? p.right_count,
      wrong = p.wrong ?? p.wrong_count;
    if (
      !Number.isSafeInteger(right) ||
      right < 0 ||
      !Number.isSafeInteger(wrong) ||
      wrong < 0
    )
      bad("Invalid backup progress totals.");
    addProgress(state, mapped, right, wrong);
  }
  for (const a of attempts) {
    const mapped = cardMap.get(oldId(a.cardId ?? a.card_id, "attempt card"));
    if (!mapped) bad("Attempt refers to an unknown backup card.");
    const originalSet = oldId(a.setId ?? a.set_id, "attempt deck");
    if (
      setMap.get(originalSet) !== mapped.setId ||
      ![false, true, 0, 1].includes(a.correct) ||
      !["", "low", "medium", "high", "green", "yellow", "red"].includes(
        a.confidence || "",
      )
    )
      bad("Invalid backup attempt.");
    state.attempts.push({
      setId: mapped.setId,
      cardId: mapped.id,
      correct: !!a.correct,
      confidence: a.confidence || "",
      eventId: `restored:${batch}:${state.attempts.length}`,
      createdAt: typeof a.createdAt === "string" ? a.createdAt : now(),
    });
  }
  for (const s of schedules) {
    const mapped = cardMap.get(oldId(s.cardId ?? s.card_id, "scheduled card"));
    const repetitions = s.repetitions,
      intervalDays = s.intervalDays ?? s.interval_days,
      ease = s.ease,
      dueAt = s.dueAt ?? s.due_at;
    if (
      !mapped ||
      !Number.isInteger(repetitions) ||
      repetitions < 0 ||
      !Number.isFinite(intervalDays) ||
      intervalDays < 0 ||
      intervalDays > 36500 ||
      !Number.isFinite(ease) ||
      ease < 1 ||
      ease > 5 ||
      typeof dueAt !== "string" ||
      !Number.isFinite(Date.parse(dueAt))
    )
      bad("Invalid backup review schedule.");
    state.schedules.push({
      cardId: mapped.id,
      repetitions,
      intervalDays,
      ease,
      dueAt,
    });
  }
  return {
    restored: true,
    sets: setMap.size,
    documents: docMap.size,
    setIds: Object.fromEntries(setMap),
    documentIds: Object.fromEntries(docMap),
  };
}
let defaultApi;
export function guestApi(path, body, method) {
  defaultApi ??= createGuestApi();
  return defaultApi(path, body, method);
}
export async function clearGuestData() {
  defaultApi ??= createGuestApi();
  await defaultApi.clear();
}
