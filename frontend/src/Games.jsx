import React, { useState, useEffect, useRef, useMemo } from "react";
import { SubjectIdentity } from "./subjects.jsx";
import { Content } from "./content.js";
import {
  initial,
  optionsFor,
  SPEEDS,
  MODES,
  resumeRound,
  signature,
  supportsQuiz,
} from "./engine.js";
export default function Games({
  cards,
  mode,
  onRecord,
  sessionKey,
  onOpenSource,
  defaultSourceId,
  onImport,
  isStarter = false,
  persistRound = true,
}) {
  const [s, set] = useState(() => {
    if (!persistRound) return initial(cards, mode);
    try {
      return resumeRound(
        cards,
        mode,
        JSON.parse(sessionStorage.getItem(sessionKey)),
      );
    } catch {
      return initial(cards, mode);
    }
  });
  const pending = useRef([]);
  const latest = useRef(s);
  latest.current = s;
  useEffect(() => () => pending.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!persistRound) return;
    const persist = () => {
      try {
        sessionStorage.setItem(
          sessionKey,
          JSON.stringify({
            signature: signature(cards),
            state: latest.current,
          }),
        );
      } catch {}
    };
    const interval = setInterval(persist, 500);
    const hide = () => {
      if (document.hidden) persist();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", persist);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", persist);
      persist();
    };
  }, [sessionKey, persistRound]);
  const delay = (fn, ms) => {
    pending.current.push(setTimeout(fn, ms));
  };
  const card = s.deck[s.index];
  const finished = !card || s.lives <= 0;
  const title = MODES.find((x) => x[0] === mode)[1];
  const advance = () =>
    set((old) => {
      const index = old.index + 1;
      return {
        ...old,
        index,
        flipped: false,
        answered: false,
        chosen: null,
        elapsed: 0,
        locked: false,
        options: old.deck[index]
          ? optionsFor(cards, old.deck[index], mode)
          : [],
      };
    });
  function answer(id) {
    const a = latest.current,
      c = a.deck[a.index];
    if (!c || a.answered || a.locked || a.paused || a.lives <= 0) return;
    const hit = id === c.id;
    onRecord(hit, c, mode === "flash" ? "review" : undefined);
    if (mode === "meteor") {
      set((v) => ({
        ...v,
        right: v.right + Number(hit),
        lives: v.lives - Number(!hit),
        locked: true,
        chosen: id,
      }));
      delay(
        () =>
          hit ? advance() : set((v) => ({ ...v, locked: false, chosen: null })),
        hit ? 280 : 450,
      );
    } else
      set((v) => ({
        ...v,
        answered: true,
        chosen: id,
        right: v.right + Number(hit),
      }));
  }
  useEffect(() => {
    if (mode !== "meteor") return;
    let last = 0,
      frame;
    function tick(now) {
      const a = latest.current;
      if (!a.paused && !a.locked && a.deck[a.index] && a.lives > 0) {
        const delta = last ? Math.min(now - last, 100) : 0;
        if (a.elapsed + delta >= SPEEDS[a.speed]) {
          onRecord(false, a.deck[a.index]);
          set((v) => ({
            ...v,
            lives: v.lives - 1,
            index: v.index + 1,
            elapsed: 0,
            options: v.deck[v.index + 1]
              ? optionsFor(cards, v.deck[v.index + 1], mode)
              : [],
          }));
        } else set((v) => ({ ...v, elapsed: v.elapsed + delta }));
      }
      last = now;
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    const keys = (e) => {
      if (
        e.target.closest(
          'input,textarea,select,math-field,[contenteditable="true"]',
        ) ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.repeat
      )
        return;
      if (/^[1-4]$/.test(e.key)) {
        const c = latest.current.options[Number(e.key) - 1];
        if (c) {
          e.preventDefault();
          answer(c.id);
        }
      }
    };
    const hide = () => {
      if (document.hidden) set((v) => ({ ...v, paused: true }));
    };
    document.addEventListener("keydown", keys);
    document.addEventListener("visibilitychange", hide);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", keys);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [mode]);
  function memory(i) {
    if (s.locked || s.open.includes(i) || s.matched.includes(i)) return;
    const open = [...s.open, i];
    if (open.length < 2) {
      set({ ...s, open });
      return;
    }
    const [a, b] = open;
    const hit =
      s.tiles[a].id === s.tiles[b].id && s.tiles[a].side !== s.tiles[b].side;
    onRecord(hit, s.tiles[i]);
    set({
      ...s,
      open: hit ? [] : open,
      moves: s.moves + 1,
      matched: hit ? [...s.matched, a, b] : s.matched,
      locked: !hit,
    });
    if (!hit)
      delay(() => set((v) => ({ ...v, open: [], locked: false })), 1000);
  }
  function match(side, id) {
    if (s.locked || s.matched.includes(id)) return;
    const picked = { ...s.picked, [side]: id };
    if (picked.term === undefined || picked.definition === undefined) {
      set({ ...s, picked });
      return;
    }
    const hit = picked.term === picked.definition;
    onRecord(
      hit,
      cards.find((c) => c.id === picked.term),
    );
    set({
      ...s,
      picked: hit ? {} : picked,
      moves: s.moves + 1,
      matched: hit ? [...s.matched, id] : s.matched,
      locked: !hit,
    });
    if (!hit)
      delay(() => set((v) => ({ ...v, picked: {}, locked: false })), 650);
  }
  const restart = () => {
    pending.current.forEach(clearTimeout);
    set(initial(cards, mode));
  };
  const pairsMode = mode === "memory" || mode === "match";
  const pairDone =
    pairsMode &&
    s.matched.length === (mode === "memory" ? s.tiles.length : s.pairs.length);
  const needsCards = useMemo(
    () =>
      pairsMode
        ? s.pairs.length === 0
        : mode !== "flash" && !supportsQuiz(cards),
    [cards, mode, s.pairs.length],
  );
  return (
    <section className="game panel" aria-label={title}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">ACTIVE RECALL</span>
          <h2>{title}</h2>
          {card && (
            <SubjectIdentity
              item={
                pairsMode
                  ? {
                      subjects: cards.flatMap(
                        (c) => c.subjects || [c.subject || "general"],
                      ),
                    }
                  : card
              }
            />
          )}
        </div>
        <span className="badge">
          {pairsMode
            ? `${s.moves} attempts`
            : `${Math.min(s.index + 1, cards.length)} / ${cards.length}`}
        </span>
      </div>
      {needsCards ? (
        <div className="empty">
          <h3>Add your study material to play</h3>
          <p>
            {pairsMode
              ? "This activity needs distinct terms and definitions. Identical sides or repeated meanings cannot make a clear match."
              : "This activity needs at least two distinct terms and definitions to offer real answer choices."}
            {isStarter && " Welcome is a placeholder."} Paste your notes or
            cards, preview them, and save a practice deck.
          </p>
          <button className="primary" onClick={onImport}>
            Paste or import material →
          </button>
        </div>
      ) : finished || pairDone ? (
        <div className="empty">
          <span className="finish-icon">✧</span>
          <h3>Practice makes progress.</h3>
          <p>
            {pairsMode
              ? `${s.pairs.length} pairs found in ${s.moves} attempts.`
              : `${s.right} correct · ${mode === "meteor" ? `${s.lives} lives left` : cards.length + " cards practiced"}`}
          </p>
          <button className="primary" onClick={restart}>
            Practice again
          </button>
        </div>
      ) : (
        <>
          {mode === "flash" && (
            <>
              <button
                className={`flashcard ${s.flipped ? "flipped" : ""}`}
                aria-label={
                  s.flipped
                    ? "Definition. Flip to term"
                    : "Term. Flip to definition"
                }
                onClick={() => set({ ...s, flipped: !s.flipped })}
              >
                <span className="eyebrow">
                  {s.flipped ? "DEFINITION" : "TERM"}
                </span>
                <div className="flash-face" key={`${card.id}:${s.flipped}`}>
                  <Content>{s.flipped ? card.definition : card.term}</Content>
                </div>
                <span className="muted small">Flip flashcard ↻</span>
              </button>
              <div className="controls">
                <button
                  disabled={!s.index}
                  onClick={() =>
                    set({ ...s, index: s.index - 1, flipped: false })
                  }
                >
                  ← Previous
                </button>
                <button onClick={() => set({ ...s, flipped: !s.flipped })}>
                  Flip card
                </button>
                <button onClick={advance}>Next →</button>
              </div>
              {s.flipped && (
                <div className="controls">
                  <span className="muted small">How did you do?</span>
                  <button
                    onClick={() => {
                      onRecord(false, card, "review");
                      advance();
                    }}
                  >
                    Study again
                  </button>
                  <button
                    className="primary"
                    onClick={() => {
                      onRecord(true, card, "review");
                      set((v) => ({ ...v, right: v.right + 1 }));
                      advance();
                    }}
                  >
                    I knew it ✓
                  </button>
                </div>
              )}
            </>
          )}
          {mode === "memory" && (
            <>
              <p className="muted">
                Turn over two tiles to find each term and its meaning.
              </p>
              <div className="memory-grid">
                {s.tiles.map((t, i) => (
                  <button
                    key={i}
                    className={`tile ${s.open.includes(i) ? "revealed" : ""} ${s.matched.includes(i) ? "correct" : ""}`}
                    disabled={s.matched.includes(i) || s.locked}
                    aria-label={
                      s.open.includes(i) || s.matched.includes(i)
                        ? undefined
                        : `Hidden tile ${i + 1}`
                    }
                    onClick={() => memory(i)}
                  >
                    {s.open.includes(i) || s.matched.includes(i) ? (
                      <div className="tile-face">
                        <SubjectIdentity item={t} compact />
                        <Content>{t[t.side]}</Content>
                      </div>
                    ) : (
                      <span aria-hidden="true">✧</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
          {mode === "match" && (
            <>
              <p className="muted">
                Choose a term and its definition. Every match builds a
                connection.
              </p>
              <div className="match-grid">
                {[
                  ["term", s.left],
                  ["definition", s.rightPairs],
                ].map(([side, list]) => (
                  <div key={side}>
                    <h3 className="eyebrow">
                      {side === "term" ? "TERMS" : "DEFINITIONS"}
                    </h3>
                    {list.map((c) => (
                      <button
                        key={c.id}
                        disabled={s.matched.includes(c.id) || s.locked}
                        className={`match-option ${s.picked[side] === c.id ? "selected" : ""} ${s.matched.includes(c.id) ? "correct" : ""}`}
                        onClick={() => match(side, c.id)}
                      >
                        <>
                          <SubjectIdentity item={c} compact />
                          <Content>{c[side]}</Content>
                        </>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
          {(mode === "choice" || mode === "bank") && (
            <>
              <p className="muted">
                {mode === "bank"
                  ? "Complete the blank with a term from the bank."
                  : "Choose the term that fits this definition."}
              </p>
              <div className="question">
                <Content>{card.definition}</Content>
                <span className="blank">
                  {s.answered ? (
                    <Content>{card.term}</Content>
                  ) : (
                    "________________"
                  )}
                </span>
              </div>
              <div className={mode === "bank" ? "word-bank" : "answers"}>
                {s.options.map((c) => (
                  <button
                    key={c.id}
                    disabled={s.answered}
                    className={
                      s.answered
                        ? c.id === card.id
                          ? "correct"
                          : c.id === s.chosen
                            ? "incorrect"
                            : ""
                        : ""
                    }
                    onClick={() => answer(c.id)}
                  >
                    <Content>{c.term}</Content>
                  </button>
                ))}
              </div>
              {s.answered && (
                <div className="feedback" role="status">
                  <strong>
                    {s.chosen === card.id
                      ? "Nicely done."
                      : "Keep going — every attempt helps."}
                  </strong>
                  {card.explanation && <Content>{card.explanation}</Content>}
                  <button className="primary" autoFocus onClick={advance}>
                    Next question →
                  </button>
                </div>
              )}
            </>
          )}
          {mode === "meteor" && (
            <>
              <div className="controls meteor-controls">
                <span className="lives" aria-label={`${s.lives} lives`}>
                  {"♥".repeat(s.lives)}
                  {"♡".repeat(3 - s.lives)}
                </span>
                <label>
                  Speed{" "}
                  <select
                    value={s.speed}
                    onChange={(e) => set({ ...s, speed: e.target.value })}
                  >
                    <option value="slow">Slow · 14 s</option>
                    <option value="normal">Normal · 10 s</option>
                    <option value="fast">Fast · 7 s</option>
                  </select>
                </label>
                <button
                  onClick={() =>
                    set((v) => ({ ...v, started: true, paused: !v.paused }))
                  }
                >
                  {s.paused ? (s.started ? "Resume" : "Start game") : "Pause"}
                </button>
              </div>
              <div className="meteor-sky">
                <div className="star-field" />
                <div
                  className={`meteor ${s.locked ? (s.chosen === card.id ? "hit" : "miss") : ""}`}
                  style={{
                    top: `${8 + Math.min(1, s.elapsed / SPEEDS[s.speed]) * 65}%`,
                  }}
                >
                  <Content>{card.term}</Content>
                </div>
                {s.paused && (
                  <div className="paused">
                    <strong>
                      {s.started
                        ? "Game paused"
                        : "Ready to defend your knowledge?"}
                    </strong>
                    <span className="small">
                      Choose the definition before the meteor reaches the
                      ground.
                    </span>
                    <button
                      className="primary"
                      onClick={() =>
                        set((v) => ({ ...v, started: true, paused: false }))
                      }
                    >
                      {s.started ? "Resume game" : "Start Meteor Defense"}
                    </button>
                  </div>
                )}
                <span className="horizon">DEFEND YOUR KNOWLEDGE</span>
              </div>
              <div className="answers">
                {s.options.map((c, i) => (
                  <button
                    key={c.id}
                    disabled={s.paused || s.locked}
                    className={
                      s.chosen === c.id
                        ? c.id === card.id
                          ? "correct"
                          : "incorrect"
                        : ""
                    }
                    onClick={() => answer(c.id)}
                  >
                    <kbd>{i + 1}</kbd>
                    <Content>{c.definition}</Content>
                  </button>
                ))}
              </div>
              <p className="muted small">
                Press 1–4 or choose a definition. Wrong shots and impacts cost
                one life.
              </p>
            </>
          )}
          {card?.provenance &&
            (card.provenance.documentId || defaultSourceId) && (
              <button
                className="text-button small"
                onClick={() =>
                  onOpenSource(
                    card.provenance.documentId || defaultSourceId,
                    card.provenance.sectionId,
                  )
                }
              >
                Source: {card.provenance.filename || "Study notes"} ·{" "}
                {card.provenance.sectionId} ↗
              </button>
            )}
          <div className="game-footer">
            <span className="small muted">
              {pairsMode
                ? `${mode === "memory" ? s.matched.length / 2 : s.matched.length} / ${s.pairs.length} pairs`
                : `${s.right} correct this round`}
            </span>
            <button className="text-button" onClick={restart}>
              ↻ New shuffle
            </button>
          </div>
        </>
      )}
    </section>
  );
}
