#!/usr/bin/env python3
"""Fail CI if first-party tracked files contain obvious private data.

This is a prevention check, not a comprehensive secret scan or history audit.
Never print matched values: diagnostic logs are public too.
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IGNORED_PREFIXES = (
    ".agents/skills/",   # unmodified upstream skill documentation/examples
    ".agents/licenses/",  # required verbatim upstream notices
    "frontend/public/",  # public licensed assets
    "graphify-out/",     # generated from already-public source
)
IGNORED_EXACT = {"frontend/pnpm-lock.yaml"}
PRIVATE_SEGMENTS = {"private", "secrets", "backups", "recovery", "exports-private"}
PRIVATE_EXTENSIONS = {".pem", ".p12", ".pfx", ".sqlite", ".sqlite3", ".db", ".pgdump", ".dump"}
PRIVATE_NAMES = {"credentials.json", "auth_sessions.json", "cloud_allowlist.json"}
PATTERNS = {
    "private key block": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "GitHub token": re.compile(r"\b(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}\b"),
    "API or service secret": re.compile(r"\b(?:sk-|sb_secret_)[A-Za-z0-9_-]{24,}\b"),
    "AWS access key": re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    "live Supabase project host": re.compile(r"https?://[A-Za-z0-9-]+\.supabase\.co\b"),
    "absolute user directory": re.compile(r"(?:/Users/[A-Za-z0-9._-]+/|C:\\\\Users\\\\[A-Za-z0-9._-]+\\\\)"),
}
EMAIL = re.compile(r"\b[A-Z0-9._%+-]+@(?:[A-Z0-9-]+\.)+[A-Z]{2,}\b", re.I)
ASSIGNMENT = re.compile(
    r"""(?im)^\s*(?:export\s+)?(?:[A-Z0-9_]*(?:API_KEY|SECRET|PASSWORD|SESSION_KEY|SERVICE_ROLE_KEY)[A-Z0-9_]*)\s*[:=]\s*["']?([A-Za-z0-9/_+=.-]{12,})["']?\s*(?:#.*)?$"""
)

def allowed_example_email(value: str) -> bool:
    domain = value.rsplit("@", 1)[-1].lower()
    return (domain in {"example.com", "example.org", "example.net", "studycade.local"}
            or domain.endswith((".example", ".test", ".invalid", ".local", ".users.noreply.github.com"))
            or domain == "users.noreply.github.com")

def inspect(path: str, content: str) -> list[tuple[int, str]]:
    """Return (line, reason), never the matched private content."""
    findings: list[tuple[int, str]] = []
    for line_no, line in enumerate(content.splitlines(), 1):
        for label, pattern in PATTERNS.items():
            if pattern.search(line):
                findings.append((line_no, label))
        for match in EMAIL.finditer(line):
            if not allowed_example_email(match.group()):
                findings.append((line_no, "non-example email address"))
        if ASSIGNMENT.search(line):
            findings.append((line_no, "possibly hard-coded sensitive configuration"))
    return findings

def main() -> int:
    tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT).decode().split("\0")
    failures: list[str] = []
    checked = 0
    for name in filter(None, tracked):
        p = Path(name)
        if (name == ".env" or p.name.startswith(".env.") or p.suffix.lower() in PRIVATE_EXTENSIONS
                or p.name.lower() in PRIVATE_NAMES
                or any(part.lower() in PRIVATE_SEGMENTS for part in p.parts)
                or re.search(r"(?:backup|session|allowlist|credential).*\.(?:json|csv|tsv|sql|log)$", p.name, re.I)):
            failures.append(f"{name}: file path may contain private data")
            continue
        if name in IGNORED_EXACT or name.startswith(IGNORED_PREFIXES):
            continue
        file_path = ROOT / p
        if not file_path.is_file():
            continue
        raw = file_path.read_bytes()
        if b"\0" in raw:
            continue
        try:
            source = raw.decode("utf-8")
        except UnicodeDecodeError:
            continue
        checked += 1
        for line_no, reason in inspect(name, source):
            failures.append(f"{name}:{line_no}: {reason}")
    for finding in failures:
        print(finding, file=sys.stderr)
    if failures:
        print(f"Public-tree check failed: {len(failures)} potential exposure(s).", file=sys.stderr)
        return 1
    print(f"Public-tree check passed: {checked} first-party text files scanned.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
