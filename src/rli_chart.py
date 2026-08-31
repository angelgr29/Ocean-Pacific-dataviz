"""Build the Red List Index trajectory chart (Plotly) for Part 3 biodiversity tab."""

from __future__ import annotations

import pandas as pd
import plotly.graph_objects as go

from src.config import DATA_DIR

RLI_INDICATOR = "15.5.1 Red List Index"
MIN_YEARS = 5
TRAIL_YEARS = 6


def _load_rli_frame() -> pd.DataFrame:
    df = pd.read_csv(DATA_DIR / "final_dataset.csv")
    df = df[df["Indicator"] == RLI_INDICATOR].copy()
    df["Year"] = pd.to_numeric(df["Year"], errors="coerce")
    df["Value"] = pd.to_numeric(df["Value"], errors="coerce")

    micronesia_names = {
        "Micronesia, Federated State of",
        "Micronesia (Federated States of)",
        "Federated States of Micronesia",
    }
    df.loc[df["Country"].isin(micronesia_names), "Country"] = "Micronesia"

    territories = pd.read_csv(DATA_DIR / "territories.csv")
    df = df[df["Country"].isin(territories["Country"])]

    return df.dropna(subset=["Country", "Year", "Value"]).sort_values(["Country", "Year"])


def _country_state(rli: pd.DataFrame, country: str, year: int) -> tuple[pd.Series, pd.DataFrame] | None:
    country_data = rli[(rli["Country"] == country) & (rli["Year"] <= year)].copy()
    if country_data.empty:
        return None
    current = country_data.iloc[-1]
    trail = country_data[country_data["Year"] >= year - TRAIL_YEARS]
    return current, trail


