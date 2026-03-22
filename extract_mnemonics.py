#!/usr/bin/env python3
"""Extract kanji → mnemonic mappings from Kodansha Kanji Course PDF.

Usage: python extract_mnemonics.py [--start PAGE] [--end PAGE] [--batch SIZE]
"""

import anthropic
import argparse
import base64
import io
import json
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from pdf2image import convert_from_path
from PIL import Image

PDF_PATH = "kodansha_kanji_course.pdf"
START_PAGE = 34
END_PAGE = 608
PAGES_PER_BATCH = 3  # 3 pages = ~12 kanji per API call; balances accuracy vs. speed
OUTPUT_FILE = "kanji_mnemonics.json"
PROGRESS_FILE = "progress.json"

EXTRACT_PROMPT = """\
Each page shown is from a kanji dictionary. Every page has exactly 4 kanji entries laid out as a table.

For each kanji entry on these pages, extract:
- "kanji": the kanji character itself (e.g. 日, 一, 二)
- "entry_number": the 4-digit entry number (e.g. "0001")
- "mnemonic": the full mnemonic/explanation paragraph text (the indented block of text that explains \
the kanji's origin, meaning, or memory aid — starts with the entry number box on the left)

Return a JSON array of objects with those three keys. Output ONLY valid JSON with no markdown fences \
or extra commentary. If a page has no extractable entries, return an empty array [].
"""

client = anthropic.Anthropic()


def pil_to_base64(image: Image.Image) -> str:
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return base64.standard_b64encode(buf.getvalue()).decode()


def extract_from_batch(images: list[Image.Image], page_numbers: list[int]) -> list[dict]:
    content: list[dict] = []

    for img, page_num in zip(images, page_numbers):
        content.append({"type": "text", "text": f"--- Page {page_num} ---"})
        content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/png",
                "data": pil_to_base64(img),
            },
        })

    content.append({"type": "text", "text": EXTRACT_PROMPT})

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": content}],
    )

    raw = response.content[0].text.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.rstrip("`").strip()

    return json.loads(raw)


def load_progress() -> tuple[dict, set]:
    if Path(PROGRESS_FILE).exists():
        with open(PROGRESS_FILE, encoding="utf-8") as f:
            data = json.load(f)
        return data.get("results", {}), set(data.get("processed_pages", []))
    return {}, set()


def save_progress(results: dict, processed_pages: set) -> None:
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(
            {"results": results, "processed_pages": sorted(processed_pages)},
            f,
            ensure_ascii=False,
            indent=2,
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract kanji mnemonics from PDF")
    parser.add_argument("--start", type=int, default=START_PAGE, help="First PDF page (1-indexed)")
    parser.add_argument("--end", type=int, default=END_PAGE, help="Last PDF page (inclusive)")
    parser.add_argument("--batch", type=int, default=PAGES_PER_BATCH, help="Pages per API call")
    parser.add_argument("--dpi", type=int, default=150, help="DPI for PDF rendering")
    parser.add_argument("--reset", action="store_true", help="Ignore saved progress and restart")
    args = parser.parse_args()

    pdf_path = Path(PDF_PATH)
    if not pdf_path.exists():
        print(f"Error: {PDF_PATH} not found in current directory", file=sys.stderr)
        sys.exit(1)

    results, processed_pages = load_progress()
    if args.reset:
        results, processed_pages = {}, set()
        print("Progress reset.")
    elif processed_pages:
        print(f"Resuming: {len(processed_pages)} pages done, {len(results)} kanji collected so far.")

    all_pages = list(range(args.start, args.end + 1))
    pending = [p for p in all_pages if p not in processed_pages]
    total_batches = (len(pending) + args.batch - 1) // args.batch

    print(f"Pages to process: {len(pending)} / {len(all_pages)} | Batches: {total_batches}")

    for batch_idx, batch_start in enumerate(range(0, len(pending), args.batch), 1):
        batch_pages = pending[batch_start: batch_start + args.batch]
        print(f"[{batch_idx}/{total_batches}] Pages {batch_pages[0]}–{batch_pages[-1]} ...", end=" ", flush=True)

        try:
            images = convert_from_path(
                str(pdf_path),
                first_page=batch_pages[0],
                last_page=batch_pages[-1],
                dpi=args.dpi,
            )

            entries = extract_from_batch(images, batch_pages)

            added = 0
            for entry in entries:
                kanji = entry.get("kanji", "").strip()
                if kanji:
                    results[kanji] = {
                        "entry_number": entry.get("entry_number", ""),
                        "mnemonic": entry.get("mnemonic", "").strip(),
                    }
                    added += 1

            processed_pages.update(batch_pages)
            save_progress(results, processed_pages)
            print(f"extracted {added} entries (total: {len(results)})")

        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e} — skipping batch, will retry on next run")
        except Exception as e:
            print(f"Error: {e}")
            print("Waiting 10 s before continuing...")
            time.sleep(10)

        # Small delay to avoid hammering the API
        time.sleep(0.5)

    # Write final output
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\nDone! {len(results)} kanji → mnemonic mappings saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
