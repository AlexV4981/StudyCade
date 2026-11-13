import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ELEMENTS, CHEMISTRY_TOPICS } from "./chemistry-library.js";
import { Content } from "./content.js";
import { buildStudyPrompt } from "./prompts.js";
import {
  elementFamily, elementPosition, periodicHref, diagramHref,
  parseInteractiveHref, DIAGRAM_POINTS,
} from "./interactive-chemistry.js";

test("all 118 elements map to valid non-overlapping periodic-table positions", () => {
  const locations = new Set();
  assert.equal(ELEMENTS.length, 118);
  for (const item of ELEMENTS) {
    const position = elementPosition(item.atomicNumber);
    assert.ok(position);
    assert.ok(position.column >= 1 && position.column <= 18);
    assert.ok(position.row >= 1 && position.row <= 9);
    assert.ok(position.period >= 1 && position.period <= 7);
    const key = position.row + ":" + position.column;
    assert.ok(!locations.has(key), key + " collided");
    locations.add(key);
    assert.ok(elementFamily(item.atomicNumber).length > 4);
  }
  assert.deepEqual(elementPosition(11), { group: 1, period: 3, row: 3, column: 1 });
  assert.deepEqual(elementPosition(17), { group: 17, period: 3, row: 3, column: 17 });
  assert.equal(elementPosition(0), null);
  assert.equal(elementPosition(119), null);
});

test("known local chemistry links survive strict parsing and round trip", () => {
  for (const item of ELEMENTS) {
    const href = periodicHref({ element: item.symbol });
    assert.deepEqual(parseInteractiveHref(href), {
      view: "periodic-table", element: item.symbol,
      trend: "none", group: null, href,
    });
  }
  for (const asset of CHEMISTRY_TOPICS.filter((x) => x.id !== "periodic-table")) {
    const href = diagramHref(asset.id);
    assert.deepEqual(parseInteractiveHref(href), {
      view: "diagram", id: asset.id, point: "", href,
    });
  }
  assert.equal(periodicHref({ element: "Na", trend: "radius", group: 1 }),
    "/interactive/periodic-table?element=Na&trend=radius&group=1");
  assert.equal(parseInteractiveHref(diagramHref("titration-setup", "burette")).point, "burette");
  assert.equal(periodicHref({ element: "madeup" }), null);
  assert.equal(diagramHref("madeup"), null);
});

test("invalid or malicious interactive routes cannot become working links", () => {
  const bad = [
    "https://example.com/interactive/periodic-table",
    "//example.com/interactive/diagram?id=pH-scale",
    "/interactive/diagram?id=../../secrets",
    "/interactive/diagram?id=periodic-table",
    "/interactive/diagram?id=none",
    "/interactive/diagram?id=titration-setup&point=unknown",
    "/interactive/diagram?id=titration-setup&url=https://example.com",
    "/interactive/diagram?id=titration-setup&id=ionic-bonding",
    "/interactive/periodic-table?element=Xx",
    "/interactive/periodic-table?trend=random",
    "/interactive/periodic-table?group=0",
    "/interactive/periodic-table?group=19",
    "/interactive/periodic-table?element=Na&redirect=https://example.com",
    "/interactive/periodic-table#secret",
    "/interactive/%70eriodic-table",
    "/interactive/../../api/cloud/workspace",
    "/interactive/periodic-table/" ,
  ];
  for (const href of bad) assert.equal(parseInteractiveHref(href), null, href);
});

test("Markdown links to interactive chemistry open an isolated tab and are not raw embeds", () => {
  const input = [
    "# [CHEM] Periodic trends",
    "",
    "> [!RECALL]",
    "> State the overall trend in atomic radius.",
    "> [Explore periodic trends](/interactive/diagram?id=periodic-trends)",
    "",
    "> [!ANSWER]",
    "> It generally increases down and to the left.",
    "",
    "[Explore sodium](/interactive/periodic-table?element=Na)",
  ].join("\n");
  const html = renderToStaticMarkup(React.createElement(Content, null, input));
  assert.match(html, /data-interactive="diagram"/);
  assert.match(html, /data-interactive="periodic-table"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /href="\/interactive\/diagram\?id=periodic-trends"/);
  assert.doesNotMatch(html, /<iframe|<script/i);
  const rejected = renderToStaticMarkup(React.createElement(Content, null,
    "[Untrusted diagram](/interactive/diagram?id=not-a-diagram)"));
  assert.match(rejected, /interactive reference unavailable/);
  assert.doesNotMatch(rejected, /href="\/interactive\/diagram/);
});

test("prompt includes only exact local chemistry links and respects independent opt out", () => {
  const doc = {
    id: "test-doc", subject: "chemistry",
    title: "Periodic Trends",
    content: "# [CHEM] Periodic trends\nAtomic radius and first ionization energy.",
  };
  const text = buildStudyPrompt({ documents: [doc], includeImages: false, includeInteractive: true }).text;
  assert.match(text, /13\. INTERACTIVE CHEMISTRY REFERENCES/);
  assert.match(text, /BUILT-IN INTERACTIVE CHEMISTRY LINKS/);
  assert.match(text, /\/interactive\/periodic-table/);
  assert.match(text, /\/interactive\/diagram\?id=periodic-trends/);
  assert.doesNotMatch(text, /BUILT-IN CHEMISTRY VISUALS/);
  assert.match(text, /source evidence/);
  const noLinks = buildStudyPrompt({ documents: [doc], includeInteractive: false }).text;
  assert.match(noLinks, /Do not add interactive-study links/);
  assert.doesNotMatch(noLinks, /BUILT-IN INTERACTIVE CHEMISTRY LINKS/);
  const notChem = buildStudyPrompt({ goal: "World history", includeInteractive: true }).text;
  assert.doesNotMatch(notChem, /BUILT-IN INTERACTIVE CHEMISTRY LINKS \\(local, read-only\\)/);
  assert.match(notChem, /----- BEGIN SOURCE DATA -----/);
});

test("guided diagram points have valid coordinates and stable identifiers", () => {
  const ids = new Set(CHEMISTRY_TOPICS.map((item) => item.id));
  for (const [id, points] of Object.entries(DIAGRAM_POINTS)) {
    assert.ok(ids.has(id), id);
    const unique = new Set();
    for (const point of points) {
      assert.ok(point.x > 0 && point.x < 100);
      assert.ok(point.y > 0 && point.y < 100);
      assert.ok(point.detail.length > 20);
      assert.ok(!unique.has(point.id));
      unique.add(point.id);
      assert.equal(parseInteractiveHref(diagramHref(id, point.id)).point, point.id);
    }
  }
});
