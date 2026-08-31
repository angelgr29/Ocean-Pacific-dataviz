"""Local dev server for the integrated 6-page study."""

from pathlib import Path

from flask import Flask, send_from_directory

from src.builder import build_all
from src.config import OUTPUT_DIR

app = Flask(
    __name__,
    static_folder=str(OUTPUT_DIR / "static"),
    static_url_path="/static",
)


@app.before_request
def ensure_built() -> None:
    if not (OUTPUT_DIR / "index.html").exists():
        build_all()


@app.route("/")
@app.route("/<path:filename>")
def serve(filename: str = "index.html") -> object:
    path = OUTPUT_DIR / filename
    if path.is_file():
        return send_from_directory(OUTPUT_DIR, filename)
    return send_from_directory(OUTPUT_DIR, "index.html")


if __name__ == "__main__":
    build_all()
    print(f"Serving from {OUTPUT_DIR}")
    app.run(debug=True, port=8000)
