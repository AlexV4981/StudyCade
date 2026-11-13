import { ELEMENTS, CHEMISTRY_TOPICS } from "./chemistry-library.js";

const ELEMENT_SYMBOLS = new Map(ELEMENTS.map((item) => [item.symbol.toLowerCase(), item]));
const DIAGRAMS = new Map(CHEMISTRY_TOPICS.map((item) => [item.id, item]));
const MODES = new Set(["none", "radius", "ionization", "electronegativity"]);

// These families and positions follow the existing StudyCade periodic-chart layout.
export function elementFamily(number) {
  if (number === 1) return "Nonmetal";
  if ([2, 10, 18, 36, 54, 86, 118].includes(number)) return "Noble gas";
  if ([3, 11, 19, 37, 55, 87].includes(number)) return "Alkali metal";
  if ([4, 12, 20, 38, 56, 88].includes(number)) return "Alkaline earth metal";
  if ([9, 17, 35, 53, 85, 117].includes(number)) return "Halogen";
  if (number >= 57 && number <= 71) return "Lanthanide";
  if (number >= 89 && number <= 103) return "Actinide";
  if ([5, 14, 32, 33, 51, 52].includes(number)) return "Metalloid";
  if ([6, 7, 8, 15, 16, 34].includes(number)) return "Nonmetal";
  if ((number >= 21 && number <= 30) || (number >= 39 && number <= 48) ||
      (number >= 72 && number <= 80) || (number >= 104 && number <= 112)) return "Transition metal";
  return "Other element";
}

export function elementPosition(number) {
  if (!Number.isInteger(number) || number < 1 || number > 118) return null;
  if (number === 1) return { group: 1, period: 1, row: 1, column: 1 };
  if (number === 2) return { group: 18, period: 1, row: 1, column: 18 };
  let group, period, row;
  if (number <= 10) { group = number <= 4 ? number - 2 : number + 8; period = row = 2; }
  else if (number <= 18) { group = number <= 12 ? number - 10 : number; period = row = 3; }
  else if (number <= 36) { group = number - 18; period = row = 4; }
  else if (number <= 54) { group = number - 36; period = row = 5; }
  else if (number <= 56) { group = number - 54; period = row = 6; }
  else if (number <= 71) { group = null; period = 6; row = 8; }
  else if (number <= 86) { group = number - 68; period = row = 6; }
  else if (number <= 88) { group = number - 86; period = row = 7; }
  else if (number <= 103) { group = null; period = 7; row = 9; }
  else { group = number - 100; period = row = 7; }
  return { group, period, row, column: group ?? (number <= 71 ? number - 54 : number - 86) };
}

export const TREND_DESCRIPTIONS = Object.freeze({
  none: "Select an element to inspect its name, atomic number, group and period.",
  radius: "General atomic-radius tendency: larger toward the lower-left. Exceptions occur; this is not a numerical ranking.",
  ionization: "First ionization energy generally increases toward the upper-right. Exceptions include nitrogen versus oxygen.",
  electronegativity: "Electronegativity generally increases toward the upper-right among bonding atoms. No exact values are implied.",
});

