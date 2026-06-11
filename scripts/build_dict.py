#!/usr/bin/env python3
"""
build_dict.py — Build a compact Chinese-English dictionary for VocabTracker.

Sources (tried in order):
  1. kajweb/dict (via jsDelivr CDN, China-accessible) — JSON files organized by exam level
  2. ECDICT CSV (skywind3000/ECDICT) — via Gitee mirror or local file
  3. Falls back gracefully with partial data from any source

Output: data/dict-zh.json — compact JSON dictionary
  Format: { "word": ["phonetic", "中文释义", "pos"], ... }

Exam tags prioritized: 小学, 初中, 中考(zk), 高考(gk), CET4, CET6
Also includes Oxford 3000 and Collins 4-5 star words from ECDICT.
"""

import json
import os
import sys
import csv
import io
import urllib.request
import urllib.error
import ssl
from pathlib import Path

# ── Config ──────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_PATH = PROJECT_ROOT / "data" / "dict-zh.json"

# kajweb/dict files to fetch (via jsDelivr)
KAJWEB_FILES = [
    # (path_in_repo, label)
    ("cn/primary.json", "小学"),
    ("cn/junior.json", "初中"),
    ("cn/senior.json", "高中"),
    ("cn/cet4.json", "CET4"),
    ("cn/cet6.json", "CET6"),
]

# Additional ECDICT exam tags to include
ECDICT_TAGS = ["zk", "gk", "cet4", "cet6", "ky", "ielts", "toefl"]

# Minimum Collins star rating to include (if no exam tag)
MIN_COLLINS = 3
# Include Oxford 3000 core words
INCLUDE_OXFORD = True

# ── Helpers ─────────────────────────────────────────────

def log(msg):
    print(f"  {msg}")

def warn(msg):
    print(f"  ⚠️  {msg}")

def fetch_json(url, timeout=30):
    """Fetch and parse JSON from a URL. Returns data or None."""
    try:
        ctx = ssl.create_default_context()
        req = urllib.request.Request(url, headers={
            "User-Agent": "VocabTracker/1.0 (dictionary builder)"
        })
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            data = resp.read().decode("utf-8")
            return json.loads(data)
    except Exception as e:
        warn(f"Failed to fetch {url}: {e}")
        return None

# ── Source 1: kajweb/dict (via jsDelivr) ─────────────────

def fetch_kajweb():
    """Fetch word data from kajweb/dict via jsDelivr CDN."""
    log("Trying kajweb/dict via jsDelivr...")
    base = "https://cdn.jsdelivr.net/gh/kajweb/dict@master"

    dictionary = {}
    total = 0

    for path, label in KAJWEB_FILES:
        url = f"{base}/{path}"
        log(f"  Fetching {label} ({path})...")
        data = fetch_json(url)
        if data is None:
            continue

        count = 0
        # kajweb format varies by file; try common structures
        words = data if isinstance(data, list) else data.get("words", data.get("data", []))

        for entry in words:
            if not isinstance(entry, dict):
                continue
            word = entry.get("word", entry.get("spelling", entry.get("name", ""))).strip().lower()
            if not word or not word.isalpha():
                continue

            # Extract fields
            phonetic = entry.get("phonetic", entry.get("phone", entry.get("pronounce", "")))
            meaning = entry.get("meaning",
                        entry.get("translation",
                            entry.get("chinese",
                                entry.get("zh",
                                    entry.get("释义",
                                        entry.get("解释", ""))))))
            pos = entry.get("pos", entry.get("partOfSpeech", entry.get("词性", "")))

            # Normalize
            if isinstance(meaning, list):
                meaning = "; ".join(meaning)
            meaning = str(meaning).strip()
            phonetic = str(phonetic).strip()
            pos = str(pos).strip()

            if meaning:
                dictionary[word] = [phonetic, meaning, pos]
                count += 1

        total += count
        log(f"    → {count} words from {label}")

    log(f"  Total from kajweb: {total} words")
    return dictionary


# ── Source 2: ECDICT CSV ─────────────────────────────────

