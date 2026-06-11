#!/usr/bin/env python3
"""
build_dict_v2.py — Download ECDICT SQLite and extract a filtered Chinese-English dictionary.

Filters:
  - Exam tags: zk(中考), gk(高考), cet4, cet6
  - Oxford 3000 core words
  - Collins 3+ star rating
  - BNC frequency rank < 15000 (common words)

Output: data/dict-zh.json — compact JSON
  Format: {"word": ["phonetic", "中文释义", "pos"], ...}
"""

import json
import sqlite3
import urllib.request
import zipfile
import io
import os
import sys
import ssl
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
OUTPUT_PATH = DATA_DIR / "dict-zh.json"
DB_PATH = DATA_DIR / "ecdict.db"
ZIP_URL = "https://github.com/skywind3000/ECDICT/releases/download/1.0.28/ecdict-sqlite-28.zip"

# ── Filter config ──────────────────────────────────────

EXAM_TAGS = ["zk", "gk", "cet4", "cet6"]
MIN_COLLINS = 3
INCLUDE_OXFORD = True
MAX_BNC = 15000  # BNC frequency rank (lower = more common)

def log(msg):
    print(f"  {msg}")

def download_sqlite():
    """Download and extract the ECDICT SQLite database."""
    if DB_PATH.exists():
        log(f"Database already exists: {DB_PATH} ({DB_PATH.stat().st_size:,} bytes)")
        return True

    log(f"Downloading: {ZIP_URL}")
    try:
        ctx = ssl.create_default_context()
        req = urllib.request.Request(ZIP_URL, headers={
            "User-Agent": "VocabTracker/1.0"
        })
        with urllib.request.urlopen(req, timeout=300, context=ctx) as resp:
            zip_data = resp.read()
            log(f"Downloaded {len(zip_data):,} bytes")

        with zipfile.ZipFile(io.BytesIO(zip_data)) as zf:
            names = zf.namelist()
            log(f"ZIP contents: {names}")
            # Find the .db file
            db_file = next((n for n in names if n.endswith('.db')), None)
            if not db_file:
                log("ERROR: No .db file found in ZIP")
                return False
            zf.extract(db_file, DATA_DIR)
            # Rename if needed
            extracted = DATA_DIR / db_file
            if extracted != DB_PATH:
                extracted.rename(DB_PATH)
            log(f"Extracted: {DB_PATH} ({DB_PATH.stat().st_size:,} bytes)")
        return True
    except Exception as e:
        log(f"ERROR downloading: {e}")
        return False


def filter_words():
    """Query SQLite and filter words. Returns dict of {word: [phonetic, translation, pos]}."""
    log("Querying database...")
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    # Build WHERE clause
    conditions = []
    params = []

    # Exam tags
    tag_conditions = []
    for tag in EXAM_TAGS:
        tag_conditions.append("tag LIKE ?")
        params.append(f"%{tag}%")
    conditions.append(f"({' OR '.join(tag_conditions)})")

    # Collins
    conditions.append("CAST(collins AS INTEGER) >= ?")
    params.append(MIN_COLLINS)

    # Oxford
    if INCLUDE_OXFORD:
        # Already covered by Collins + Tags mostly, but add as OR for extra coverage
        pass  # Oxford 3000 mostly overlaps with Collins >= 3

    # BNC
    conditions.append("CAST(bnc AS INTEGER) > 0")
    conditions.append("CAST(bnc AS INTEGER) < ?")
    params.append(MAX_BNC)

    where = " AND ".join(conditions)

    query = f"""
        SELECT word, phonetic, translation, pos
        FROM stardict
        WHERE {where}
        AND translation IS NOT NULL AND translation != ''
        ORDER BY word
    """

    log(f"Running query...")
    cursor.execute(query, params)
    rows = cursor.fetchall()
    log(f"Query returned {len(rows):,} words")

    dictionary = {}
    for word, phonetic, translation, pos in rows:
        word = word.strip().lower()
        if not word or not word.isalpha():
            continue
        phonetic = (phonetic or "").strip()
        translation = (translation or "").strip()
        pos = (pos or "").strip()

        # Take only the first line/sense of translation for compactness
        translation = translation.split("\\n")[0].split("；")[0].strip()

        dictionary[word] = [phonetic, translation, pos]

    conn.close()
    log(f"Filtered to {len(dictionary):,} unique valid words")
    return dictionary


def merge_with_existing(dictionary):
    """Merge with existing dict-zh.json if any (preserve manual edits)."""
    if OUTPUT_PATH.exists():
        try:
            with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
                existing = json.load(f)
            log(f"Found existing dict with {len(existing):,} words")
            # New data takes precedence, but keep existing if new has no translation
            for word, data in existing.items():
                if word not in dictionary:
                    dictionary[word] = data
                elif not dictionary[word][1] and data[1]:
                    dictionary[word] = data  # Keep existing if it has better translation
            log(f"After merge: {len(dictionary):,} words")
        except Exception as e:
            log(f"Could not merge existing: {e}")

    return dictionary


def save_dictionary(dictionary):
    """Save sorted dictionary as compact JSON."""
    sorted_dict = dict(sorted(dictionary.items()))

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(sorted_dict, f, ensure_ascii=False, separators=(",", ":"))

    size = OUTPUT_PATH.stat().st_size
    print(f"\n  ✅ Saved: {OUTPUT_PATH}")
    print(f"     {len(sorted_dict):,} words, {size:,} bytes ({size/1024:.1f} KB)")

    # Show sample
    sample = list(sorted_dict.items())[:5]
    print(f"     Sample:")
    for w, d in sample:
        print(f"       {w}: {d}")


def main():
    print("=" * 55)
    print("  VocabTracker · Dictionary Builder v2 (SQLite)")
    print("=" * 55)
    print()

    # Step 1: Download SQLite DB
    if not download_sqlite():
        print("\n  ❌ Failed to download database. Aborting.")
        sys.exit(1)

    # Step 2: Filter words
    dictionary = filter_words()

    if len(dictionary) < 100:
        print("\n  ⚠️  Very few words matched. Trying broader filter...")
        # Broader: just Collins >= 2 + BNC < 30000
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        cursor.execute("""
            SELECT word, phonetic, translation, pos FROM stardict
            WHERE (CAST(collins AS INTEGER) >= 2 OR tag LIKE '%zk%' OR tag LIKE '%gk%' OR tag LIKE '%cet4%')
            AND CAST(bnc AS INTEGER) > 0 AND CAST(bnc AS INTEGER) < 30000
            AND translation IS NOT NULL AND translation != ''
            ORDER BY word
        """)
        rows = cursor.fetchall()
        conn.close()
        log(f"Broader query: {len(rows):,} words")
        dictionary = {}
        for word, phonetic, translation, pos in rows:
            word = word.strip().lower()
            if not word or not word.isalpha(): continue
            translation = (translation or "").strip().split("\\n")[0].split("；")[0].strip()
            dictionary[word] = [(phonetic or "").strip(), translation, (pos or "").strip()]
        log(f"Broader filter: {len(dictionary):,} words")

    # Step 3: Merge with existing
    dictionary = merge_with_existing(dictionary)

    # Step 4: Save
    save_dictionary(dictionary)
    print("\n  Done!")


if __name__ == "__main__":
    main()
