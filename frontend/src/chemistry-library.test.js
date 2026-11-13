import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ELEMENTS, CHEMISTRY_TOPICS, CHEMISTRY_ELEMENT_ASSETS, CHEMISTRY_LIBRARY,
  findChemistryAssets, CHEMISTRY_CATEGORIES, CHEMISTRY_STOCK_REFERENCES,
} from "./chemistry-library.js";
import { resolveStudyImageUrl } from "./StudyImage.js";
import { buildStudyPrompt } from "./prompts.js";

test("reference library covers all 118 distinct elements and 40 topic diagrams", () => {
  assert.equal(ELEMENTS.length, 118);
  assert.equal(CHEMISTRY_TOPICS.length, 40);
  assert.equal(CHEMISTRY_ELEMENT_ASSETS.length, 118);
  assert.equal(CHEMISTRY_LIBRARY.length, 158);
  assert.equal(new Set(ELEMENTS.map((e) => e.symbol)).size, 118);
  assert.deepEqual(ELEMENTS.map((e) => e.atomicNumber), Array.from({length:118},(_,i)=>i+1));
  assert.equal(ELEMENTS[0].name, "Hydrogen");
  assert.equal(ELEMENTS[25].symbol, "Fe");
  assert.equal(ELEMENTS[117].symbol, "Og");
  assert.ok(CHEMISTRY_CATEGORIES.includes("stoichiometry"));
});

test("every catalogued image exists, is locally reachable, and is self-contained", () => {
  const paths = new Set();
  for (const a of CHEMISTRY_LIBRARY) {
    assert.ok(a.alt.length > 24);
    assert.ok(a.path.startsWith("/assets/chemistry/"));
    assert.equal(resolveStudyImageUrl(a.path)?.external, false);
    assert.ok(!paths.has(a.path), "Duplicate path: " + a.path);
    paths.add(a.path);
    const absolute = path.join(process.cwd(),"public",a.path.slice(1));
    assert.ok(fs.existsSync(absolute), a.path);
    const svg = fs.readFileSync(absolute,"utf8");
    assert.ok(svg.includes("<svg") && svg.includes("<title") && svg.includes("<desc"));
    assert.ok(!/<(?:script|foreignObject|image|iframe)\b/i.test(svg));
    assert.ok(!/\b(?:onload|onerror|href)\s*=/i.test(svg));
  }
  const periodic = fs.readFileSync(path.join(process.cwd(),"public/assets/chemistry/periodic-table.svg"),"utf8");
  assert.match(periodic, /all 118 chemical elements/i);
  assert.match(periodic, /Oganesson/); // Chart's accessible description can name an example element.
});

test("curated stock pages are verified CC0 references, never silently fetched", () => {
  assert.equal(CHEMISTRY_STOCK_REFERENCES.length, 10);
  for (const item of CHEMISTRY_STOCK_REFERENCES) {
    assert.match(item.sourcePage, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    assert.equal(item.license, "CC0-1.0");
    assert.equal(item.downloaded, false);
    assert.ok(item.creator.length >= 3);
  }
});

test("concepts and elements can be located by relevant keywords", () => {
  assert.ok(findChemistryAssets("titration equipment").some((a) => a.id==="titration-setup"));
  assert.ok(findChemistryAssets("hydrogen bonding").some((a) => a.id==="hydrogen-bonding"));
  assert.ok(findChemistryAssets("electron configuration").some((a) => a.id==="orbital-filling"));
  assert.ok(findChemistryAssets("Oxygen elemental symbol").some((a) => a.id==="element-008"));
  assert.deepEqual(findChemistryAssets(""), []);
  assert.deepEqual(findChemistryAssets("titration",0), []);
});

test("chemistry study prompts prefer real local paths without external web search", () => {
  const doc = {
    id:"test-chem", title:"Unit 8: Electron configurations",subject:"chemistry",
    content:"# [CHEM] Electron configurations\nOrbital diagrams and Aufbau principle.",
  };
  const text = buildStudyPrompt({documents:[doc],includeImages:true}).text;
  assert.match(text,/BUILT-IN CHEMISTRY VISUALS/);
  assert.match(text,/\/assets\/chemistry\/orbital-filling\.svg/);
  assert.match(text,/Prefer an exact bundled chemistry path/);
  assert.match(text,/symbols rather than photographs/);
  assert.match(text,/----- BEGIN SOURCE DATA -----/);
  const disabled = buildStudyPrompt({documents:[doc],includeImages:false}).text;
  assert.doesNotMatch(disabled,/BUILT-IN CHEMISTRY VISUALS/);
  assert.match(disabled,/Do not search the web for illustrations/);
  const unrelated = buildStudyPrompt({goal:"Practice history chronology.",includeImages:true}).text;
  assert.doesNotMatch(unrelated,/BUILT-IN CHEMISTRY VISUALS/);
});
