"""Stable subject identifiers and conservative text classification.

These are content labels, never rendering instructions. Mixed material retains the
labels of its individual sections and cards instead of assigning every card MIXED.
"""

import re

SUBJECT_IDENTIFIERS = {
    "general": "GEN",
    "mathematics": "MATH",
    "calculus": "CALC",
    "chemistry": "CHEM",
    "physics": "PHYS",
    "biology": "BIO",
    "history": "HIST",
    "programming": "CODE",
    "languages": "LANG",
    "geography": "GEO",
    "markdown": "MD",
    "mixed": "MIXED",
}
SUBJECTS = tuple(SUBJECT_IDENTIFIERS)
PATTERNS = {
    "calculus": r"\b(?:calculus|derivatives?|differentiat(?:e|ion|ing)|integrals?|integrat(?:e|ion|ing)|differentials?|antiderivatives?|integrands?)\b|\\(?:int|lim)\b|\\frac\s*\{d",
    "chemistry": r"\b(?:chemistry|molar|stoichiometry|ionic|chemical|molecules?|polyatomic|oxidation|redox|covalent|acid[- ]base)\b|\\ce\{",
    "physics": r"\b(?:physics|velocity|acceleration|newton(?:ian)?|momentum|inertia|kinematics|thermodynamics)\b",
    "biology": r"\b(?:biology|mitosis|meiosis|cellular|taxonomy|photosynthesis|organelles?|organisms?|cells?|genetics|dna)\b",
    "history": r"\b(?:history|historical|historians?|revolutions?|timeline|civilizations?|dynast(?:y|ies)|empires?|imperialism|colonialism|renaissance|medieval|industrialization|world war|civil war|treaty|monarch(?:y|ies))\b",
    "programming": r"\b(?:programming|algorithms?|compiler|recursion|data structures?|object[- ]oriented)\b",
    "mathematics": r"\b(?:mathematics|algebra|matri(?:x|ces)|quadratic|geometry|trigonometry|theorem)\b|\\(?:sqrt|sum)\b|\\begin\{[bp]?matrix\}",
    "languages": r"\b(?:linguistics|grammar|conjugation|vocabulary|phonetics|syntax|pronouns?)\b",
    "geography": r"\b(?:geography|cartography|latitude|longitude|continents?|topography)\b",
}


def explicit_subjects(text):
    if not isinstance(text, str):
        return []
    by_id = {identifier: name for name, identifier in SUBJECT_IDENTIFIERS.items()}
    markers = re.findall(r"\[([A-Z]+)\]|\[!SUBJECT\]\s*([A-Z]+)\b", text, re.I)
    found = []
    for bracket, callout in markers:
        name = by_id.get((bracket or callout).upper())
        if name and name not in found:
            found.append(name)
    concrete = [s for s in found if s not in ("general", "mixed")]
    return concrete or found


def detect_subjects(text):
    if not isinstance(text, str):
        return ["general"]
    explicit = explicit_subjects(text)
    if explicit:
        return explicit
    found = [
        name for name, pattern in PATTERNS.items() if re.search(pattern, text, re.I)
    ]
    # Calculus/physics/chemistry notation often uses matrices and algebra incidentally.
    if any(s in found for s in ("calculus", "physics", "chemistry")):
        found = [s for s in found if s != "mathematics"]
    return found or ["general"]


def combine_subjects(values):
    values = list(values)
    concrete = []
    for value in values:
        if (
            value in SUBJECT_IDENTIFIERS
            and value not in ("general", "mixed")
            and value not in concrete
        ):
            concrete.append(value)
    return concrete or (["mixed"] if "mixed" in values else ["general"])


def label_subjects(values):
    values = combine_subjects(values)
    primary = values[0] if len(values) == 1 else "mixed"
    return {
        "subject": primary,
        "subjectIdentifier": SUBJECT_IDENTIFIERS[primary],
        "subjects": values,
    }


def detect_subject(text, override=None):
    if override:
        if override not in SUBJECTS:
            raise ValueError("Choose a supported study subject.")
        return override
    return label_subjects(detect_subjects(text))["subject"]
