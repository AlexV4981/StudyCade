import React, { useMemo, useState } from "react";
import { CHEMISTRY_CATEGORIES, CHEMISTRY_LIBRARY } from "./chemistry-library.js";
import "./chemistry.css";

const INITIAL_LIMIT = 18;
const markdown = (item) => "![" + item.alt.replace(/[[\]]/g, "") + "](" + item.path + ")";

export default function ChemistryGallery({ onError }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [limit, setLimit] = useState(INITIAL_LIMIT);
  const [copied, setCopied] = useState("");
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return CHEMISTRY_LIBRARY.filter((item) =>
      (category === "all" || item.category === category) &&
      (!needle || [item.title, item.alt, item.category, ...(item.keywords || []), item.atomicNumber, item.symbol]
        .filter(Boolean).some((value) => String(value).toLowerCase().includes(needle))),
    );
  }, [query, category]);
  async function copy(item) {
    try {
      await navigator.clipboard.writeText(markdown(item));
      setCopied(item.id);
    } catch {
      onError(Error("Copy unavailable. Use the Markdown example in the asset documentation."));
    }
  }
  return (
    <details className="chem-gallery">
      <summary>Browse built-in chemistry images ({CHEMISTRY_LIBRARY.length})</summary>
      <p className="muted small">
        Original, self-contained SVG illustrations. Use the copy button to insert a
        working image reference into StudyCade Markdown. Element tiles show symbols,
        not photographs of the elements.
      </p>
      <div className="chem-gallery-controls">
        <label>
          Search by concept or element
          <input
            type="search"
            value={query}
            placeholder="e.g., titration, oxygen, equilibrium"
            onChange={(event) => { setQuery(event.target.value); setLimit(INITIAL_LIMIT); }}
          />
        </label>
        <label>
          Category
          <select value={category} onChange={(event) => { setCategory(event.target.value); setLimit(INITIAL_LIMIT); }}>
            <option value="all">All subjects ({CHEMISTRY_LIBRARY.length})</option>
            <option value="elements">All 118 elements</option>
            {CHEMISTRY_CATEGORIES.map((name) => (
              <option key={name} value={name}>{name[0].toUpperCase() + name.slice(1)}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted small" role="status">Showing {Math.min(limit, results.length)} of {results.length} matching images.</p>
      <div className="chem-gallery-grid">
        {results.slice(0, limit).map((item) => (
          <div className="chem-gallery-card" key={item.id}>
            <img src={item.path} alt={item.alt} loading="lazy" decoding="async" />
            <p className="chem-gallery-name">{item.title}</p>
            <button type="button" onClick={() => copy(item)}>
              {copied === item.id ? "Copied Markdown ✓" : "Copy Markdown image"}
            </button>
          </div>
        ))}
      </div>
      {results.length > limit && (
        <button type="button" onClick={() => setLimit((n) => n + INITIAL_LIMIT)}>
          Show more images
        </button>
      )}
      {!results.length && <p className="muted">No matching chemistry diagrams. Try another topic or element name.</p>}
    </details>
  );
}
