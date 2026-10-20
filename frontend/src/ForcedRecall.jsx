import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "./api.js";
import { Content } from "./content.js";
import { cardQuestion } from "./study.js";
import {
  recallDelay,
  recallPool,
  recallQuestion,
  resolveRecall,
} from "./recall.js";
import "./recall.css";
const Preferences = createContext(null);
// Keep private card selections in page memory, including across navigation; never browser storage.
export function RecallProvider({ children }) {
  const [selection, setSelection] = useState({}),
    [decks, setDecks] = useState([]),
    [enabled, setEnabled] = useState(false);
  return (
    <Preferences.Provider
      value={{ selection, setSelection, decks, setDecks, enabled, setEnabled }}
    >
      {children}
    </Preferences.Provider>
  );
}
export default function ForcedRecall({ sets = [], onError, onRecord }) {
  const { selection, setSelection, decks, setDecks, enabled, setEnabled } =
    useContext(Preferences);
  const [loading, setLoading] = useState(false),
    [question, setQuestion] = useState(null),
    [now, setNow] = useState(Date.now());
  const live = useRef(null),
    previous = useRef(null),
    dialog = useRef(null),
    callbacks = useRef({ onError, onRecord });
  callbacks.current = { onError, onRecord };
  const pool = useMemo(
    () =>
      recallPool(
        decks.filter((d) => sets.some((s) => String(s.id) === String(d.id))),
        selection,
      ),
    [decks, selection, sets],
  );
  const poolKey = useMemo(
    () => JSON.stringify(pool.map((c) => [c.id, c.term, c.definition])),
    [pool],
  );
  const usable = useMemo(() => !!recallQuestion(pool, null, () => 0), [pool]);
  useEffect(() => {
    if (enabled && !usable) setEnabled(false);
  }, [enabled, usable]);
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const change = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", change);
    return () => document.removeEventListener("visibilitychange", change);
  }, []);
  useEffect(() => {
    let cancelled = false;
    const ids = Object.keys(selection).filter((id) =>
      sets.some((s) => String(s.id) === id),
    );
    if (!ids.length) return;
    Promise.all(ids.map((id) => api("/api/sets/" + encodeURIComponent(id))))
      .then((values) => {
        if (!cancelled) setDecks(values);
      })
      .catch((error) => {
        if (!cancelled) callbacks.current.onError(error);
      });
    return () => {
      cancelled = true;
    };
  }, [sets]);
  useEffect(() => {
    live.current = null;
    setQuestion(null);
  }, [poolKey]);
  const answer = (optionId) => {
    const current = live.current;
    if (!current) return;
    const resolved = resolveRecall(current, optionId, Date.now());
    if (resolved === current) return;
    live.current = resolved;
    setQuestion(resolved);
    Promise.resolve(
      callbacks.current.onRecord?.(
        resolved.correct,
        resolved.card,
        resolved.eventId,
      ),
    ).catch(callbacks.current.onError);
  };
  useEffect(() => {
    if (!enabled || !usable || !visible || question) return;
    const timer = setTimeout(() => {
      const next = recallQuestion(pool, previous.current);
      if (!next || document.hidden) return;
      const current = {
        ...next,
        deadline: Date.now() + 10000,
        eventId: crypto.randomUUID(),
      };
      previous.current = next.card.id;
      live.current = current;
      setNow(Date.now());
      setQuestion(current);
    }, recallDelay());
    return () => clearTimeout(timer);
  }, [enabled, usable, visible, poolKey, !!question]);
  useEffect(() => {
    if (!question || question.resolved) return;
    const tick = () => {
      setNow(Date.now());
      if (
        live.current &&
        !live.current.resolved &&
        Date.now() >= live.current.deadline
      )
        answer(null);
    };
    tick();
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [question?.eventId, question?.resolved]);
  useEffect(() => {
    if (!question) return;
    const node = dialog.current;
    node.showModal();
    const handleKey = (event) => {
      if (/^[1-4]$/.test(event.key) && !live.current?.resolved) {
        event.preventDefault();
        const option = live.current.options[Number(event.key) - 1];
        if (option) answer(option.id);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      node.close();
    };
  }, [question?.eventId]);
  useEffect(
    () => () => {
      live.current = null;
    },
    [],
  );
  const dismiss = () => {
    live.current = null;
    setQuestion(null);
  };
  const stop = () => {
    setEnabled(false);
    dismiss();
  };
  async function chooseDeck(summary, checked) {
    setLoading(true);
    try {
      if (!checked) {
        setSelection((current) => {
          const next = { ...current };
          delete next[summary.id];
          return next;
        });
        return;
      }
      const data = await api("/api/sets/" + encodeURIComponent(summary.id));
      setDecks((current) => [...current.filter((d) => d.id !== data.id), data]);
      setSelection((current) => ({
        ...current,
        [data.id]: data.cards.map((c) => c.id),
      }));
    } catch (error) {
      onError(error);
    } finally {
      setLoading(false);
    }
  }
  const activeQuestion = question
    ? cardQuestion(question.card, 1, question.card.deckTitle)
    : null;
  return (
    <section
      className="recall-settings panel"
      aria-label="Forced recall settings"
    >
      <div className="recall-heading">
        <label className="check-row">
          <input
            type="checkbox"
            role="switch"
            checked={enabled}
            disabled={!usable}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Forced recall
        </label>
        <span>
          {enabled
            ? "On · a question every 3–10 minutes"
            : "Off · choose cards to enable"}
        </span>
      </div>
      <p>
        While you read, a card drops down at a random interval between 3 and 10
        minutes. You have 10 seconds to choose its answer. Scheduling pauses
        when this tab is hidden.
      </p>
      <details>
        <summary>
          Choose flashcard sets and exclude cards · {pool.length} selected
        </summary>
        <p className="small muted">
          Uncheck cards to leave them out of recall. Your original flashcard
          sets stay intact.
        </p>
        <div className="recall-decks">
          {sets.map((set) => {
            const selected = Object.hasOwn(selection, set.id),
              loaded = decks.find((d) => d.id === set.id);
            return (
              <div className="recall-deck" key={set.id}>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={loading}
                    onChange={(e) => chooseDeck(set, e.target.checked)}
                  />
                  {set.title} · {set.cardCount} cards
                </label>
                {selected && loaded && (
                  <details>
                    <summary>Choose cards from {set.title}</summary>
                    <div className="recall-card-picker">
                      {loaded.cards.map((card) => (
                        <label className="check-row" key={card.id}>
                          <input
                            type="checkbox"
                            checked={(selection[set.id] || []).includes(
                              card.id,
                            )}
                            onChange={(e) =>
                              setSelection((current) => ({
                                ...current,
                                [set.id]: e.target.checked
                                  ? [...(current[set.id] || []), card.id]
                                  : (current[set.id] || []).filter(
                                      (id) => id !== card.id,
                                    ),
                              }))
                            }
                          />
                          <span>{cardQuestion(card).question}</span>
                        </label>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      </details>
      {!usable && (
        <p className="recall-empty" role="status">
          Choose at least two cards with distinct questions and answers.
          Ambiguous prompts and placeholder cards are excluded.
        </p>
      )}
      {question && (
        <dialog
          ref={dialog}
          className="recall-dialog"
          aria-labelledby="forced-recall-title"
          aria-describedby="forced-recall-help"
          onCancel={(e) => {
            e.preventDefault();
            stop();
          }}
        >
          <div className="recall-question-top">
            <div>
              <span className="eyebrow">FORCED RECALL</span>
              <h2 id="forced-recall-title">A quick recall check</h2>
            </div>
            <strong
              className="recall-countdown"
              aria-label={`${Math.max(0, Math.ceil((question.deadline - now) / 1000))} seconds remaining`}
            >
              {question.resolved
                ? "Finished"
                : `${Math.max(0, Math.ceil((question.deadline - now) / 1000))}s`}
            </strong>
          </div>
          <p id="forced-recall-help">
            Choose the correct answer. Use the buttons or keys 1–
            {question.options.length}.
          </p>
          <div className="recall-prompt">
            <strong className="game-question-label">
              Q{activeQuestion.number} · {activeQuestion.topic}
            </strong>
            <Content>{activeQuestion.question}</Content>
          </div>
          <div className="recall-options">
            {question.options.map((option, i) => (
              <button
                key={option.id}
                disabled={question.resolved}
                className={
                  question.resolved &&
                  (option.correct
                    ? "correct"
                    : question.chosen === option.id
                      ? "incorrect"
                      : "")
                }
                onClick={() => answer(option.id)}
              >
                <b>{i + 1}</b>
                <Content>{option.text}</Content>
              </button>
            ))}
          </div>
          {question.resolved && (
            <div className="recall-feedback" role="status">
              <strong>
                {question.timedOut
                  ? "Time is up."
                  : question.correct
                    ? "✓ Correct."
                    : "Not quite."}
              </strong>
              {!question.correct && (
                <>
                  <p>The correct answer:</p>
                  <Content>
                    {question.options.find((o) => o.correct).text}
                  </Content>
                </>
              )}
              <button className="primary" onClick={dismiss}>
                Continue reading →
              </button>
            </div>
          )}
          <button className="recall-stop" onClick={stop}>
            Turn off forced recall
          </button>
        </dialog>
      )}
    </section>
  );
}
