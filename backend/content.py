"""Canonical, lossless content ingestion. Presentation is owned by React Content.

Markdown is parsed with markdown-it, never rendered into trusted HTML here.
Generated cards are extractive suggestions with section/line provenance.
"""

from __future__ import annotations

import csv
import hashlib
import io
import re
from pathlib import PurePath
from urllib.parse import unquote, urlsplit

from markdown_it import MarkdownIt

MAX_BYTES = 2_000_000
from .subjects import (
    SUBJECTS,
    detect_subject,
    detect_subjects,
    label_subjects,
    combine_subjects,
    explicit_subjects,
)

PARSER = MarkdownIt("commonmark", {"html": False, "maxNesting": 32}).enable("table")


def safe_source_name(name: str) -> str:
    if not isinstance(name, str) or not name.strip() or len(name) > 120:
        raise ValueError("Provide a filename of 1–120 characters.")
    if (
        name.startswith(".")
        or any(c in name for c in "/\\\x00")
        or any(ord(c) < 32 for c in name)
    ):
        raise ValueError(
            "Use a filename without path separators or control characters."
        )
    return name.strip()


def _card(term, answer, section, name, subject, kind="extract"):
    return {
        "term": term.strip(),
        "definition": answer.strip(),
        "explanation": "",
        "hints": [],
        "subject": subject,
        "tags": [],
        "difficulty": "unrated",
        "provenance": {
            "filename": name,
            "sectionId": section["id"],
            "lineStart": section["lineStart"],
            "lineEnd": section["lineEnd"],
            "generated": True,
            "method": kind,
        },
    }


def _suggest_cards(source, sections, name, subject):
    cards, seen = [], set()
    for section in sections:
        tokens = PARSER.parse(section["content"])
        pending = None
        fragments = []
        for token in tokens:
            if token.type == "inline":
                fragments.extend(
                    part.strip()
                    for part in re.split(
                        r"(?m)(?=^\[!(?:RECALL|ANSWER)\])", token.content
                    )
                    if part.strip()
                )
        for text in fragments:
            # Existing StudyCade recap callouts pair retrieval questions with literal answers.
            if text.upper().startswith("[!RECALL]"):
                pending = re.sub(r"^\[!RECALL\]\s*", "", text, flags=re.I).strip()
            elif text.upper().startswith("[!ANSWER]") and pending:
                answer = re.sub(r"^\[!ANSWER\]\s*", "", text, flags=re.I).strip()
                if answer:
                    cards.append(
                        _card(pending, answer, section, name, subject, "recall-callout")
                    )
                pending = None
            else:
                # Bold definitions are explicit source relationships, not invented facts.
                match = re.match(
                    r"^\*\*(.{1,300}?)\*\*\s*(?::|—|\s-\s)\s*(.+)$", text, re.S
                )
                if match:
                    cards.append(
                        _card(match[1], match[2], section, name, subject, "definition")
                    )
        # A question heading with its exact body is also an extractive pair.
        if section["title"].rstrip().endswith("?"):
            body = section["content"].split("\n", 1)[-1].strip()
            if body:
                cards.append(
                    _card(
                        section["title"],
                        body,
                        section,
                        name,
                        subject,
                        "question-heading",
                    )
                )
    unique = []
    for card in cards:
        key = (card["term"].casefold(), card["definition"])
        if key not in seen:
            unique.append(card)
            seen.add(key)
    return unique[:2000]


