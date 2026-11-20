#!/usr/bin/env python3
"""
Reusable Word-Card Sheet Slicer for Bushigi Shoutengai (ことば・つづり屋).

Slices a generated N-col x M-row illustration sheet into individual uniform PNGs
under public/images/words/<wordId>.png, automatically detecting gray divider
lines and centering each card cleanly on a crisp white canvas.

Usage examples:
  python scripts/slice-word-sheet.py --input path/to/sheet.jpg --deck deck-minna-03
  python scripts/slice-word-sheet.py --input sheet.png --ids w-a,w-b,w-c --cols 3 --rows 1
  python scripts/slice-word-sheet.py --deck deck-minna-03 --dry-run
"""

import argparse
import json
import os
import re
import sys
from typing import List, Optional

try:
    from PIL import Image, ImageChops
except ImportError:
    print("Error: Pillow is required. Install with: pip install pillow", file=sys.stderr)
    sys.exit(1)


def extract_deck_word_ids(decks_ts_path: str, deck_id: str) -> List[str]:
    """Parse word entry IDs in exact Row-major order from src/data/wordDecks.ts."""
    with open(decks_ts_path, "r", encoding="utf-8") as f:
        text = f.read()

    deck_match = re.search(rf"id\s*:\s*['\"]{re.escape(deck_id)}['\"]", text)
    if not deck_match:
        raise ValueError(f"Deck '{deck_id}' not found in {decks_ts_path}")

    words_match = re.search(r"words\s*:\s*\[", text[deck_match.end():])
    if not words_match:
        raise ValueError(f"No 'words: [' block found for deck '{deck_id}'")

    start_idx = deck_match.end() + words_match.end() - 1  # position of '['
    n = len(text)
    i = start_idx
    bracket_depth = 0
    brace_depth = 0
    in_string: Optional[str] = None
    in_line_comment = False
    in_block_comment = False
    entry_blocks: List[str] = []
    current_entry_start: Optional[int] = None

    while i < n:
        ch = text[i]
        nxt = text[i + 1] if i + 1 < n else ""

        if in_line_comment:
            if ch == "\n":
                in_line_comment = False
            i += 1
            continue

        if in_block_comment:
            if ch == "*" and nxt == "/":
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue

        if in_string:
            if ch == "\\":
                i += 2
                continue
            if ch == in_string:
                in_string = None
            i += 1
            continue

        if ch == "/" and nxt == "/":
            in_line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            in_block_comment = True
            i += 2
            continue
        if ch in ("'", '"', "`"):
            in_string = ch
            i += 1
            continue

        if ch == "[":
            bracket_depth += 1
        elif ch == "]":
            bracket_depth -= 1
            if bracket_depth == 0:
                break
        elif ch == "{" and bracket_depth == 1:
            brace_depth += 1
            if brace_depth == 1:
                current_entry_start = i
        elif ch == "}" and bracket_depth == 1:
            if brace_depth == 1 and current_entry_start is not None:
                entry_blocks.append(text[current_entry_start : i + 1])
                current_entry_start = None
            brace_depth -= 1

        i += 1

    word_ids: List[str] = []
    for block in entry_blocks:
        # Match top-level id field on the entry block
        m = re.search(r"(?:^|[,{\s])id\s*:\s*['\"]([^'\"]+)['\"]", block)
        if m:
            word_ids.append(m.group(1))

    if not word_ids:
        raise ValueError(f"Found 0 word entries inside deck '{deck_id}'")
    return word_ids


def load_ids_from_file(ids_file: str) -> List[str]:
    with open(ids_file, "r", encoding="utf-8") as f:
        raw = f.read().strip()
    if raw.startswith("["):
        data = json.loads(raw)
        if not isinstance(data, list):
            raise ValueError("JSON ids-file must contain an array of strings")
        return [str(item).strip() for item in data if str(item).strip()]
    return [line.strip() for line in raw.splitlines() if line.strip() and not line.strip().startswith("#")]


def find_divider_x(px, w: int, h: int, approx_x: int, search_radius: int = 15) -> int:
    best_x = approx_x
    best_count = -1
    for x in range(max(0, approx_x - search_radius), min(w, approx_x + search_radius + 1)):
        gray_count = sum(1 for y in range(0, h, 2) if 140 <= px[x, y] <= 238)
        if gray_count > best_count:
            best_count = gray_count
            best_x = x
    return best_x


def find_divider_y(px, w: int, h: int, approx_y: int, search_radius: int = 15) -> int:
    best_y = approx_y
    best_count = -1
    for y in range(max(0, approx_y - search_radius), min(h, approx_y + search_radius + 1)):
        gray_count = sum(1 for x in range(0, w, 2) if 140 <= px[x, y] <= 238)
        if gray_count > best_count:
            best_count = gray_count
            best_y = y
    return best_y