def fetch_ecdict_csv():
    """
    Try to download ECDICT CSV from Gitee mirror or other China-accessible sources.
    Returns file-like object or None.
    """
    mirrors = [
        "https://gitee.com/mirrors_skywind3000/ECDICT/raw/master/ecdict.csv",
        "https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv",
    ]

    for url in mirrors:
        log(f"  Trying ECDICT from: {url}")
        try:
            ctx = ssl.create_default_context()
            req = urllib.request.Request(url, headers={
                "User-Agent": "VocabTracker/1.0"
            })
            with urllib.request.urlopen(req, timeout=120, context=ctx) as resp:
                data = resp.read().decode("utf-8", errors="replace")
                log(f"    Downloaded {len(data):,} bytes")
                return io.StringIO(data)
        except Exception as e:
            warn(f"    Failed: {e}")

    return None


def parse_ecdict(csv_file, existing_dict=None):
    """Parse ECDICT CSV and extract relevant words. Merges with existing dict."""
    if existing_dict is None:
        existing_dict = {}

    reader = csv.DictReader(csv_file)
    count = 0
    skipped = 0

    for row in reader:
        word = row.get("word", "").strip().lower()
        if not word or not word.isalpha():
            skipped += 1
            continue

        # Skip if already have this word
        if word in existing_dict:
            skipped += 1
            continue

        tag = row.get("tag", "")
        collins = row.get("collins", "0")
        oxford = row.get("oxford", "")

        # Check if this word should be included
        include = False

        # Exam tags
        for t in ECDICT_TAGS:
            if t in tag.lower():
                include = True
                break

        # Collins star rating
        try:
            if int(collins) >= MIN_COLLINS:
                include = True
        except ValueError:
            pass

        # Oxford 3000
        if INCLUDE_OXFORD and oxford and oxford.strip() == "1":
            include = True

        if not include:
            skipped += 1
            continue

        phonetic = row.get("phonetic", "").strip()
        translation = row.get("translation", "").strip()
        pos = row.get("pos", "").strip()

        if translation:
            existing_dict[word] = [phonetic, translation, pos]
            count += 1
        else:
            skipped += 1

    log(f"    Added {count} words from ECDICT (skipped {skipped})")
    return existing_dict


# ── Source 3: Local CSV ──────────────────────────────────

def try_local_csv():
    """Check if user placed an ECDICT CSV locally."""
    local_path = PROJECT_ROOT / "data" / "ecdict.csv"
    if local_path.exists():
        log(f"Found local ECDICT CSV: {local_path} ({local_path.stat().st_size:,} bytes)")
        return open(local_path, "r", encoding="utf-8", errors="replace")
    return None


# ── Main ─────────────────────────────────────────────────

def main():
    print("=" * 55)
    print("  VocabTracker · Chinese-English Dictionary Builder")
    print("=" * 55)
    print()

    output_dir = OUTPUT_PATH.parent
    output_dir.mkdir(parents=True, exist_ok=True)

    dictionary = {}

    # ── Step 1: Try kajweb/dict ──
    dictionary = fetch_kajweb()

    # ── Step 2: Try ECDICT ──
    csv_file = try_local_csv() or fetch_ecdict_csv()
    if csv_file:
        log("Parsing ECDICT data...")
        dictionary = parse_ecdict(csv_file, dictionary)
        if not isinstance(csv_file, io.StringIO):
            csv_file.close()
    else:
        warn("Could not obtain ECDICT data. Dictionary may be limited.")

    # ── Step 3: Save ──
    log(f"Saving {len(dictionary):,} words to {OUTPUT_PATH}...")

    # Sort by key for consistent diffs
    sorted_dict = dict(sorted(dictionary.items()))

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(sorted_dict, f, ensure_ascii=False, separators=(",", ":"))

    file_size = OUTPUT_PATH.stat().st_size
    print()
    print(f"  ✅ Done! {len(dictionary):,} words → {OUTPUT_PATH.name} ({file_size:,} bytes)")

    if file_size < 1000:
        print()
        print("  ⚠️  Dictionary seems very small. Possible issues:")
        print("     1. Network restrictions blocked all sources")
        print("     2. Try placing ecdict.csv in data/ folder manually")
        print("     3. Download from: https://github.com/skywind3000/ECDICT")
        print()
        print("     The app will still work — it falls back to the online")
        print("     dictionary API + translation for words not found locally.")

    print()
    return dictionary


if __name__ == "__main__":
    main()
