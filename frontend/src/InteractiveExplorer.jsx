import React, { useEffect, useMemo, useState } from "react";
import { CHEMISTRY_TOPICS, ELEMENTS, CHEMISTRY_ELEMENT_ASSETS } from "./chemistry-library.js";
import {
  DIAGRAM_POINTS, TREND_DESCRIPTIONS, elementFamily, elementPosition,
  parseInteractiveHref, periodicHref, diagramHref,
} from "./interactive-chemistry.js";
import "./interactive.css";

const ELEMENT_BY_SYMBOL = new Map(ELEMENTS.map((element) => [element.symbol, element]));
const TOPIC_BY_ID = new Map(CHEMISTRY_TOPICS.map((item) => [item.id, item]));
const FAMILIES = [...new Set(ELEMENTS.map((element) => elementFamily(element.atomicNumber)))];
const FAMILY_COLORS = {
  "Nonmetal": "#66e3cf",
  "Noble gas": "#7fbeff",
  "Alkali metal": "#ffcc75",
  "Alkaline earth metal": "#f5ac83",
  "Halogen": "#a9e79f",
  "Lanthanide": "#f5a3ce",
  "Actinide": "#cd99ec",
  "Metalloid": "#bbabff",
  "Transition metal": "#b5cadd",
  "Other element": "#a9c0d7",
};

function shareLink(relative, onResult) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    onResult("Copy unavailable. Select the browser address and copy it.");
    return;
  }
  navigator.clipboard.writeText(window.location.origin + relative)
    .then(() => onResult("Link copied"))
    .catch(() => onResult("Copy unavailable. Select the browser address and copy it."));
}

function PageHead({ title, description }) {
  return (
    <header className="interactive-head">
      <a href="/" className="interactive-back">← Back to StudyCade</a>
      <div className="interactive-head-row">
        <div><span className="interactive-eyebrow">STUDYCADE · INTERACTIVE CHEMISTRY</span>
          <h1>{title}</h1><p>{description}</p></div>
      </div>
    </header>
  );
}

