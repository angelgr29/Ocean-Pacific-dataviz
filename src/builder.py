"""Render HTML pages from Jinja2 templates."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from src.config import (
    BOOK_CHAPTERS,
    INDICATOR_CONFIG,
    IMAGES_ATTRACTIONS_DIR,
    IMAGES_PART2_DIR,
    OUTPUT_DIR,
    PAGES,
    PART5_OUTPUT_IMAGE,
    PART5_TEMPLATE_DIR,
    RESOURCES_PDF_PATH,
    RESOURCES_PDF_URL,
    STATIC_DIR,
    TEMPLATES_DIR,
)
from src.data_loaders import (
    filter_territories_for_environment,
    load_environment_data,
    load_tourism_attractions,
    load_tourism_economy,
)
from src.rli_chart import build_rli_chart_html


def _jinja_env() -> Environment:
    return Environment(
        loader=FileSystemLoader(TEMPLATES_DIR),
        autoescape=select_autoescape(["html", "xml"]),
    )


def _read_static(relative_path: str) -> str:
    return (STATIC_DIR / relative_path).read_text(encoding="utf-8")


def _copy_part5_image(dest_static: Path) -> bool:
    """Copy Part5 template image to a fixed path for easy replacement later."""
    part5_dest = dest_static / "images" / "part5"
    part5_dest.mkdir(parents=True, exist_ok=True)

    if not PART5_TEMPLATE_DIR.exists():
        return False

    for image in PART5_TEMPLATE_DIR.iterdir():
        if image.is_file() and image.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
            shutil.copy2(image, part5_dest / f"cover{image.suffix.lower()}")
            # Canonical jpeg path used in templates
            if image.suffix.lower() != ".jpeg":
                shutil.copy2(image, part5_dest / "cover.jpeg")
            return True
    return False


def _copy_attraction_images(dest_static: Path) -> None:
    """Copy attraction photos into static/images/part2 for the map hover cards."""
    part2_dest = dest_static / "images" / "part2"
    part2_dest.mkdir(parents=True, exist_ok=True)

    source_dirs = [IMAGES_ATTRACTIONS_DIR, IMAGES_PART2_DIR]
    copied: set[str] = set()

    for source_dir in source_dirs:
        if not source_dir.exists():
            continue
        for image in sorted(source_dir.iterdir()):
            if not image.is_file():
                continue
            if image.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
                continue
            if image.name in copied:
                continue
            shutil.copy2(image, part2_dest / image.name.lower())
            copied.add(image.name)


def _copy_static() -> None:
    dest = OUTPUT_DIR / "static"
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(STATIC_DIR, dest)

    _copy_attraction_images(dest)

    _copy_part5_image(dest)


def _theme_context(extra_css: list[str] | None = None, extra_js: list[str] | None = None) -> dict:
    ctx: dict = {
        "inline_theme_css": _read_static("css/theme.css"),
        "book_embed_css": _read_static("css/book-embed.css"),
        "pages": PAGES,
    }
    if extra_css:
        ctx["inline_page_css"] = "\n\n".join(_read_static(path) for path in extra_css)
    if extra_js:
        ctx["inline_page_js"] = "\n\n".join(_read_static(path) for path in extra_js)
    return ctx


def _render(template_name: str, context: dict) -> str:
    env = _jinja_env()
    template = env.get_template(template_name)
    return template.render(**context)


def _base_context(active_slug: str) -> dict:
    return {
        "pages": PAGES,
        "active_slug": active_slug,
    }


def build_economy() -> str:
    _, tourism_json = load_tourism_economy()
    return _render(
        "economy.html",
        {
            **_base_context("economy"),
            **_theme_context(
                extra_css=["css/economy.css"],
                extra_js=["js/pacific-map.js", "js/economy.js"],
            ),
            "page_title": "Pacific Tourism · Economy",
            "tourism_json": tourism_json,
        },
    )


def build_attractions() -> str:
    _, attractions_json = load_tourism_attractions()
    return _render(
        "attractions.html",
        {
            **_base_context("attractions"),
            **_theme_context(
                extra_css=["css/attractions.css"],
                extra_js=["js/pacific-map.js", "js/attractions.js"],
            ),
            "page_title": "Pacific Tourism · Attractions",
            "attractions_json": attractions_json,
        },
    )


def build_environment() -> str:
    env_df, environment_json = load_environment_data()
    _, territories_json = filter_territories_for_environment(env_df)
    return _render(
        "environment.html",
        {
            **_base_context("environment"),
            **_theme_context(
                extra_css=["css/environment.css"],
                extra_js=["js/pacific-map.js", "js/environment-story.js", "js/environment.js"],
            ),
            "page_title": "Pacific Environment",
            "environment_json": environment_json,
            "territories_json": territories_json,
            "indicator_config_json": json.dumps(INDICATOR_CONFIG),
            "rli_chart_html": build_rli_chart_html(),
        },
    )


def build_checkpoint() -> str:
    return _render(
        "checkpoint.html",
        {
            **_base_context("checkpoint"),
            "inline_page_css": _read_static("css/checkpoint.css"),
            "inline_page_js": _read_static("js/checkpoint.js"),
            "book_embed_css": _read_static("css/book-embed.css"),
            "page_title": "Tourism Checkpoint",
            "body_class": "checkpoint-page",
            "use_theme_css": False,
        },
    )


def build_part5() -> str:
    part5_path = OUTPUT_DIR / "static" / "images" / "part5" / "cover.jpeg"
    return _render(
        "part5.html",
        {
            **_base_context("part5"),
            **_theme_context(extra_css=["css/part5.css"]),
            "page_title": "Pacific Tourism · Synthesis",
            "part5_image": PART5_OUTPUT_IMAGE if part5_path.exists() else "",
            "show_nav": False,
        },
    )


def build_conclusion() -> str:
    return _render(
        "conclusion.html",
        {
            **_base_context("conclusion"),
            "inline_page_css": _read_static("css/conclusion.css"),
            "inline_page_js": _read_static("js/conclusion.js"),
            "book_embed_css": _read_static("css/book-embed.css"),
            "page_title": "Pacific Tourism · Conclusion",
            "body_class": "conclusion-page",
            "use_theme_css": False,
            "show_nav": False,
        },
    )


def build_resources() -> str:
    pdf_available = RESOURCES_PDF_PATH.exists()
    return _render(
        "resources.html",
        {
            **_base_context("resources"),
            "inline_page_css": _read_static("css/resources.css"),
            "book_embed_css": _read_static("css/book-embed.css"),
            "page_title": "Pacific Tourism · Resources",
            "body_class": "resources-page",
            "use_theme_css": False,
            "show_nav": False,
            "resources_pdf_url": RESOURCES_PDF_URL if pdf_available else "",
        },
    )


def build_story() -> str:
    return _render(
        "story.html",
        {
            "book_css": _read_static("css/book.css"),
            "book_js": _read_static("js/book.js"),
            "book_chapters_json": json.dumps(BOOK_CHAPTERS, ensure_ascii=False),
        },
    )


BUILDERS = {
    "economy": build_economy,
    "attractions": build_attractions,
    "environment": build_environment,
    "checkpoint": build_checkpoint,
    "part5": build_part5,
    "conclusion": build_conclusion,
    "resources": build_resources,
}


def build_all() -> list[Path]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    _copy_static()

    written: list[Path] = []

    for page in PAGES:
        html = BUILDERS[page["slug"]]()
        out_path = OUTPUT_DIR / page["output"]
        out_path.write_text(html, encoding="utf-8")
        written.append(out_path)

    story_path = OUTPUT_DIR / "index.html"
    story_path.write_text(build_story(), encoding="utf-8")
    written.insert(0, story_path)

    return written
