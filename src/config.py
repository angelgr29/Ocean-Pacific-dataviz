"""Shared configuration for the Pacific Tourism data story."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
OUTPUT_DIR = ROOT / "output"
TEMPLATES_DIR = ROOT / "templates"
STATIC_DIR = ROOT / "static"
IMAGES_PART2_DIR = ROOT / "images" / "PART2"
IMAGES_ATTRACTIONS_DIR = ROOT / "images" / "drive-download-20260831T022305Z-1-001"
PART5_TEMPLATE_DIR = IMAGES_PART2_DIR / "Part5_template"
PART5_OUTPUT_IMAGE = "static/images/part5/cover.jpeg"
RESOURCES_PDF_PATH = ROOT / "static" / "docs" / "resources.pdf"
RESOURCES_PDF_URL = "static/docs/resources.pdf"

WORLD_ATLAS_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

PROJECTION = {
    "rotate": [-170, 0],
    "center": [0, -5],
}

PAGES = [
    {
        "slug": "economy",
        "title": "Tourism is a lifeline",
        "chapter": "Chapter 1 · Economy",
        "headline": "Tourism is a lifeline.",
        "template": "economy.html",
        "output": "economy.html",
        "status": "ready",
    },
    {
        "slug": "attractions",
        "title": "Nature is the destination",
        "chapter": "Chapter 2 · Attractions",
        "headline": "Nature is the destination.",
        "template": "attractions.html",
        "output": "attractions.html",
        "status": "ready",
    },
    {
        "slug": "environment",
        "title": "Paradise under pressure",
        "chapter": "Chapter 3 · Environment",
        "headline": "Paradise under pressure",
        "template": "environment.html",
        "output": "environment.html",
        "status": "ready",
    },
    {
        "slug": "checkpoint",
        "title": "Every journey leaves a footprint",
        "chapter": "Chapter 4 · The dilemma",
        "headline": "Every journey leaves a footprint.",
        "template": "checkpoint.html",
        "output": "checkpoint.html",
        "status": "ready",
    },
    {
        "slug": "part5",
        "title": "Pacific synthesis",
        "chapter": "Chapter 5 · Synthesis",
        "headline": "The Pacific tourism story",
        "template": "part5.html",
        "output": "part5.html",
        "status": "ready",
    },
    {
        "slug": "conclusion",
        "title": "Conclusion",
        "chapter": "Conclusion",
        "headline": "Conclusion",
        "template": "conclusion.html",
        "output": "conclusion.html",
        "status": "ready",
    },
    {
        "slug": "resources",
        "title": "Resources",
        "chapter": "Resources",
        "headline": "Resources",
        "template": "resources.html",
        "output": "resources.html",
        "status": "ready",
    },
]

BOOK_CHAPTERS = [
    {
        "slug": "cover",
        "type": "splash",
        "eyebrow": "The Tourism Conservation Paradox in Pacific Island Countries",
        "title": "Islands at the crossroads",
        "subtitle": (
            "A six-chapter data story exploring how Pacific Island tourism depends on "
            "natural ecosystems and how environmental change puts that relationship under pressure."
        ),
        "theme": "green",
        "credit": "A Project by Fabricio Morales & Angel Gonzalez",
    },
    {
        "slug": "economy",
        "type": "iframe",
        "file": "economy.html",
        "eyebrow": "Chapter 1 · Economy",
        "title": "Tourism-Dependent Economies",
        "subtitle": "Across Pacific Island economies, tourism plays a central role in generating income and supporting economic activity.",
        "theme": "green",
    },
    {
        "slug": "attractions",
        "type": "iframe",
        "file": "attractions.html",
        "eyebrow": "Chapter 2 · Attractions",
        "title": "What makes the Pacific unique?",
        "subtitle": "Reefs, lagoons, and island landscapes define the tourism product.",
        "theme": "green",
    },
    {
        "slug": "environment",
        "type": "iframe",
        "file": "environment.html",
        "eyebrow": "Chapter 3 · Environment",
        "title": "Paradise under pressure",
        "subtitle": "Climate and biodiversity trends reveal mounting pressures on ecosystems across Pacific Island countries.",
        "theme": "green",
    },
    {
        "slug": "checkpoint",
        "type": "iframe",
        "file": "checkpoint.html",
        "eyebrow": "Chapter 4 · The dilemma",
        "title": "The Tourism Nature Dilemma.",
        "subtitle": "Tourism creates economic value, but its growth can intensify pressure on the ecosystems that sustain it.",
        "theme": "journal",
    },
    {
        "slug": "part5",
        "type": "iframe",
        "file": "part5.html",
        "eyebrow": "Chapter 5 · Synthesis",
        "title": "The Pacific tourism story",
        "subtitle": "Connecting economy, place, environment, and choice.",
        "theme": "green",
    },
    {
        "slug": "conclusion",
        "type": "iframe",
        "file": "conclusion.html",
        "eyebrow": "",
        "title": "",
        "subtitle": "",
        "navLabel": "Conclusion",
        "theme": "green",
        "splashMs": 1000,
    },
    {
        "slug": "resources",
        "type": "iframe",
        "file": "resources.html",
        "eyebrow": "",
        "title": "",
        "subtitle": "",
        "navLabel": "Resources",
        "theme": "green",
    },
]

ENVIRONMENT_INDICATORS = [
    "Surface Temperature anomalies",
    "Sea Surface Temperature anomalies",
    "15.5.1 Red List Index",
]

INDICATOR_CONFIG = {
    "Surface Temperature anomalies": {
        "label": "Surface temperature anomaly",
        "button": "Land temperature",
        "type": "diverging",
        "low": "#396F9E",
        "neutral": "#F0EFE8",
        "high": "#A52E25",
        "decimals": 2,
        "unit": "°C",
        "baseline": "Relative to 1971–2000 baseline",
    },
    "Sea Surface Temperature anomalies": {
        "label": "Sea surface temperature anomaly",
        "button": "Ocean temperature",
        "type": "diverging",
        "low": "#3F78A3",
        "neutral": "#F1EFE8",
        "high": "#A52D24",
        "decimals": 2,
        "unit": "°C",
        "baseline": "Relative to 1971–2000 baseline",
    },
    "15.5.1 Red List Index": {
        "label": "Red List Index",
        "button": "Biodiversity",
        "type": "sequential",
        "low": "#8B593A",
        "middle": "#CEB884",
        "high": "#4E8455",
        "decimals": 3,
    },
}