def slice_sheet(
    input_path: Optional[str],
    word_ids: List[str],
    cols: int,
    rows: int,
    out_dir: str,
    target_w: int,
    target_h: int,
    inset: int,
    dry_run: bool,
) -> None:
    if not word_ids:
        raise ValueError("Word ID list is empty.")
    if len(word_ids) > cols * rows:
        raise ValueError(f"Got {len(word_ids)} word IDs, which exceeds grid capacity {cols}x{rows}={cols * rows}.")

    if dry_run:
        print(f"[DRY RUN] Parsed {len(word_ids)} word IDs for {cols}x{rows} grid:")
        for idx, wid in enumerate(word_ids):
            r, c = divmod(idx, cols)
            print(f"  Cell ({r + 1},{c + 1}) -> {wid}.png")
        if not input_path:
            return

    if not input_path:
        raise ValueError("--input is required unless running --dry-run with --deck/--ids only.")
    if not os.path.isfile(input_path):
        raise FileNotFoundError(f"Input image not found: {input_path}")

    img = Image.open(input_path).convert("RGB")
    w, h = img.size
    gray = img.convert("L")
    px = gray.load()

    x_cuts = [0] + [find_divider_x(px, w, h, round(w * c / cols)) for c in range(1, cols)] + [w]
    y_cuts = [0] + [find_divider_y(px, w, h, round(h * r / rows)) for r in range(1, rows)] + [h]

    print(f"Loaded sheet: {w}x{h}")
    print(f"Detected X cuts: {x_cuts}")
    print(f"Detected Y cuts: {y_cuts}")

    if dry_run:
        print("[DRY RUN] Grid detection complete. No files written.")
        return

    os.makedirs(out_dir, exist_ok=True)

    for idx, word_id in enumerate(word_ids):
        r, c = divmod(idx, cols)
        x0 = x_cuts[c] + inset
        x1 = x_cuts[c + 1] - inset
        y0 = y_cuts[r] + inset
        y1 = y_cuts[r + 1] - inset

        cell = img.crop((x0, y0, x1, y1))

        # Auto-trim excessive white margins while preserving full-bleed backgrounds
        bg = Image.new("RGB", cell.size, (255, 255, 255))
        diff = ImageChops.difference(cell, bg).convert("L")
        diff = diff.point(lambda p: 255 if p > 18 else 0)
        bbox = diff.getbbox()
        if bbox:
            bx0, by0, bx1, by1 = bbox
            if bx0 > 4 or by0 > 4 or bx1 < cell.width - 4 or by1 < cell.height - 4:
                pad = 6
                cell = cell.crop(
                    (
                        max(0, bx0 - pad),
                        max(0, by0 - pad),
                        min(cell.width, bx1 + pad),
                        min(cell.height, by1 + pad),
                    )
                )

        canvas = Image.new("RGB", (target_w, target_h), (255, 255, 255))
        max_w = target_w - 16
        max_h = target_h - 16
        scale = min(max_w / cell.width, max_h / cell.height)
        new_w = max(1, round(cell.width * scale))
        new_h = max(1, round(cell.height * scale))
        resized = cell.resize((new_w, new_h), Image.Resampling.LANCZOS)
        offset_x = (target_w - new_w) // 2
        offset_y = (target_h - new_h) // 2
        canvas.paste(resized, (offset_x, offset_y))

        out_path = os.path.join(out_dir, f"{word_id}.png")
        canvas.save(out_path, "PNG", optimize=True)
        print(f"Saved {out_path} ({os.path.getsize(out_path)} B)")

    print(f"Done! Sliced {len(word_ids)} word illustrations into {out_dir}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Slice N-col x M-row vocabulary illustration grid into PNG cards.")
    parser.add_argument("--input", help="Path to generated sheet image (JPG/PNG)")
    parser.add_argument("--deck", help="Deck ID in src/data/wordDecks.ts (e.g. deck-minna-03)")
    parser.add_argument("--ids", help="Comma-separated word IDs in Row-major order")
    parser.add_argument("--ids-file", help="Path to JSON array or line-separated word IDs file")
    parser.add_argument("--cols", type=int, default=5, help="Grid columns (default: 5)")
    parser.add_argument("--rows", type=int, default=4, help="Grid rows (default: 4)")
    parser.add_argument("--out", default=os.path.join("public", "images", "words"), help="Output directory")
    parser.add_argument("--width", type=int, default=440, help="Output PNG width (default: 440)")
    parser.add_argument("--height", type=int, default=360, help="Output PNG height (default: 360)")
    parser.add_argument("--inset", type=int, default=7, help="Divider inset in px (default: 7)")
    parser.add_argument("--decks-ts", default=os.path.join("src", "data", "wordDecks.ts"), help="Path to wordDecks.ts")
    parser.add_argument("--dry-run", action="store_true", help="Inspect parsed IDs and grid cuts without writing files")

    args = parser.parse_args()

    word_ids: List[str] = []
    if args.deck:
        word_ids = extract_deck_word_ids(args.decks_ts, args.deck)
    elif args.ids:
        word_ids = [item.strip() for item in args.ids.split(",") if item.strip()]
    elif args.ids_file:
        word_ids = load_ids_from_file(args.ids_file)
    else:
        parser.error("Provide one of --deck, --ids, or --ids-file.")

    slice_sheet(
        input_path=args.input,
        word_ids=word_ids,
        cols=args.cols,
        rows=args.rows,
        out_dir=args.out,
        target_w=args.width,
        target_h=args.height,
        inset=args.inset,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    main()