function PeriodicExplorer({ route }) {
  const [symbol, setSymbol] = useState(route.element || "Na");
  const [trend, setTrend] = useState(route.trend || "none");
  const [group, setGroup] = useState(route.group ? String(route.group) : "");
  const [search, setSearch] = useState("");
  const [familyFilter, setFamilyFilter] = useState("");
  const [message, setMessage] = useState("");
  const selected = ELEMENT_BY_SYMBOL.get(symbol);
  const selectedPosition = selected ? elementPosition(selected.atomicNumber) : null;
  const href = periodicHref({ element: symbol, trend, group });
  useEffect(() => {
    if (href && window.location.pathname.startsWith("/interactive/"))
      window.history.replaceState(null, "", href);
  }, [href]);
  const matches = useMemo(() => ELEMENTS.filter((item) => {
    const found = !search || item.symbol.toLowerCase().includes(search.toLowerCase()) ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      String(item.atomicNumber) === search.trim();
    const belongs = !group || elementPosition(item.atomicNumber).group === Number(group);
    const family = !familyFilter || elementFamily(item.atomicNumber) === familyFilter;
    return found && belongs && family;
  }), [search, group, familyFilter]);
  const matchingNumbers = new Set(matches.map((item) => item.atomicNumber));
  return (
    <>
      <PageHead title="Interactive periodic table" description="Explore all 118 elements, inspect atomic numbers and groups, and visualize qualitative periodic trends."/>
      <div className="interactive-panel">
        <div className="interactive-controls">
          <label>Find an element
            <input type="search" value={search} placeholder="Symbol, name or number" onChange={(e) => setSearch(e.target.value)} />
          </label>
          <label>Group
            <select value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="">All groups</option>
              {Array.from({ length: 18 }, (_, i) => <option key={i + 1} value={String(i + 1)}>Group {i + 1}</option>)}
            </select>
          </label>
          <label>Family
            <select value={familyFilter} onChange={(e) => setFamilyFilter(e.target.value)}>
              <option value="">All families</option>
              {FAMILIES.map((item) => <option value={item} key={item}>{item}</option>)}
            </select>
          </label>
          <label>Trend overlay
            <select value={trend} onChange={(e) => setTrend(e.target.value)}>
              <option value="none">Off</option>
              <option value="radius">Atomic radius</option>
              <option value="ionization">First ionization energy</option>
              <option value="electronegativity">Electronegativity</option>
            </select>
          </label>
        </div>
        <p className="interactive-trend" role="status">
          {trend !== "none" && <strong className="interactive-trend-arrow" aria-label={trend === "radius" ? "Trend toward the lower left" : "Trend toward the upper right"}>{trend === "radius" ? "↙" : "↗"}</strong>}
          {TREND_DESCRIPTIONS[trend]}
        </p>
        <div className="periodic-scroller" tabIndex={0} aria-label="Scrollable periodic table">
          <div className="periodic-grid" role="group" aria-label="118 element periodic table">
            {Array.from({ length: 18 }, (_, i) => <span className="periodic-group-label" key={i + 1} style={{ gridColumn: i + 1, gridRow: 1 }}>{i + 1}</span>)}
            {ELEMENTS.map((element) => {
              const pos = elementPosition(element.atomicNumber);
              const family = elementFamily(element.atomicNumber);
              const selectedNow = symbol === element.symbol;
              const faded = !matchingNumbers.has(element.atomicNumber);
              return (
                <button type="button" key={element.symbol}
                  className={"periodic-element" + (selectedNow ? " is-selected" : "") + (faded ? " is-muted" : "")}
                  style={{ gridColumn: pos.column, gridRow: pos.row + 1, "--element-accent": FAMILY_COLORS[family] }}
                  aria-label={element.name + ", " + element.symbol + ", atomic number " + element.atomicNumber}
                  aria-pressed={selectedNow} onClick={() => { setSymbol(element.symbol); setMessage(""); }}>
                  <span className="periodic-number">{element.atomicNumber}</span>
                  <strong>{element.symbol}</strong>
                  <span className="periodic-name">{element.name}</span>
                </button>
              );
            })}
            <span className="periodic-fblock" style={{ gridColumn: "1 / 3", gridRow: 9 }}>Lanthanides</span>
            <span className="periodic-fblock" style={{ gridColumn: "1 / 3", gridRow: 10 }}>Actinides</span>
          </div>
        </div>
        <div className="periodic-legend" aria-label="Element family color legend">
          {FAMILIES.map((item) => <span key={item}><i aria-hidden="true" style={{ backgroundColor: FAMILY_COLORS[item] }}/>{item}</span>)}
        </div>
        <p className="interactive-hint">Scroll horizontally on a small screen. Select an element to inspect it; filter controls only highlight candidates and do not alter the scientific data.</p>
        <div className="interactive-detail">
          {selected && <>
            <img src={CHEMISTRY_ELEMENT_ASSETS[selected.atomicNumber - 1].path} alt={"Element tile for " + selected.name} width="160" height="160" />
            <div className="interactive-detail-body">
              <span className="interactive-eyebrow">ELEMENT {selected.atomicNumber}</span>
              <h2>{selected.name} <small>{selected.symbol}</small></h2>
              <p><strong>Family:</strong> {elementFamily(selected.atomicNumber)}</p>
              <p><strong>Period:</strong> {selectedPosition.period}{selectedPosition.group ? " · Group: " + selectedPosition.group : " · f-block series"}</p>
              <p className="interactive-hint">This reference gives element identification and placement, not unverified numerical properties, mass, radii or electron configuration.</p>
            </div>
          </>}
          <div className="interactive-share">
            <button type="button" onClick={() => shareLink(href, setMessage)}>Copy link to this view</button>
            <a href="/assets/chemistry/periodic-table.svg" target="_blank" rel="noopener noreferrer">View static chart</a>
            {message && <p role="status">{message}</p>}
          </div>
        </div>
      </div>
    </>
  );
}

