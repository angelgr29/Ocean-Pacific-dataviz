#!/usr/bin/env python3
"""Extract checkpoint.css and checkpoint.js from Part 4 R source."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PART4 = ROOT / "Part 4"
CSS_OUT = ROOT / "static/css/checkpoint.css"
JS_OUT = ROOT / "static/js/checkpoint.js"

NAV_OVERRIDES = """
.story-nav { display:flex; flex-wrap:wrap; gap:8px; border-bottom:1px solid #C9C2B0; margin-bottom:22px; padding-bottom:16px; }
.story-nav a { text-decoration:none; font-size:11px; font-weight:700; padding:8px 14px; border-radius:999px; border:1px solid #C9C2B0; color:#647066; background:#F4F1E5; }
.story-nav a:hover { background:#ECE7DA; }
.story-nav a.active { background:#234B2D; border-color:#234B2D; color:#fff; }
.story-nav a.placeholder { opacity:0.55; }
"""


def extract(source: str) -> tuple[str, str]:
    css_match = re.search(r"<style>\s*(.*?)\s*</style>", source, re.DOTALL)
    if not css_match:
        raise ValueError("CSS block not found")

    scripts = list(re.finditer(r"<script>\s*(.*?)\s*</script>", source, re.DOTALL))
    if not scripts:
        raise ValueError("JS block not found")

    css = css_match.group(1).strip()
    js = scripts[-1].group(1).strip()

    js = re.sub(
        r"let width\s*=\s*\n?\s*journal\.clientWidth\s*;",
        "let width = Math.max(journal.clientWidth || 0, journal.getBoundingClientRect().width || 0, 1200);",
        js,
        count=1,
    )

    js = f"""function initCheckpoint() {{
{js}
}}

if (document.readyState === "loading") {{
  document.addEventListener("DOMContentLoaded", initCheckpoint);
}} else {{
  initCheckpoint();
}}
"""

    return css + "\n\n" + NAV_OVERRIDES.strip() + "\n", js + "\n"


def main() -> int:
    if not sys.stdin.isatty():
        source = sys.stdin.read()
    else:
        source_path = Path(sys.argv[1]) if len(sys.argv) > 1 else PART4
        source = source_path.read_text(encoding="utf-8")
        if not source.strip():
            print(f"Error: {source_path} is empty", file=sys.stderr)
            return 1

    css, js = extract(source)
    CSS_OUT.parent.mkdir(parents=True, exist_ok=True)
    JS_OUT.parent.mkdir(parents=True, exist_ok=True)
    CSS_OUT.write_text(css, encoding="utf-8")
    JS_OUT.write_text(js, encoding="utf-8")

    print(f"Wrote {CSS_OUT} ({len(css.splitlines())} lines)")
    print(f"Wrote {JS_OUT} ({len(js.splitlines())} lines)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
