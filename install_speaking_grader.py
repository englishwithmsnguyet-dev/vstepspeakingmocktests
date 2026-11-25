#!/usr/bin/env python3
"""
Script tự động gắn (hoặc gỡ) tính năng chấm điểm VSTEP Speaking AI
vào repo `vstepspeakingmocktests`:
- Tự động gắn vào `index.html` ở thư mục gốc
- Tự động tìm và gắn vào toàn bộ `test 1/test01-index.html` .. `test 17/test17-index.html`
  (và bất kỳ thư mục `test N/` nào sau này).

Cách chạy (tại thư mục gốc của repo `vstepspeakingmocktests`):
  python3 install_speaking_grader.py --dry-run   # Xem trước các file sẽ sửa
  python3 install_speaking_grader.py             # Áp dụng gắn vào toàn bộ web
  python3 install_speaking_grader.py --uninstall # Gỡ sạch các thẻ đã gắn
"""

import argparse
import re
from pathlib import Path

CACHE_VER = "20261126b"

CSS_START = "<!-- VSTEP-SPEAKING-GRADER:CSS:START -->"
CSS_END = "<!-- VSTEP-SPEAKING-GRADER:CSS:END -->"
JS_START = "<!-- VSTEP-SPEAKING-GRADER:JS:START -->"
JS_END = "<!-- VSTEP-SPEAKING-GRADER:JS:END -->"


def strip_existing_blocks(html: str) -> str:
    pattern_css = re.compile(
        r"\s*" + re.escape(CSS_START) + r".*?" + re.escape(CSS_END) + r"\s*",
        re.DOTALL,
    )
    pattern_js = re.compile(
        r"\s*" + re.escape(JS_START) + r".*?" + re.escape(JS_END) + r"\s*",
        re.DOTALL,
    )
    html = pattern_css.sub("\n", html)
    html = pattern_js.sub("\n", html)
    return html


def build_css_block(prefix: str) -> str:
    return (
        f"\n  {CSS_START}\n"
        f'  <link rel="stylesheet" href="{prefix}speaking-grader.css?v={CACHE_VER}" />\n'
        f"  {CSS_END}\n"
    )


def build_js_block(prefix: str) -> str:
    return (
        f"\n  {JS_START}\n"
        f'  <script src="{prefix}speaking-grader-config.js?v={CACHE_VER}"></script>\n'
        f'  <script src="{prefix}speaking-grader.js?v={CACHE_VER}"></script>\n'
        f"  {JS_END}\n"
    )


def patch_html_file(path: Path, prefix: str, uninstall: bool, dry_run: bool) -> str:
    original = path.read_text(encoding="utf-8")
    cleaned = strip_existing_blocks(original)

    if uninstall:
        if cleaned == original:
            return "unchanged"
        if not dry_run:
            path.write_text(cleaned, encoding="utf-8")
        return "removed"

    updated = cleaned
    css_block = build_css_block(prefix)
    js_block = build_js_block(prefix)

    # Chèn CSS ngay trước </head>
    head_match = re.search(r"</head>", updated, re.IGNORECASE)
    if head_match:
        idx = head_match.start()
        updated = updated[:idx] + css_block + updated[idx:]
    else:
        return "skipped (missing </head>)"

    # Chèn JS ngay trước </body> (sau db.js và app.js để truy cập được VstepAuth, VstepDB, recordings)
    body_match = re.search(r"</body>", updated, re.IGNORECASE)
    if body_match:
        idx = body_match.start()
        updated = updated[:idx] + js_block + updated[idx:]
    else:
        return "skipped (missing </body>)"

    if updated == original:
        return "unchanged"

    if not dry_run:
        path.write_text(updated, encoding="utf-8")
    return "patched"


def find_target_files(root: Path):
    targets = []
    root_index = root / "index.html"
    if root_index.is_file():
        targets.append((root_index, "./"))

    for child in sorted(root.iterdir()):
        if child.is_dir() and re.match(r"^test\s*\d+$", child.name, re.IGNORECASE):
            html_candidates = sorted(child.glob("*index.html"))
            for html_file in html_candidates:
                targets.append((html_file, "../"))
    return targets


def main():
    parser = argparse.ArgumentParser(description="Gắn/gỡ VSTEP Speaking AI Grader vào vstepspeakingmocktests.")
    parser.add_argument("--root", default=".", help="Thư mục gốc repo vstepspeakingmocktests (mặc định: thư mục hiện tại)")
    parser.add_argument("--dry-run", action="store_true", help="Chỉ xem trước, không ghi file")
    parser.add_argument("--uninstall", action="store_true", help="Gỡ bỏ toàn bộ thẻ đã gắn")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    targets = find_target_files(root)

    if not targets:
        print(f"Không tìm thấy index.html hoặc thư mục test N/ trong: {root}")
        return

    mode_label = "DRY-RUN " if args.dry_run else ""
    action_label = "GỠ BỎ" if args.uninstall else "GẮN MODULE"
    print(f"[{mode_label}{action_label}] Đang quét {len(targets)} file HTML trong {root}...\n")

    counts = {}
    for file_path, prefix in targets:
        status = patch_html_file(file_path, prefix, uninstall=args.uninstall, dry_run=args.dry_run)
        counts[status] = counts.get(status, 0) + 1
        rel = file_path.relative_to(root)
        print(f"  - {rel}: {status}")

    print("\nTổng kết:", counts)


if __name__ == "__main__":
    main()