function DiagramExplorer({ route }) {
  const [id, setId] = useState(route.id);
  const [zoom, setZoom] = useState(100);
  const [point, setPoint] = useState(route.point || "");
  const [markers, setMarkers] = useState(true);
  const [message, setMessage] = useState("");
  const info = TOPIC_BY_ID.get(id);
  const points = DIAGRAM_POINTS[id] || [];
  const active = points.find((step) => step.id === point);
  const href = diagramHref(id, point);
  useEffect(() => {
    if (href && window.location.pathname.startsWith("/interactive/"))
      window.history.replaceState(null, "", href);
  }, [href]);
  function chooseDiagram(nextId) {
    if (!TOPIC_BY_ID.has(nextId) || nextId === "periodic-table") return;
    setId(nextId);
    setPoint("");
    setZoom(100);
    setMessage("");
  }
  if (!info) return <p role="alert">That diagram is unavailable.</p>;
  return (
    <>
      <PageHead title={info.title} description={info.description}/>
      <section className="interactive-panel">
        <div className="interactive-controls">
          <label>Diagram
            <select value={id} onChange={(e) => chooseDiagram(e.target.value)}>
              {CHEMISTRY_TOPICS.filter((item) => item.id !== "periodic-table").map((item) =>
                <option value={item.id} key={item.id}>{item.title}</option>)}
            </select>
          </label>
          <label>Zoom
            <input type="range" min="75" max="250" step="25" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Diagram zoom"/>
            <span>{zoom}%</span>
          </label>
          <button type="button" onClick={() => { setZoom(100); setPoint(""); }}>Reset view</button>
          {points.length > 0 && (
            <label className="interactive-checkbox"><input type="checkbox" checked={markers} onChange={(e) => setMarkers(e.target.checked)}/> Show diagram hotspots</label>
          )}
        </div>
        <div className="diagram-scroll" tabIndex={0} aria-label="Scrollable, zoomable diagram">
          <div className="diagram-stage" style={{ width: zoom + "%" }}>
            <img src={info.path} alt={info.alt} draggable={false} />
            {markers && points.map((item, i) => (
              <button type="button" key={item.id}
                className={"diagram-hotspot" + (point === item.id ? " is-selected" : "")}
                style={{ left: item.x + "%", top: item.y + "%" }}
                onClick={() => setPoint(item.id)} aria-label={"Explore " + item.label} aria-pressed={point === item.id}
                title={item.label}>{i + 1}</button>
            ))}
          </div>
        </div>
        <p className="interactive-hint">Adjust zoom, scroll to inspect details, and select a numbered hotspot when available. Original illustrations are schematic, not measured data.</p>
        <div className="interactive-diagram-info">
          <h2>{active ? active.label : "Explore this diagram"}</h2>
          <p>{active ? active.detail : info.description}</p>
          {points.length ? (
            <div className="interactive-chapters" aria-label="Diagram explanation points">
              {points.map((item, i) => (
                <button key={item.id} type="button" className={point === item.id ? "is-selected" : ""}
                  aria-pressed={point === item.id} onClick={() => setPoint(item.id)}>
                  {i + 1}. {item.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="interactive-hint">This illustration currently supports zoom and selection of related diagrams. Detailed guided hotspots are available on selected diagrams.</p>
          )}
          <div className="interactive-share">
            <button type="button" onClick={() => shareLink(href, setMessage)}>Copy link to this view</button>
            <a href={info.path} target="_blank" rel="noopener noreferrer">View static SVG</a>
            {message && <p role="status">{message}</p>}
          </div>
        </div>
      </section>
    </>
  );
}

export default function InteractiveExplorer() {
  const route = typeof window !== "undefined"
    ? parseInteractiveHref(window.location.pathname + window.location.search)
    : null;
  return (
    <main className="interactive-shell">
      {route?.view === "periodic-table"
        ? <PeriodicExplorer route={route}/>
        : route?.view === "diagram"
          ? <DiagramExplorer route={route}/>
          : <>
              <PageHead title="Interactive reference unavailable" description="The selected reference was not recognized." />
              <p role="alert">Check the Markdown link or choose a listed diagram from Prompt Studio.</p>
            </>}
      <footer className="interactive-footer">StudyCade reference illustrations • original CC0 educational schematics • no external image requests</footer>
    </main>
  );
}