// The points identify parts of the existing 1024×640 SVG artwork, not experimental measurements.
export const DIAGRAM_POINTS = Object.freeze({
  "periodic-trends": [
    { id: "across", label: "Across a period", x: 65, y: 48, detail: "Effective nuclear attraction often increases across a period, while atomic radius generally decreases." },
    { id: "down", label: "Down a group", x: 24, y: 62, detail: "Additional occupied principal levels generally make atoms larger down a group." },
  ],
  "atomic-structure": [
    { id: "nucleus", label: "Nucleus", x: 40, y: 54, detail: "The central nucleus contains protons and neutrons in this schematic." },
    { id: "electrons", label: "Electron region", x: 59, y: 57, detail: "The dashed curves are a visualization aid, not precise electron trajectories." },
  ],
  "electron-shells": [
    { id: "core", label: "Nucleus", x: 40, y: 55, detail: "The diagram shows a neutral sodium atom with 11 electrons." },
    { id: "outer", label: "Outer electron", x: 40, y: 26, detail: "The schematic shell populations are 2, 8 and 1." },
  ],
  "orbital-filling": [
    { id: "1s", label: "1s orbital", x: 26, y: 58, detail: "Carbon's 1s orbital is paired in the illustrated ground-state filling." },
    { id: "2p", label: "2p orbitals", x: 70, y: 59, detail: "The two 2p electrons occupy separate orbitals with parallel spins in this schematic." },
  ],
  "energy-levels": [
    { id: "absorption", label: "Absorption", x: 35, y: 53, detail: "An upward arrow means the atom absorbs energy to reach a higher level." },
    { id: "emission", label: "Emission", x: 60, y: 46, detail: "A downward arrow represents a transition to lower energy and photon emission." },
  ],
  "ionic-bonding": [
    { id: "donor", label: "Sodium", x: 29, y: 52, detail: "The schematic represents sodium losing an electron to form a cation." },
    { id: "acceptor", label: "Chlorine", x: 71, y: 52, detail: "Chlorine gains an electron and forms an anion; oppositely charged ions attract." },
  ],
  "lewis-water": [
    { id: "oxygen", label: "Oxygen", x: 50, y: 55, detail: "Oxygen forms two O–H single bonds in this Lewis structure." },
    { id: "lone-pairs", label: "Lone pairs", x: 50, y: 44, detail: "Two lone electron pairs remain on the oxygen atom." },
  ],
  "pH-scale": [
    { id: "acid", label: "Acidic region", x: 28, y: 51, detail: "Values below 7 are acidic on the illustrative aqueous pH scale at 25 °C." },
    { id: "neutral", label: "Neutral point", x: 50, y: 51, detail: "Pure water is neutral at pH 7 at 25 °C." },
    { id: "base", label: "Basic region", x: 73, y: 51, detail: "Values above 7 are basic on this illustrative scale." },
  ],
  "titration-setup": [
    { id: "burette", label: "Burette", x: 46, y: 46, detail: "The burette dispenses titrant in a controlled amount." },
    { id: "flask", label: "Flask", x: 46, y: 74, detail: "The Erlenmeyer flask contains the solution being titrated." },
  ],
  "titration-curve": [
    { id: "equivalence", label: "Equivalence region", x: 54, y: 48, detail: "For an ideal strong acid–strong base titration near 25 °C, the equivalence point is near pH 7." },
  ],
  "heating-curve": [
    { id: "melting", label: "Melting plateau", x: 33, y: 62, detail: "At approximately 1 atm, pure water melts at about 0 °C." },
    { id: "boiling", label: "Boiling plateau", x: 60, y: 45, detail: "At approximately 1 atm, pure water boils at about 100 °C." },
  ],
  "activation-energy": [
    { id: "uncatalyzed", label: "Higher barrier", x: 45, y: 39, detail: "The uncatalyzed pathway has a higher activation-energy barrier." },
    { id: "catalyzed", label: "Lower barrier", x: 45, y: 51, detail: "The catalyst lowers activation energy without changing the reaction's overall enthalpy change." },
  ],
});

export function periodicHref({ element, trend, group } = {}) {
  const parameters = new URLSearchParams();
  if (element) {
    const match = ELEMENT_SYMBOLS.get(String(element).toLowerCase());
    if (!match) return null;
    parameters.set("element", match.symbol);
  }
  if (trend && trend !== "none") {
    if (!MODES.has(trend)) return null;
    parameters.set("trend", trend);
  }
  if (group !== undefined && group !== null && group !== "") {
    const n = Number(group);
    if (!Number.isInteger(n) || n < 1 || n > 18) return null;
    parameters.set("group", String(n));
  }
  const query = parameters.toString();
  return "/interactive/periodic-table" + (query ? "?" + query : "");
}
export function diagramHref(id, point = "") {
  if (!DIAGRAMS.has(id) || id === "periodic-table") return null;
  const parameters = new URLSearchParams({ id });
  if (point) {
    if (!(DIAGRAM_POINTS[id] || []).some((entry) => entry.id === point)) return null;
    parameters.set("point", point);
  }
  return "/interactive/diagram?" + parameters.toString();
}

// No arbitrary URL, percent-encoded path tricks, fragments, extra params or off-site redirects.
export function parseInteractiveHref(href) {
  if (typeof href !== "string" || href.length > 300 ||
      !/^\/interactive\/(?:periodic-table|diagram)(?:\?|$)/.test(href) ||
      /[\u0000-\u001f\\#]/.test(href)) return null;
  let url;
  try { url = new URL(href, "https://studycade.invalid"); } catch { return null; }
  if (url.origin !== "https://studycade.invalid") return null;
  const keys = [...url.searchParams.keys()];
  if (new Set(keys).size !== keys.length) return null;
  if (url.pathname === "/interactive/periodic-table") {
    if (keys.some((key) => !["element", "trend", "group"].includes(key))) return null;
    const element = url.searchParams.get("element") || "";
    const trend = url.searchParams.get("trend") || "none";
    const group = url.searchParams.get("group") || "";
    const canonical = periodicHref({ element, trend, group });
    return canonical ? { view: "periodic-table", element: element ? ELEMENT_SYMBOLS.get(element.toLowerCase()).symbol : "", trend, group: group ? Number(group) : null, href: canonical } : null;
  }
  if (url.pathname === "/interactive/diagram") {
    if (keys.some((key) => !["id", "point"].includes(key))) return null;
    const id = url.searchParams.get("id") || "";
    const point = url.searchParams.get("point") || "";
    const canonical = diagramHref(id, point);
    return canonical ? { view: "diagram", id, point, href: canonical } : null;
  }
  return null;
}
