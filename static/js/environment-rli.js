/**
 * Red List Index trajectory chart — status (x) vs change from start (y).
 */

const RLI_INDICATOR = "15.5.1 Red List Index";
const RLI_MIN_YEARS = 5;
const RLI_TRAIL_YEARS = 6;
const RLI_CHART_HEIGHT = 620;

const RLI_QUADRANTS = [
  { x0: (d, m) => d[0], x1: (d, m) => m, y0: 0, y1: (d) => d[1], fill: "rgba(115, 168, 112, 0.10)" },
  { x0: (d, m) => m, x1: (d) => d[1], y0: 0, y1: (d) => d[1], fill: "rgba(69, 132, 75, 0.13)" },
  { x0: (d, m) => d[0], x1: (d, m) => m, y0: (d) => d[0], y1: 0, fill: "rgba(172, 74, 59, 0.12)" },
  { x0: (d, m) => m, x1: (d) => d[1], y0: (d) => d[0], y1: 0, fill: "rgba(201, 137, 84, 0.09)" },
];

function prepareRliSeries(environmentData) {
  const rows = environmentData
    .filter((d) => d.Indicator === RLI_INDICATOR)
    .map((d) => ({
      Country: d.Country,
      Year: +d.Year,
      Value: +d.Value,
    }))
    .filter((d) => Number.isFinite(d.Year) && Number.isFinite(d.Value))
    .sort((a, b) => a.Country.localeCompare(b.Country) || a.Year - b.Year);

  const grouped = d3.group(rows, (d) => d.Country);
  const countries = [...grouped.keys()]
    .filter((country) => new Set(grouped.get(country).map((d) => d.Year)).size >= RLI_MIN_YEARS)
    .sort();

  const enriched = [];
  for (const country of countries) {
    const pts = grouped.get(country).sort((a, b) => a.Year - b.Year);
    const first = pts[0];
    for (const pt of pts) {
      enriched.push({
        Country: country,
        Year: pt.Year,
        Value: pt.Value,
        FirstYear: first.Year,
        FirstValue: first.Value,
        ChangeFromStart: pt.Value - first.Value,
      });
    }
  }

  const byCountry = d3.group(enriched, (d) => d.Country);
  const years = [...new Set(enriched.map((d) => d.Year))].sort((a, b) => a - b);
  const regionalMean = d3.mean(enriched, (d) => d.Value);

  const xMin = d3.min(enriched, (d) => d.Value);
  const xMax = d3.max(enriched, (d) => d.Value);
  const yMin = d3.min(enriched, (d) => d.ChangeFromStart);
  const yMax = d3.max(enriched, (d) => d.ChangeFromStart);

  const xPad = Math.max((xMax - xMin) * 0.12, 0.01);
  const yPad = Math.max((yMax - yMin) * 0.15, 0.01);

  return {
    countries,
    years,
    regionalMean,
    byCountry,
    xDomain: [xMin - xPad, xMax + xPad],
    yDomain: [yMin - yPad, yMax + yPad],
  };
}

function rliCountryState(series, country, year) {
  const pts = (series.byCountry.get(country) ?? []).filter((d) => d.Year <= year);
  if (!pts.length) return null;
  const current = pts[pts.length - 1];
  const trail = pts.filter((d) => d.Year >= year - RLI_TRAIL_YEARS);
  return { current, trail };
}

