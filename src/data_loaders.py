"""Load and prepare datasets for each chapter."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from src.config import DATA_DIR, ENVIRONMENT_INDICATORS, IMAGES_ATTRACTIONS_DIR, IMAGES_PART2_DIR


def _records(df: pd.DataFrame) -> str:
    return json.dumps(df.to_dict(orient="records"))


# Extra filename stems when ImageHint or country slug does not match disk
IMAGE_STEM_ALIASES: dict[str, list[str]] = {
    "Niue": ["niue", "nue"],
    "Pitcairn": ["pitcairn", "pitcarin"],
    "Micronesia, Federated State of": ["federated_states_micronesia", "micronesia"],
    "Micronesia (Federated States of)": ["federated_states_micronesia", "micronesia"],
    "Federated States of Micronesia": ["federated_states_micronesia", "micronesia"],
    "Micronesia": ["micronesia", "federated_states_micronesia"],
}


MICRONESIA_COUNTRY_NAMES = {
    "Micronesia, Federated State of",
    "Micronesia (Federated States of)",
    "Federated States of Micronesia",
    "Micronesia",
}


def _normalize_attraction_country(country: str) -> str:
    if country in MICRONESIA_COUNTRY_NAMES:
        return "Micronesia"
    return country


def _image_stems(country: str, image_hint: str = "") -> list[str]:
    stems: list[str] = []
    if image_hint:
        stems.append(Path(image_hint.replace("\\", "/")).stem)
    stems.append(country.lower().replace(" ", "_").replace(",", ""))
    stems.extend(IMAGE_STEM_ALIASES.get(country, []))

    seen: set[str] = set()
    unique: list[str] = []
    for stem in stems:
        if stem and stem not in seen:
            seen.add(stem)
            unique.append(stem)
    return unique


def resolve_part2_image(country: str, image_hint: str = "") -> str:
    """Return web path for a territory attraction image, or empty if missing."""
    search_dirs = [IMAGES_ATTRACTIONS_DIR, IMAGES_PART2_DIR]
    for search_dir in search_dirs:
        if not search_dir.exists():
            continue
        for stem in _image_stems(country, image_hint):
            for ext in (".jpg", ".jpeg", ".png", ".webp"):
                if (search_dir / f"{stem}{ext}").exists():
                    return f"static/images/part2/{stem}{ext}"
    return ""


def load_tourism_economy() -> tuple[pd.DataFrame, str]:
    df = pd.read_csv(DATA_DIR / "tourism_economy.csv")
    return df, _records(df)


def load_tourism_attractions() -> tuple[pd.DataFrame, str]:
    with open(DATA_DIR / "tourism_attractions.json", encoding="utf-8") as f:
        records: list[dict] = json.load(f)

    cleaned: list[dict] = []
    seen_countries: set[str] = set()

    for record in records:
        country = _normalize_attraction_country(record["Country"])
        if country == "Papua New Guinea":
            continue
        if country in seen_countries:
            continue

        record = {**record, "Country": country}
        hint = record.pop("ImageHint", "")
        record["Image"] = resolve_part2_image(country, hint)
        cleaned.append(record)
        seen_countries.add(country)

    df = pd.DataFrame(cleaned)
    return df, _records(df)


def load_territories() -> tuple[pd.DataFrame, str]:
    df = pd.read_csv(DATA_DIR / "territories.csv")
    return df, _records(df)


def load_environment_data() -> tuple[pd.DataFrame, str]:
    path = DATA_DIR / "final_dataset.csv"
    if not path.exists():
        raise FileNotFoundError(
            f"Missing {path}. Add your dataset with columns: "
            "Country, Year, Indicator, Value"
        )

    df = pd.read_csv(path)
    df = df[df["Indicator"].isin(ENVIRONMENT_INDICATORS)].copy()
    df["Year"] = pd.to_numeric(df["Year"], errors="coerce")
    df["Value"] = pd.to_numeric(df["Value"], errors="coerce")

    micronesia_names = {
        "Micronesia, Federated State of",
        "Micronesia (Federated States of)",
        "Federated States of Micronesia",
    }
    df.loc[df["Country"].isin(micronesia_names), "Country"] = "Micronesia"
    df = df.dropna(subset=["Country", "Year", "Value"])

    territories = pd.read_csv(DATA_DIR / "territories.csv")
    df = df[df["Country"].isin(territories["Country"])]

    return df, _records(df[["Country", "Year", "Indicator", "Value"]])


def filter_territories_for_environment(env_df: pd.DataFrame) -> tuple[pd.DataFrame, str]:
    territories = pd.read_csv(DATA_DIR / "territories.csv")
    territories = territories[territories["Country"].isin(env_df["Country"].unique())]
    return territories, _records(territories)