def preview_document(name: str, content: str, subject: str | None = None) -> dict:
    # The import form's auto-detect option submits an empty value.
    subject = subject or None
    name = safe_source_name(name)
    suffix = PurePath(name).suffix.lower()
    if suffix not in {".md", ".markdown", ".txt", ".csv", ".tsv"}:
        raise ValueError(
            "Use Markdown, text, CSV or TSV. Extract PDFs with python -m backend.ingest first."
        )
    if not isinstance(content, str) or not content.strip():
        raise ValueError("This file is empty. Choose a document with readable text.")
    if len(content.encode("utf-8")) > MAX_BYTES:
        raise ValueError("Choose a file under 2 MB.")
    if "\x00" in content:
        raise ValueError(
            "Binary or NUL-containing files are unsupported. Choose UTF-8 text."
        )
    original = content
    source = content.replace("\r\n", "\n").replace("\r", "\n").removeprefix("\ufeff")
    warnings = []
    detected = detect_subject(source, subject)
    if suffix in {".csv", ".tsv"}:
        delimiter = "\t" if suffix == ".tsv" else ","
        try:
            rows = list(
                csv.reader(io.StringIO(source), delimiter=delimiter, strict=True)
            )
        except csv.Error as exc:
            raise ValueError(f"Invalid delimited data: {exc}") from exc
        rows = [r for r in rows if any(x.strip() for x in r)]
        if (
            rows
            and len(rows[0]) == 2
            and rows[0][0].lower() in {"term", "front", "question"}
            and rows[0][1].lower() in {"definition", "back", "answer"}
        ):
            rows.pop(0)
        if not rows or len(rows) > 2000:
            raise ValueError("Import between 1 and 2,000 term/definition rows.")
        if any(len(row) != 2 or not all(x.strip() for x in row) for row in rows):
            raise ValueError("Every row needs exactly two non-empty columns.")
        if any(len(r[0]) > 500 or len(r[1]) > 4000 for r in rows):
            raise ValueError(
                "Terms must be under 500 characters and answers under 4,000."
            )
        if len({r[0].strip().casefold() for r in rows}) != len(rows):
            raise ValueError("Each term must be unique within a deck.")
        section = {
            "id": "section-1",
            "title": PurePath(name).stem,
            "level": 1,
            "content": source,
            "lineStart": 1,
            "lineEnd": len(source.splitlines()),
        }
        cards = [
            _card(r[0], r[1], section, name, detected, "delimited-source") for r in rows
        ]
        return _label_document(
            {
                "version": 2,
                "name": name,
                "title": PurePath(name).stem,
                "subject": detected,
                "source": original,
                "content": original,
                "sections": [section],
                "cards": cards,
                "warnings": warnings,
                "hash": hashlib.sha256(original.encode()).hexdigest(),
            },
            subject,
        )
    tokens = PARSER.parse(source)
    lines = source.splitlines(keepends=True)
    headings = []
    for i, token in enumerate(tokens):
        if token.type == "heading_open" and token.map:
            headings.append((token.map[0], int(token.tag[1:]), tokens[i + 1].content))
    title = headings[0][2] if headings else PurePath(name).stem
    boundaries = headings if headings else [(0, 1, title)]
    if boundaries[0][0] > 0:
        boundaries.insert(0, (0, 1, "Introduction"))
    sections = []
    for n, (start, level, heading) in enumerate(boundaries):
        end = boundaries[n + 1][0] if n + 1 < len(boundaries) else len(lines)
        sections.append(
            {
                "id": f"section-{n + 1}",
                "title": heading,
                "level": level,
                "content": "".join(lines[start:end]),
                "lineStart": start + 1,
                "lineEnd": end,
            }
        )
    if len(sections) > 2000:
        raise ValueError(
            "Document has over 2,000 sections. Split it into smaller files."
        )
    # Warnings never change or discard the original source.
    if re.search(r"<\s*(?:script|iframe|img|style|svg|[a-z]+\b)", source, re.I):
        warnings.append(
            "Raw HTML is shown as text. Embedded HTML and scripts are never executed."
        )
    for token in tokens:
        for child in token.children or []:
            if child.type == "image":
                target = unquote(child.attrGet("src") or "")
                warnings.append(
                    f"Image reference preserved, but not loaded automatically: {target[:160]}. Attachments are not imported."
                )
            if child.type == "link_open":
                target = unquote(child.attrGet("href") or "")
                scheme = urlsplit(target).scheme.lower()
                if scheme not in {"https", "http", "mailto"} and not target.startswith(
                    "#"
                ):
                    warnings.append(
                        f"Relative or unsupported link preserved as text: {target[:160]}."
                    )
    if re.search(r"!\[|\]\((?:javascript|data|file):", source, re.I) and not warnings:
        warnings.append(
            "Unsafe or unsupported resource references are displayed without loading them."
        )
    if re.search(r"\\(?:includegraphics|input|htmlClass|href|require)\b", source):
        warnings.append(
            "Trusted LaTeX commands are disabled. Unsupported notation remains visible."
        )
    if (
        source.count("$$") % 2
        or source.count(r"\[") != source.count(r"\]")
        or source.count(r"\(") != source.count(r"\)")
    ):
        warnings.append(
            "Some math delimiters may be unclosed. Check the preview; original notation is retained."
        )
    if any(
        t.type == "fence"
        and t.map
        and t.map[1] == len(lines)
        and not re.match(r"^\s*(`{3,}|~{3,})\s*$", lines[-1].strip())
        for t in tokens
    ):
        warnings.append("A code fence may be unclosed. Check the last code block.")
    cards = _suggest_cards(source, sections, name, detected)
    if not cards:
        warnings.append(
            "No explicit flashcard pairs found. Read as notes, or add **Term**: definition or RECALL/ANSWER callouts."
        )
    if any(len(c["term"]) > 500 or len(c["definition"]) > 4000 for c in cards):
        cards = [
            c for c in cards if len(c["term"]) <= 500 and len(c["definition"]) <= 4000
        ]
        warnings.append(
            "Oversized card suggestions were excluded; all original content remains in notes."
        )
    return _label_document(
        {
            "version": 2,
            "name": name,
            "title": title[:100],
            "subject": detected,
            "source": original,
            "content": original,
            "sections": sections,
            "cards": cards,
            "warnings": list(dict.fromkeys(warnings)),
            "hash": hashlib.sha256(original.encode()).hexdigest(),
        },
        subject,
    )


def _label_document(document, override=None):
    """Apply labels at document, section and card scopes without modifying source."""
    section_by_id = {}
    for section in document["sections"]:
        local = detect_subjects(section["content"])
        if local == ["general"] and override not in (None, "mixed", "general"):
            local = [override]
        section.update(label_subjects(local))
        section_by_id[section["id"]] = section
    for card in document["cards"]:
        section = section_by_id.get(card.get("provenance", {}).get("sectionId"), {})
        explicit = explicit_subjects(section.get("content", ""))
        local = explicit or detect_subjects(card["term"] + "\n" + card["definition"])
        if local == ["general"]:
            local = section.get("subjects", ["general"])
        if local == ["general"] and override not in (None, "mixed", "general"):
            local = [override]
        card.update(label_subjects(local))
    topics = combine_subjects(
        detect_subjects(document["source"])
        + [s for section in document["sections"] for s in section["subjects"]]
    )
    if topics == ["general"] and override not in (None, "mixed", "general"):
        topics = [override]
    document.update(label_subjects(topics))
    if document["subject"] == "mixed":
        names = ", ".join(document["subjects"])
        document["warnings"].append(
            f"Mixed subjects detected ({names}). Each section and card retains its own subject identifier; review the labels before studying."
        )
    if override not in (None, "mixed", "general") and any(
        topic != override for topic in topics
    ):
        document["warnings"].append(
            "The selected subject differs from detected content. Source-specific subject labels are retained for review."
        )
    document["warnings"] = list(dict.fromkeys(document["warnings"]))
    return document