function createRliTrajectoryView(containerSelector, environmentData) {
  const container = document.querySelector(containerSelector);
  if (!container) return null;

  const series = prepareRliSeries(environmentData);
  if (!series.years.length) {
    container.querySelector(".rli-canvas").innerHTML =
      "<p class=\"rli-empty\">Not enough Red List Index data to display.</p>";
    return null;
  }

  const margin = { top: 48, right: 40, bottom: 56, left: 78 };
  let width = 0;
  let height = RLI_CHART_HEIGHT;
  let currentYear = series.years[0];

  const subtitleEl = container.querySelector(".rli-subtitle");
  const canvas = container.querySelector(".rli-canvas");
  const svg = d3.select(container.querySelector("#rli-chart"));
  const tooltip = d3.select(container.querySelector(".rli-tooltip"));

  if (svg.empty()) return null;

  svg.selectAll("*").remove();

  const colorScale = d3.scaleOrdinal()
    .domain(series.countries)
    .range([
      "#1B5E20", "#45854B", "#6B936F", "#527A57", "#8B593A",
      "#347BA2", "#396F9E", "#4E8455", "#9C6A45", "#A52E25",
      "#3F6844", "#66BB6A", "#2E7D32", "#689F38", "#558B2F",
      "#33691E", "#00695C", "#004D40", "#827717", "#558B2F",
      "#689F38", "#33691E",
    ]);

  const gRoot = svg.append("g").attr("class", "rli-root");
  const gQuadrants = gRoot.append("g").attr("class", "rli-quadrants");
  const gGrid = gRoot.append("g").attr("class", "rli-grid");
  const gRefs = gRoot.append("g").attr("class", "rli-refs");
  const gLabels = gRoot.append("g").attr("class", "rli-labels");
  const gTrails = gRoot.append("g").attr("class", "rli-trails");
  const gPoints = gRoot.append("g").attr("class", "rli-points");
  const gAxes = gRoot.append("g").attr("class", "rli-axes");

  const xScale = d3.scaleLinear();
  const yScale = d3.scaleLinear();

  function linePath(trail) {
    return d3.line()
      .x((d) => xScale(d.Value))
      .y((d) => yScale(d.ChangeFromStart))(trail);
  }

  function drawStaticLayers() {
    const xDom = series.xDomain;
    const yDom = series.yDomain;
    const mean = series.regionalMean;

    gQuadrants.selectAll("rect")
      .data(RLI_QUADRANTS)
      .join("rect")
      .attr("x", (q) => xScale(Math.min(q.x0(xDom, mean), q.x1(xDom, mean))))
      .attr("y", (q) => yScale(Math.max(q.y0(yDom, mean), q.y1(yDom, mean))))
      .attr("width", (q) => Math.abs(xScale(q.x1(xDom, mean)) - xScale(q.x0(xDom, mean))))
      .attr("height", (q) => Math.abs(yScale(q.y0(yDom, mean)) - yScale(q.y1(yDom, mean))))
      .attr("fill", (q) => q.fill);

    const xTicks = xScale.ticks(6);
    const yTicks = yScale.ticks(6);

    gGrid.selectAll("line.x")
      .data(xTicks)
      .join("line")
      .attr("x1", (t) => xScale(t))
      .attr("x2", (t) => xScale(t))
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .attr("stroke", "rgba(27, 94, 32, 0.06)");

    gGrid.selectAll("line.y")
      .data(yTicks)
      .join("line")
      .attr("x1", margin.left)
      .attr("x2", width - margin.right)
      .attr("y1", (t) => yScale(t))
      .attr("y2", (t) => yScale(t))
      .attr("stroke", "rgba(27, 94, 32, 0.06)");

    gRefs.selectAll("*").remove();
    gRefs.append("line")
      .attr("class", "rli-ref-line")
      .attr("x1", xScale(mean))
      .attr("x2", xScale(mean))
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom);
    gRefs.append("line")
      .attr("class", "rli-ref-line")
      .attr("x1", margin.left)
      .attr("x2", width - margin.right)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0));

    const labelData = [
      { text: "LOWER STATUS · IMPROVING", x: xDom[0], y: yDom[1], anchor: "start", baseline: "hanging" },
      { text: "HIGHER STATUS · IMPROVING", x: xDom[1], y: yDom[1], anchor: "end", baseline: "hanging" },
      { text: "LOWER STATUS · DECLINING", x: xDom[0], y: yDom[0], anchor: "start", baseline: "auto" },
      { text: "HIGHER STATUS · DECLINING", x: xDom[1], y: yDom[0], anchor: "end", baseline: "auto" },
    ];

    gLabels.selectAll("text.quadrant")
      .data(labelData)
      .join("text")
      .attr("class", "quadrant")
      .attr("x", (d) => xScale(d.x) + (d.anchor === "start" ? 8 : -8))
      .attr("y", (d) => yScale(d.y) + (d.baseline === "hanging" ? 10 : -10))
      .attr("text-anchor", (d) => d.anchor)
      .attr("dominant-baseline", (d) => d.baseline)
      .text((d) => d.text);

    gLabels.selectAll("text.mean-label")
      .data([mean])
      .join("text")
      .attr("class", "mean-label")
      .attr("x", (d) => xScale(d) + 6)
      .attr("y", margin.top + 6)
      .text("Pacific territories mean RLI");

    gAxes.selectAll("*").remove();
    gAxes.append("g")
      .attr("class", "rli-axis x-axis")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.format(".2f")));
    gAxes.append("g")
      .attr("class", "rli-axis y-axis")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale).ticks(6).tickFormat((d) => `${d >= 0 ? "+" : ""}${d3.format(".2f")(d)}`));
    gAxes.append("text")
      .attr("class", "rli-axis-title x")
      .attr("x", (margin.left + width - margin.right) / 2)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .text("Red List Index in selected year →");
    gAxes.append("text")
      .attr("class", "rli-axis-title y")
      .attr("transform", "rotate(-90)")
      .attr("x", -(margin.top + height - margin.bottom) / 2)
      .attr("y", 16)
      .attr("text-anchor", "middle")
      .text("Change from first available observation →");
  }

  function layoutChart() {
    width = Math.max(canvas.clientWidth || container.clientWidth || 900, 640);
    height = RLI_CHART_HEIGHT;

    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    xScale.domain(series.xDomain).range([margin.left, width - margin.right]);
    yScale.domain(series.yDomain).range([height - margin.bottom, margin.top]);

    drawStaticLayers();
    updateYear(currentYear, 0);
  }

  function updateYear(year, duration = 350) {
    currentYear = year;

    if (subtitleEl) {
      subtitleEl.textContent =
        `${year} · Status versus change from each territory's starting point`;
    }

    const t = duration > 0
      ? d3.transition().duration(duration).ease(d3.easeCubicOut)
      : null;

    gTrails.selectAll("path")
      .data(series.countries, (d) => d)
      .join("path")
      .attr("class", "rli-trail")
      .attr("fill", "none")
      .attr("stroke", (d) => colorScale(d))
      .attr("stroke-width", 2)
      .attr("opacity", 0.28)
      .attr("d", (country) => {
        const state = rliCountryState(series, country, year);
        return state ? linePath(state.trail) : null;
      });

    const circles = gPoints.selectAll("circle")
      .data(series.countries, (d) => d)
      .join("circle")
      .attr("class", "rli-point")
      .attr("r", 6.5)
      .attr("stroke", "#1B5E20")
      .attr("stroke-width", 1.5)
      .attr("fill", (country) => colorScale(country))
      .attr("opacity", (country) => (rliCountryState(series, country, year) ? 1 : 0))
      .attr("cx", (country) => {
        const state = rliCountryState(series, country, year);
        return state ? xScale(state.current.Value) : 0;
      })
      .attr("cy", (country) => {
        const state = rliCountryState(series, country, year);
        return state ? yScale(state.current.ChangeFromStart) : 0;
      });

    if (t) circles.transition(t).attr("opacity", (country) => (rliCountryState(series, country, year) ? 1 : 0));

    gPoints.selectAll("circle")
      .on("mousemove", (event, country) => {
        const state = rliCountryState(series, country, year);
        if (!state) return;
        const d = state.current;
        tooltip
          .style("opacity", 1)
          .style("left", `${event.offsetX + 14}px`)
          .style("top", `${event.offsetY - 10}px`)
          .html(
            `<strong>${d.Country}</strong><br>`
            + `Year: ${d.Year}<br>`
            + `RLI: ${d.Value.toFixed(3)}<br>`
            + `Change since ${d.FirstYear}: ${d.ChangeFromStart >= 0 ? "+" : ""}${d.ChangeFromStart.toFixed(3)}<br>`
            + `Starting RLI: ${d.FirstValue.toFixed(3)}`
          );
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));
  }

  function onResize() {
    layoutChart();
  }

  window.addEventListener("resize", onResize);
  layoutChart();

  return {
    years: series.years,
    regionalMean: series.regionalMean,
    updateYear,
    resize: onResize,
    destroy() {
      window.removeEventListener("resize", onResize);
      svg.selectAll("*").remove();
    },
  };
}
