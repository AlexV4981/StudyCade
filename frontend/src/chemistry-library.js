// Original StudyCade reference artwork metadata. No scraped files or user-specific content.
// Element names/symbols are checked against IUPAC; no atomic weights are implied here.
const ELEMENT_NAMES = [
  'H:Hydrogen','He:Helium','Li:Lithium','Be:Beryllium','B:Boron','C:Carbon','N:Nitrogen','O:Oxygen','F:Fluorine','Ne:Neon',
  'Na:Sodium','Mg:Magnesium','Al:Aluminium','Si:Silicon','P:Phosphorus','S:Sulfur','Cl:Chlorine','Ar:Argon',
  'K:Potassium','Ca:Calcium','Sc:Scandium','Ti:Titanium','V:Vanadium','Cr:Chromium','Mn:Manganese','Fe:Iron','Co:Cobalt','Ni:Nickel','Cu:Copper','Zn:Zinc',
  'Ga:Gallium','Ge:Germanium','As:Arsenic','Se:Selenium','Br:Bromine','Kr:Krypton',
  'Rb:Rubidium','Sr:Strontium','Y:Yttrium','Zr:Zirconium','Nb:Niobium','Mo:Molybdenum','Tc:Technetium','Ru:Ruthenium','Rh:Rhodium','Pd:Palladium','Ag:Silver','Cd:Cadmium',
  'In:Indium','Sn:Tin','Sb:Antimony','Te:Tellurium','I:Iodine','Xe:Xenon',
  'Cs:Caesium','Ba:Barium','La:Lanthanum','Ce:Cerium','Pr:Praseodymium','Nd:Neodymium','Pm:Promethium','Sm:Samarium','Eu:Europium','Gd:Gadolinium','Tb:Terbium','Dy:Dysprosium','Ho:Holmium','Er:Erbium','Tm:Thulium','Yb:Ytterbium','Lu:Lutetium',
  'Hf:Hafnium','Ta:Tantalum','W:Tungsten','Re:Rhenium','Os:Osmium','Ir:Iridium','Pt:Platinum','Au:Gold','Hg:Mercury',
  'Tl:Thallium','Pb:Lead','Bi:Bismuth','Po:Polonium','At:Astatine','Rn:Radon',
  'Fr:Francium','Ra:Radium','Ac:Actinium','Th:Thorium','Pa:Protactinium','U:Uranium','Np:Neptunium','Pu:Plutonium','Am:Americium','Cm:Curium','Bk:Berkelium','Cf:Californium','Es:Einsteinium','Fm:Fermium','Md:Mendelevium','No:Nobelium','Lr:Lawrencium',
  'Rf:Rutherfordium','Db:Dubnium','Sg:Seaborgium','Bh:Bohrium','Hs:Hassium','Mt:Meitnerium','Ds:Darmstadtium','Rg:Roentgenium','Cn:Copernicium','Nh:Nihonium','Fl:Flerovium','Mc:Moscovium','Lv:Livermorium','Ts:Tennessine','Og:Oganesson',
];
export const ELEMENTS = ELEMENT_NAMES.map((row, index) => {
  const [symbol, name] = row.split(':');
  return Object.freeze({ atomicNumber: index + 1, symbol, name });
});
// Catalogue categories are educational topics, not user-specific chapters.
const TOPIC_ROWS = [
 ['periodic-table','Periodic table: 118 elements','periodic','periodic table groups elements atomic numbers symbols','All 118 symbols, numbers, family colors and f-block'],
 ['periodic-trends','Periodic trends','periodic','atomic radius ionization energy electronegativity periodic trend','Main-group qualitative trends, with stated exceptions'],
 ['isotope-notation','Isotope and ion notation','atomic','isotopes mass number atomic number nuclides ions','Upper/lower nuclear notation and neutron counting'],
 ['atomic-structure','Atomic structure','atomic','proton neutron electron nucleus atom','Nucleus and surrounding electron cloud — schematic'],
 ['electron-shells','Electron shells: sodium','atomic','bohr shell electrons sodium 2 8 1','Sodium shell populations; schematic, not an orbital picture'],
 ['orbital-shapes','s and p orbital shapes','atomic','electron probability s orbital p orbital','Schematic electron-probability regions'],
 ['orbital-filling','Orbital filling and spin','atomic','aufbau hund pauli electron configuration orbital diagrams','Boxes and arrows for 1s, 2s and 2p'],
 ['photon-spectrum','Wavelength and photon energy','atomic','photon electromagnetic spectrum wavelength frequency energy light','Shorter wavelength corresponds to greater photon energy'],
 ['energy-levels','Electronic transitions','atomic','bohr transitions absorption emission energy level n','Energy-level arrows for absorption and emission'],
 ['ionic-bonding','Ionic bonding','bonding','ionic bonding sodium chloride NaCl cation anion','Electron transfer and ion attraction represented schematically'],
 ['covalent-bonding','Covalent bond orders','bonding','covalent bond single double triple shared electrons','H–H, O=O and N≡N as bond-order examples'],
 ['lewis-water','Lewis structure of water','bonding','lewis dot H2O electron pairs lone pairs','Two O–H bonds and two lone pairs on oxygen'],
 ['molecular-shapes','VSEPR geometry','bonding','VSEPR molecular geometry bent linear trigonal tetrahedral','Common molecular geometries and approximate angles'],
 ['hydrogen-bonding','Hydrogen bonding in water','bonding','hydrogen bond intermolecular force water polarity','Intermolecular dotted connection between water molecules'],
 ['mole-conversions','Mole conversions','stoichiometry','mole molar mass avogadro particles grams','Connect mass, molar amount and number of entities'],
 ['balanced-reaction','Balancing chemical equations','stoichiometry','balancing equation chemical reaction conservation hydrogen oxygen water','2 H₂ + O₂ → 2 H₂O particle counting'],
 ['limiting-reactant','Limiting reactant','stoichiometry','limiting reagent excess reactant stoichiometry','One O₂ limits water formed from four H₂'],
 ['reaction-types','Types of chemical reactions','stoichiometry','synthesis decomposition single replacement combustion','General reaction patterns'],
 ['stoichiometry-map','Stoichiometry workflow','stoichiometry','mole ratio grams to moles reaction coefficients','Known mass → mol A → mol B → unknown mass'],
 ['states-of-matter','States of matter','matter','solid liquid gas particles phase state','Schematic relative particle arrangement'],
 ['heating-curve','Heating curve of water','matter','heating curve melting boiling phase change temperature','Water near 1 atm; melting at 0 °C and boiling at 100 °C'],
 ['phase-diagram','Generic phase diagram','matter','phase diagram triple point critical point pressure temperature','Generic substance; not a water-specific diagram'],
 ['boyle-law','Boyle and Charles gas laws','gases','boyle law charles law pressure volume temperature','Qualitative P–V inverse and V–T direct relationships'],
 ['ideal-gas-law','Ideal gas particles and PV=nRT','gases','ideal gas law kinetic molecular theory gas pressure container','Particles, container, collision and ideal-gas relation'],
 ['molarity','Molarity and solution volume','solutions','molarity moles solute liter solution concentration','M = n / V for the final solution volume'],
 ['dilution','Solution dilution','solutions','dilution M1V1 M2V2 concentration','Same solute amount before and after adding solvent'],
 ['solubility','Solubility versus temperature','solutions','solubility curve saturated unsaturated temperature','Illustrative generic solubility trend — not a measured compound'],
 ['pH-scale','Acid-base pH scale','acids','acid base pH scale strong weak hydrogen ions','pH scale 0–14, neutral pH 7 at 25 °C for water'],
 ['titration-setup','Acid-base titration apparatus','acids','titration burette flask indicator endpoint','Burette into Erlenmeyer flask — apparatus schematic'],
 ['titration-curve','Strong acid–base titration curve','acids','titration curve equivalence point strong acid strong base','Illustrative strong acid–strong base endpoint near pH 7 at 25 °C'],
 ['calorimetry','Coffee-cup calorimetry','thermochemistry','calorimetry heat specific heat q m c delta t','Insulated cup, thermometer and heat calculation'],
 ['enthalpy','Reaction enthalpy','thermochemistry','enthalpy exothermic endothermic energy diagram','Energy levels and signed ΔH for reactions'],
 ['hess-law','Hess law pathway','thermochemistry','hess law enthalpy formation sum paths','Enthalpy difference independent of reaction path'],
 ['activation-energy','Activation energy with a catalyst','kinetics','reaction coordinate activation energy catalyst kinetics','Catalyst lowers the barrier without changing reaction ΔH'],
 ['equilibrium','Dynamic equilibrium','equilibrium','chemical equilibrium forward reverse rates le chatelier','Equal forward/reverse rates at dynamic equilibrium'],
 ['galvanic-cell','Galvanic zinc–copper cell','electrochemistry','galvanic cell electrochemical redox voltaic cell electron flow','Zn anode → electrons → Cu cathode and salt bridge'],
 ['redox','Oxidation and reduction','electrochemistry','oxidation reduction OIL RIG electron transfer','Oxidation loses e⁻; reduction gains e⁻'],
 ['nuclear-decay','Alpha beta and gamma radiation','nuclear','radioactivity alpha beta gamma nuclear reaction','Types and simple nuclear-emission notation'],
 ['laboratory-glassware','Common laboratory glassware','laboratory','beaker graduated cylinder burette volumetric flask','Major glassware silhouettes; no scale calibration'],
 ['solution-hydration','Hydration of dissolved ions','solutions','hydration dissolution ions polar water solvation','Water orientation around cations and anions'],
];
export const CHEMISTRY_TOPICS = TOPIC_ROWS.map(([id, title, category, keywords, description]) => Object.freeze({
  id, title, category, keywords: keywords.split(' '), description,
  path: '/assets/chemistry/' + id + '.svg',
  alt: title + '. ' + description,
  license: 'CC0-1.0',
  creator: 'StudyCade original vector illustration',
}));
const groups = ['periodic','atomic','bonding','stoichiometry','matter','gases','solutions','acids','thermochemistry','kinetics','equilibrium','electrochemistry','nuclear','laboratory'];
export const CHEMISTRY_CATEGORIES = Object.freeze(groups);
export const CHEMISTRY_ELEMENT_ASSETS = ELEMENTS.map((element) => Object.freeze({
  id: 'element-' + String(element.atomicNumber).padStart(3, '0'),
  category: 'elements',
  title: element.name + ' (' + element.symbol + ')',
  atomicNumber: element.atomicNumber,
  symbol: element.symbol,
  path: '/assets/chemistry/elements/' + String(element.atomicNumber).padStart(3, '0') + '-' + element.symbol.toLowerCase() + '.svg',
  alt: 'Element ' + element.atomicNumber + ': ' + element.name + ', symbol ' + element.symbol + '. Periodic-table tile, not a photo.',
  license: 'CC0-1.0',
  creator: 'StudyCade original vector illustration',
}));
export const CHEMISTRY_LIBRARY = Object.freeze([...CHEMISTRY_TOPICS, ...CHEMISTRY_ELEMENT_ASSETS]);
export function findChemistryAssets(query, max = 12) {
  const tokens = String(query || '').toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) || [];
  if (!tokens.length || max < 1) return [];
  return CHEMISTRY_LIBRARY.map((asset) => {
    const search = new Set((asset.keywords || []).map((x) => x.toLowerCase()));
    for (const word of asset.title.toLowerCase().match(/[a-z][a-z0-9-]+/g) || []) search.add(word);
    if (asset.symbol) search.add(asset.symbol.toLowerCase());
    let score = tokens.reduce((sum, token) => sum + (search.has(token) ? 2 : 0), 0);
    if (asset.atomicNumber && tokens.includes(String(asset.atomicNumber))) score += 2;
    return { asset, score };
  }).filter((candidate) => candidate.score > 0).sort((a, b) => b.score - a.score || a.asset.title.localeCompare(b.asset.title))
    .slice(0, Math.min(Math.max(0, max), 24)).map((candidate) => candidate.asset);
}