def _takeaway_reveal_year(
    rli: pd.DataFrame,
    countries: list[str],
    years: list[int],
    min_fraction: float = 0.55,
) -> int:
    for year in years:
        below_zero = 0
        total = 0
        for country in countries:
            state = _country_state(rli, country, year)
            if state is None:
                continue
            total += 1
            if float(state[0]["Change_from_start"]) < -0.0005:
                below_zero += 1
        if total and (below_zero / total) >= min_fraction:
            return year
    return years[max(1, len(years) // 3)]


def _takeaway_opacity(year: int, reveal_year: int, years: list[int], fade_steps: int = 4) -> float:
    if year < reveal_year:
        return 0.0
    reveal_idx = years.index(reveal_year)
    current_idx = years.index(year)
    progress = (current_idx - reveal_idx) / fade_steps
    return min(1.0, max(0.0, progress))


def _build_chart_annotations(
    x_range: list[float],
    y_range: list[float],
    regional_mean_rli: float,
    x_pad: float,
    takeaway_opacity: float,
) -> list[dict]:
    quadrant_labels = [
        (x_range[0], y_range[1], "left", "top", "<b>LOWER STATUS · IMPROVING</b>"),
        (x_range[1], y_range[1], "right", "top", "<b>HIGHER STATUS · IMPROVING</b>"),
        (x_range[0], y_range[0], "left", "bottom", "<b>LOWER STATUS · DECLINING</b>"),
        (x_range[1], y_range[0], "right", "bottom", "<b>HIGHER STATUS · DECLINING</b>"),
    ]

    annotations: list[dict] = []
    for x, y, xanchor, yanchor, text in quadrant_labels:
        annotations.append(dict(
            x=x, y=y, xref="x", yref="y", text=text, showarrow=False,
            xanchor=xanchor, yanchor=yanchor,
            font=dict(size=10, color="#527A57"), opacity=0.65,
        ))

    annotations.append(dict(
        x=regional_mean_rli, y=y_range[1], text="Pacific territories<br>mean RLI",
        showarrow=False, xanchor="left", yanchor="bottom",
        font=dict(size=9, color="#6B936F"),
    ))

    annotations.append(dict(
        x=x_range[1] - x_pad * 0.08,
        y=0,
        xref="x",
        yref="y",
        text="NO CHANGE FROM STARTING RLI",
        showarrow=False,
        xanchor="right",
        yanchor="bottom",
        font=dict(size=11, color="#6B936F"),
        opacity=0.62,
    ))

    takeaway_x = regional_mean_rli + (x_range[1] - regional_mean_rli) * 0.72
    takeaway_y = y_range[0] + (0 - y_range[0]) * 0.32
    body_gap = max(0.018, (y_range[1] - y_range[0]) * 0.07)

    annotations.append(dict(
        x=takeaway_x,
        y=takeaway_y,
        xref="x",
        yref="y",
        text=(
            "<span style='letter-spacing:3px;font-size:17px;font-weight:800;"
            "color:#1B5E20'>DECLINE IS THE DOMINANT TRAJECTORY</span>"
        ),
        showarrow=False,
        align="right",
        xanchor="right",
        yanchor="bottom",
        opacity=max(0.0, min(1.0, takeaway_opacity)),
    ))

    annotations.append(dict(
        x=takeaway_x,
        y=takeaway_y - body_gap,
        xref="x",
        yref="y",
        text=(
            "<span style='font-size:13px;font-weight:500;line-height:1.6;color:#527A57'>"
            "Most Pacific territories show a lower Red List Index<br>"
            "than at their first available observation.</span>"
        ),
        showarrow=False,
        align="right",
        xanchor="right",
        yanchor="top",
        opacity=max(0.0, min(1.0, takeaway_opacity * 0.92)),
    ))

    return annotations


def build_rli_chart_html() -> str:
    rli = _load_rli_frame()

    coverage = rli.groupby("Country")["Year"].nunique().reset_index(name="Years_Available")
    valid = coverage[coverage["Years_Available"] >= MIN_YEARS]["Country"]
    rli = rli[rli["Country"].isin(valid)].copy()

    first_values = (
        rli.sort_values("Year")
        .groupby("Country", as_index=False)
        .first()[["Country", "Year", "Value"]]
        .rename(columns={"Year": "First_Year", "Value": "First_Value"})
    )
    rli = rli.merge(first_values, on="Country", how="left")
    rli["Change_from_start"] = rli["Value"] - rli["First_Value"]

    regional_mean_rli = float(rli["Value"].mean())
    years = sorted(rli["Year"].astype(int).unique().tolist())
    countries = sorted(rli["Country"].unique().tolist())
    initial_year = years[0]

    x_min, x_max = float(rli["Value"].min()), float(rli["Value"].max())
    y_min, y_max = float(rli["Change_from_start"].min()), float(rli["Change_from_start"].max())
    x_pad = max((x_max - x_min) * 0.12, 0.01)
    y_pad = max((y_max - y_min) * 0.15, 0.01)
    x_range = [x_min - x_pad, x_max + x_pad]
    y_range = [y_min - y_pad, y_max + y_pad]
    reveal_year = _takeaway_reveal_year(rli, countries, years)

    fig = go.Figure()

    fig.add_shape(type="rect", x0=x_range[0], x1=regional_mean_rli, y0=0, y1=y_range[1],
                  fillcolor="rgba(115, 168, 112, 0.08)", line_width=0, layer="below")
    fig.add_shape(type="rect", x0=regional_mean_rli, x1=x_range[1], y0=0, y1=y_range[1],
                  fillcolor="rgba(69, 132, 75, 0.11)", line_width=0, layer="below")
    fig.add_shape(type="rect", x0=x_range[0], x1=regional_mean_rli, y0=y_range[0], y1=0,
                  fillcolor="rgba(172, 74, 59, 0.11)", line_width=0, layer="below")
    fig.add_shape(type="rect", x0=regional_mean_rli, x1=x_range[1], y0=y_range[0], y1=0,
                  fillcolor="rgba(201, 137, 84, 0.08)", line_width=0, layer="below")

    fig.add_vline(x=regional_mean_rli, line_dash="dash", line_width=1.5, opacity=0.65)
    fig.add_hline(y=0, line_dash="dash", line_width=1.5, opacity=0.75)

    for country in countries:
        state = _country_state(rli, country, initial_year)
        if state is None:
            fig.add_trace(go.Scatter(x=[], y=[], mode="lines", showlegend=False, hoverinfo="skip"))
            fig.add_trace(go.Scatter(x=[], y=[], mode="markers", showlegend=False, hoverinfo="skip"))
            continue

        current, trail = state
        fig.add_trace(go.Scatter(
            x=trail["Value"], y=trail["Change_from_start"],
            mode="lines", line=dict(width=2, color="#527A57"),
            opacity=0.28, showlegend=False, hoverinfo="skip",
        ))
        fig.add_trace(go.Scatter(
            x=[current["Value"]], y=[current["Change_from_start"]],
            mode="markers",
            marker=dict(size=13, color="#1B5E20", line=dict(width=1.5, color="#1B5E20")),
            customdata=[[country, int(current["Year"]), current["First_Value"], int(current["First_Year"])]],
            hovertemplate=(
                "<b>%{customdata[0]}</b><br>"
                "Year: %{customdata[1]}<br>"
                "RLI: %{x:.3f}<br>"
                "Change since %{customdata[3]}: %{y:+.3f}<br>"
                "Starting RLI: %{customdata[2]:.3f}<extra></extra>"
            ),
            showlegend=False,
        ))

    frames = []
    for year in years:
        frame_data = []
        for country in countries:
            state = _country_state(rli, country, year)
            if state is None:
                frame_data.append(go.Scatter(x=[], y=[]))
                frame_data.append(go.Scatter(x=[], y=[]))
                continue
            current, trail = state
            frame_data.append(go.Scatter(
                x=trail["Value"], y=trail["Change_from_start"],
                mode="lines", line=dict(width=2, color="#527A57"),
                opacity=0.28, hoverinfo="skip", showlegend=False,
            ))
            frame_data.append(go.Scatter(
                x=[current["Value"]], y=[current["Change_from_start"]],
                mode="markers",
                marker=dict(size=13, color="#1B5E20", line=dict(width=1.5, color="#1B5E20")),
                customdata=[[country, int(current["Year"]), current["First_Value"], int(current["First_Year"])]],
                hovertemplate=(
                    "<b>%{customdata[0]}</b><br>"
                    "Year: %{customdata[1]}<br>"
                    "RLI: %{x:.3f}<br>"
                    "Change since %{customdata[3]}: %{y:+.3f}<br>"
                    "Starting RLI: %{customdata[2]:.3f}<extra></extra>"
                ),
                showlegend=False,
            ))
        frames.append(go.Frame(
            data=frame_data,
            name=str(year),
            layout=go.Layout(
                title=dict(
                    text=(
                        "Red List Index trajectories"
                        f"<br><sup>{year} · Status versus change from each territory's starting point</sup>"
                    ),
                ),
                annotations=_build_chart_annotations(
                    x_range,
                    y_range,
                    regional_mean_rli,
                    x_pad,
                    _takeaway_opacity(year, reveal_year, years),
                ),
            ),
        ))

    fig.frames = frames

    slider_steps = [
        dict(
            method="animate",
            label=str(year),
            args=[[str(year)], dict(
                mode="immediate",
                frame=dict(duration=350, redraw=True),
                transition=dict(duration=250),
            )],
        )
        for year in years
    ]

    fig.update_layout(
        annotations=_build_chart_annotations(
            x_range,
            y_range,
            regional_mean_rli,
            x_pad,
            _takeaway_opacity(initial_year, reveal_year, years),
        ),
        updatemenus=[dict(
            type="buttons", direction="left", x=0, y=-0.08,
            xanchor="left", yanchor="top", showactive=False,
            buttons=[
                dict(label="▶ Play", method="animate", args=[None, dict(
                    frame=dict(duration=550, redraw=True),
                    transition=dict(duration=350),
                    fromcurrent=True, mode="immediate",
                )]),
                dict(label="❚❚ Pause", method="animate", args=[[None], dict(
                    frame=dict(duration=0, redraw=False),
                    transition=dict(duration=0), mode="immediate",
                )]),
            ],
        )],
        sliders=[dict(
            active=0,
            currentvalue=dict(prefix="Year  ", font=dict(size=16, color="#1B5E20")),
            pad=dict(t=50),
            steps=slider_steps,
        )],
        title=dict(
            text=(
                "Red List Index trajectories"
                f"<br><sup>{initial_year} · Status versus change from each territory's starting point</sup>"
            ),
            x=0.03, xanchor="left", font=dict(color="#1B5E20"),
        ),
        xaxis=dict(
            title="Red List Index in selected year →",
            range=x_range, gridcolor="rgba(27, 94, 32, 0.06)", zeroline=False,
        ),
        yaxis=dict(
            title="Change from first available observation →",
            range=y_range, gridcolor="rgba(27, 94, 32, 0.06)", zeroline=False,
        ),
        plot_bgcolor="#F7FBF7",
        paper_bgcolor="#F7FBF7",
        font=dict(family="Inter, Arial, sans-serif", color="#1B5E20"),
        height=680,
        margin=dict(l=80, r=40, t=90, b=130),
        hovermode="closest",
        showlegend=False,
    )

    return fig.to_html(
        full_html=False,
        include_plotlyjs="https://cdn.plot.ly/plotly-2.35.2.min.js",
        config={"displayModeBar": False, "responsive": True},
        div_id="rli-plotly-chart",
        auto_play=False,
    )
