"""Bound and validate cloud snapshots before storing or rendering untrusted JSON."""

import json
import math
import re
from datetime import datetime

from fastapi import HTTPException

from .subjects import SUBJECTS

MAX_STATE = 20_000_000
UNSAFE = {"__proto__", "prototype", "constructor", "$$typeof"}


def invalid():
    raise HTTPException(400, "Invalid cloud workspace. Restore a valid StudyCade backup or correct the material.")


def validate_workspace(state):
    def tree(value, depth=0):
        if depth > 32:
            invalid()
        if value is None or isinstance(value, (str, bool)):
            return
        if isinstance(value, (int, float)):
            if abs(value) > 2**53 - 1 or not math.isfinite(value):
                invalid()
            return
        if isinstance(value, list):
            if len(value) > 100_000:
                invalid()
            for item in value:
                tree(item, depth + 1)
        elif isinstance(value, dict):
            if len(value) > 500 or any(k in UNSAFE for k in value):
                invalid()
            for item in value.values():
                tree(item, depth + 1)
        else:
            invalid()

    def obj(value):
        if not isinstance(value, dict):
            invalid()
        return value

    def string(value, limit, empty=False):
        if not isinstance(value, str) or len(value) > limit or (not empty and not value.strip()):
            invalid()
        return value

    def array(value, limit):
        if not isinstance(value, list) or len(value) > limit:
            invalid()
        return value

    def integer(value, low=0, high=2**53 - 1):
        if type(value) is not int or not low <= value <= high:
            invalid()
        return value

    def name(value):
        string(value, 160)
        if value in (".", "..") or re.search(r"[\\/\x00-\x1f]", value):
            invalid()

    subjects = set(SUBJECTS)

    def labels(value):
        if value.get("subject", "general") not in subjects:
            invalid()
        if "subjects" in value:
            if any(s not in subjects for s in array(value["subjects"], 12)):
                invalid()
        for w in array(value.get("warnings", []), 1000):
            string(w, 5000)

    tree(state)
    obj(state)
    if set(state) != {"version", "nextCard", "sets", "documents", "files", "progress", "attempts", "schedules"}:
        invalid()
    if len(json.dumps(state, ensure_ascii=False, separators=(",", ":")).encode()) > MAX_STATE:
        raise HTTPException(413, "Cloud workspace exceeds 20 MB. Export a backup and remove unused material.")
    if type(state.get("version")) is not int or state["version"] != 1:
        invalid()
    integer(state.get("nextCard"), 2)
    for key in ("sets", "documents", "files", "progress", "attempts", "schedules"):
        array(state.get(key), {"sets": 1000, "documents": 250, "files": 250, "progress": 1000, "schedules": 10_000}.get(key, 100_000))
    doc_ids, sections, set_ids, set_cards, card_ids = set(), {}, set(), {}, set()

    def cards(values):
        ids = set()
        for card in array(values, 2000):
            obj(card)
            cid = integer(card.get("id"), 1)
            if cid in ids or cid in card_ids or cid >= state["nextCard"]:
                invalid()
            ids.add(cid)
            card_ids.add(cid)
            if len(card_ids) > 10_000:
                raise HTTPException(413, "Cloud workspace supports at most 10,000 cards, including note suggestions.")
            string(card.get("term"), 10_000)
            string(card.get("definition"), 20_000)
            for key, limit in (("explanation", 20_000), ("originalTerm", 10_000), ("difficulty", 100)):
                if key in card:
                    string(card[key], limit, True)
            for key, count, limit in (("hints", 50, 10_000), ("tags", 100, 100), ("topics", 100, 200)):
                for item in array(card.get(key, []), count):
                    string(item, limit, True)
            if "studyStatus" in card and card["studyStatus"] not in ("red", "yellow", "green"):
                invalid()
            labels(card)
            if "metadata" in card:
                obj(card["metadata"])
            if "provenance" in card:
                p = obj(card["provenance"])
                for key, limit in (("filename", 160), ("sectionId", 200), ("documentId", 150), ("method", 100)):
                    if key in p:
                        string(p[key], limit)
                for key in ("lineStart", "lineEnd"):
                    if key in p:
                        integer(p[key], 1, 2_000_000)
                if "generated" in p and type(p["generated"]) is not bool:
                    invalid()
        return ids

    for doc in state["documents"]:
        obj(doc)
        did = string(doc.get("id"), 150)
        if did in doc_ids:
            invalid()
        doc_ids.add(did)
        string(doc.get("title"), 200)
        labels(doc)
        for key in ("name", "filename", "folder"):
            if key in doc:
                name(doc[key])
        for key in ("content", "source"):
            if key in doc:
                string(doc[key], 2_000_000, True)
                if len(doc[key].encode()) > 2_000_000:
                    invalid()
        section_ids = set()
        for section in array(doc.get("sections"), 2000):
            obj(section)
            sid = string(section.get("id"), 200)
            if sid in section_ids:
                invalid()
            section_ids.add(sid)
            string(section.get("title"), 1000, True)
            string(section.get("content"), 2_000_000, True)
            integer(section.get("level", 2), 1, 6)
            labels(section)
        if "lastSectionId" in doc and doc["lastSectionId"] is not None and (not isinstance(doc["lastSectionId"], str) or doc["lastSectionId"] not in section_ids):
            invalid()
        if "lastReadAt" in doc:
            stamp = string(doc["lastReadAt"], 50)
            try:
                parsed = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
                if parsed.tzinfo is None:
                    invalid()
            except ValueError:
                invalid()
        sections[did] = section_ids
        for review in array(doc.get("reviews", []), 4000):
            obj(review)
            if review.get("sectionId") not in section_ids or type(review.get("reviewed")) is not bool:
                invalid()
            if "questionId" in review and (not isinstance(review["questionId"], str) or not re.fullmatch(r"q[1-9]\d{0,3}", review["questionId"]) or int(review["questionId"][1:]) > 2000):
                invalid()
            if review.get("confidence", "") not in ("", "red", "yellow", "green"):
                invalid()
        cards(doc.get("cards", []))
    for deck in state["sets"]:
        obj(deck)
        sid = string(deck.get("id"), 150)
        if sid in set_ids:
            invalid()
        set_ids.add(sid)
        string(deck.get("title"), 100)
        if deck.get("visibility") != "private" or type(deck.get("builtin")) is not bool:
            invalid()
        if deck["builtin"] and sid != "welcome":
            invalid()
        labels(deck)
        if any(d not in doc_ids for d in array(deck.get("documentIds", []), 250)):
            invalid()
        set_cards[sid] = cards(deck.get("cards"))
        # Display provenance is never an authorization identity.
        deck["owner"] = "guest@studycade.local"
    for container in state["sets"] + state["documents"]:
        for card in container.get("cards", []):
            p = card.get("provenance", {})
            if "documentId" in p and p["documentId"] not in doc_ids:
                invalid()
            if "sectionId" in p and p.get("documentId") in sections and p["sectionId"] not in sections[p["documentId"]]:
                invalid()
    if "welcome" not in set_ids:
        invalid()
    for file in state["files"]:
        obj(file)
        name(file.get("folder"))
        name(file.get("name"))
        string(file.get("content"), 2_000_000, True)
        if not file["name"].lower().endswith((".md", ".markdown", ".txt", ".csv", ".tsv")):
            invalid()
        integer(file.get("size"), 0, 2_000_000)
    progress_ids = set()
    for row in state["progress"]:
        obj(row)
        if row.get("setId") not in set_ids or row["setId"] in progress_ids:
            invalid()
        progress_ids.add(row["setId"])
        integer(row.get("right"))
        integer(row.get("wrong"))
    events = set()
    for row in state["attempts"]:
        obj(row)
        if row.get("cardId") not in set_cards.get(row.get("setId"), set()) or type(row.get("correct")) is not bool:
            invalid()
        eid = string(row.get("eventId"), 120)
        if eid in events:
            invalid()
        events.add(eid)
        if row.get("confidence", "") not in ("", "low", "medium", "high", "red", "yellow", "green"):
            invalid()
        string(row.get("createdAt"), 100)
    scheduled_ids = set()
    for row in state["schedules"]:
        obj(row)
        if row.get("cardId") not in card_ids or row["cardId"] in scheduled_ids:
            invalid()
        scheduled_ids.add(row["cardId"])
        integer(row.get("repetitions"))
        integer(row.get("intervalDays"), 0, 365)
        if type(row.get("ease")) not in (int, float) or not 0 < row["ease"] <= 10:
            invalid()
        string(row.get("dueAt"), 100)
    return state