// Public stock reference pages verified individually on Wikimedia Commons.
// These are NOT bundled photos: retain the creator, page and CC0 licensing when reusing.
const STOCK_ROWS = [
 ['Element sample collection','photographs','Arònel123','Element_samples.jpg','Al, Cu, Zn, Ga, Nb, In, C, P and S samples'],
 ['Sodium metal sample','photographs','Nefronus','Sodium_sample.jpg','Freshly cut elemental sodium'],
 ['Copper crystal','photographs','范皓程','Copper_crystal.jpg','Electrolytic copper crystal'],
 ['Titration in progress','laboratory','Alyc321','Titration_of_sulphites_-_initial_step_of_titration.jpg','Real titration setup'],
 ['Ascorbic acid titration setup','laboratory','I zeneizi','Ascorbic_acid_titration_on_juices_-_the_tools_and_reagents.jpg','Titration tools and reagents'],
 ['Volumetric flask photograph','laboratory','Goodymeraj','Laboratory_apparatus_01.jpg','500 cm³ volumetric flask'],
 ['Heating laboratory flask','laboratory','Jahra Tasfia Reza','Laboratory_experiments.jpg','Flat-bottomed flask on a heated support'],
 ['Chemistry laboratory photograph','laboratory','Hussy~B','Chemistry_lab_01.jpg','Chemistry lab sample analysis area'],
 ['CC0 simple periodic table','reference','Offnfopt','Simple_Periodic_Table_Chart.svg','Reusable external periodic chart'],
 ['CC0 basic periodic table','reference','SCB2024','Basic_Periodic_Table.jpg','Reusable external periodic chart'],
];
export const CHEMISTRY_STOCK_REFERENCES = Object.freeze(STOCK_ROWS.map(([title, category, creator, filename, description]) => Object.freeze({
  title, category, creator, description,
  license: 'CC0-1.0',
  sourcePage: 'https://commons.wikimedia.org/wiki/File:' + filename,
  downloaded: false,
})));
