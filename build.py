import os
import webbrowser
from pathlib import Path

from src.builder import build_all
from src.config import OUTPUT_DIR


def main() -> None:
    paths = build_all()
    print("Built pages:")
    for path in paths:
        print(f"  {path}")

    index = Path(OUTPUT_DIR / "index.html").resolve()
    print(f"\nBuilt storybook:\n  {index}")

    if os.environ.get("VERCEL") or os.environ.get("CI"):
        print("\nSkipping browser open (CI/Vercel build).")
        return

    print("\nTip: for best results run  python3 app.py  and open http://localhost:8000")
    webbrowser.open(index.as_uri())


if __name__ == "__main__":
    main()
