function initEnvironmentMap() {
  const RLI_INDICATOR = "15.5.1 Red List Index";

  if (!window.PACIFIC_DATA) {
    console.error("PACIFIC_DATA missing — rebuild with: python3 build.py");
    return;
  }

  const environmentData = window.PACIFIC_DATA.environment;
  const territories = window.PACIFIC_DATA.territories;
  const indicatorConfig = window.PACIFIC_DATA.indicatorConfig;

  const climateView = document.getElementById("climate-view");
  const biodiversityView = document.getElementById("biodiversity-view");
  const pageHeader = document.querySelector(".page-header");

  const { svg, width, height } = setupSvg("#pacific-map", ".map-wrapper", 780);
  const projection = createPacificProjection(width, height, 0.55, -5, 20);

  let currentIndicator = "Surface Temperature anomalies";
  let viewMode = "climate";
  let availableYears = [];
  let currentIndex = 0;
  let timer = null;
  let isPlaying = false;
  let dataCircles;
  let circleRings;
  let connectorLayer;
  let dataLayer;
  let locationLayer;
  let labelLayer;

  const slider = document.getElementById("year-slider");
  const playButton = document.getElementById("play-button");
  const yearDisplay = document.getElementById("year-display");
  const regionalYear = document.getElementById("regional-year");
  const regionalValue = document.getElementById("regional-value");
  const regionalIndicator = document.getElementById("regional-indicator");
  const mapWrapper = document.querySelector(".map-wrapper");

  const story = createStoryMomentController({
    dimEl: document.getElementById("story-dim"),
    cardEl: document.getElementById("story-moment"),
    connectorEl: document.getElementById("story-connector"),
    wrapperEl: mapWrapper,
    timelineEl: document.querySelector(".timeline-panel"),
    sliderEl: slider,
  });

  drawBasemap(svg, projection, { width, height, withGlow: false, titleOffsetY: 0 })
    .then(() => {
      connectorLayer = svg.append("g");
      dataLayer = svg.append("g");
      locationLayer = svg.append("g");
      labelLayer = svg.append("g");
      initTerritories();
      wireControls();
      loadIndicator(currentIndicator);
    })
    .catch((error) => {
      console.error("Environment map failed to initialize:", error);
    });

  function isRliMode() {
    return viewMode === "rli";
  }

  function setViewMode(mode) {
    viewMode = mode;
    const rli = mode === "rli";

    climateView.classList.toggle("is-hidden", rli);
    biodiversityView.classList.toggle("is-hidden", !rli);
    biodiversityView.setAttribute("aria-hidden", rli ? "false" : "true");
    pageHeader.classList.toggle("is-hidden", rli);

    if (rli && window.Plotly) {
      const plot = document.getElementById("rli-plotly-chart");
      if (plot) {
        requestAnimationFrame(() => {
          window.Plotly.Plots.resize(plot);
        });
      }
    }
  }

  function initTerritories() {
    territories.forEach((d) => {
      const coords = projection([+d.Longitude, +d.Latitude]);
      d.anchorX = coords[0];
      d.anchorY = coords[1];
      d.x = d.anchorX + (+d.MarkerDx || 0);
      d.y = d.anchorY + (+d.MarkerDy || 0);
    });

    connectorLayer.selectAll(".location-line")
      .data(territories.filter((d) => Math.abs(+d.MarkerDx || 0) > 1 || Math.abs(+d.MarkerDy || 0) > 1))
      .enter()
      .append("line")
      .attr("class", "location-line")
      .attr("x1", (d) => d.anchorX)
      .attr("y1", (d) => d.anchorY)
      .attr("x2", (d) => d.x)
      .attr("y2", (d) => d.y);

    circleRings = dataLayer.selectAll(".data-circle-ring")
      .data(territories)
      .enter()
      .append("circle")
      .attr("class", "data-circle-ring")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", 29);

    dataCircles = dataLayer.selectAll(".data-circle")
      .data(territories)
      .enter()
      .append("circle")
      .attr("class", "data-circle")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", 23)
      .attr("fill", "#DCE9DD")
      .attr("stroke", "#AFC3B1");

    dataLayer.selectAll(".circle-highlight")
      .data(territories)
      .enter()
      .append("circle")
      .attr("class", "circle-highlight")
      .attr("cx", (d) => d.x - 7)
      .attr("cy", (d) => d.y - 7)
      .attr("r", 5);

    locationLayer.selectAll(".location-dot-outer")
      .data(territories)
      .enter()
      .append("circle")
      .attr("class", "location-dot-outer")
      .attr("cx", (d) => d.anchorX)
      .attr("cy", (d) => d.anchorY)
      .attr("r", 5);

    locationLayer.selectAll(".location-dot")
      .data(territories)
      .enter()
      .append("circle")
      .attr("class", "location-dot")
      .attr("cx", (d) => d.anchorX)
      .attr("cy", (d) => d.anchorY)
      .attr("r", 2.4);

    labelLayer.selectAll(".country-label")
      .data(territories)
      .enter()
      .append("text")
      .attr("class", "country-label")
      .attr("x", (d) => d.x + (+d.LabelDx || 29))
      .attr("y", (d) => d.y + (+d.LabelDy || 4))
      .attr("text-anchor", (d) => ((+d.LabelDx || 29) < 0 ? "end" : "start"))
      .text((d) => `${d.Flag} ${d.Country}`);
  }

  function createColorScale(indicator) {
    const config = indicatorConfig[indicator];
    const values = environmentData
      .filter((d) => d.Indicator === indicator)
      .map((d) => +d.Value)
      .filter(Number.isFinite);

    const minValue = Math.min(d3.min(values), 0);
    const maxValue = Math.max(d3.max(values), 0);

    return d3.scaleLinear()
      .domain([minValue, 0, maxValue])
      .range([config.low, config.neutral, config.high])
      .clamp(true);
  }

  function formatValue(indicator, value) {
    if (value === undefined || value === null || Number.isNaN(+value)) return "—";
    const config = indicatorConfig[indicator];
    const number = +value;
    const signedValue = `${number > 0 ? "+" : ""}${number.toFixed(config.decimals)}`;
    return config.unit ? `${signedValue} ${config.unit}` : signedValue;
  }

  function updateLegend() {
    const config = indicatorConfig[currentIndicator];
    document.getElementById("legend-title").textContent = config.label;

    const values = environmentData
      .filter((d) => d.Indicator === currentIndicator)
      .map((d) => +d.Value)
      .filter(Number.isFinite);
    const minValue = Math.min(d3.min(values), 0);
    const maxValue = Math.max(d3.max(values), 0);
    const legendUnit = config.unit ? ` ${config.unit}` : "";

    document.getElementById("legend-gradient").style.background =
      `linear-gradient(to right, ${config.low}, ${config.neutral}, ${config.high})`;
    document.getElementById("legend-min").textContent = `${minValue.toFixed(2)}${legendUnit}`;
    document.getElementById("legend-mid").textContent = `0${legendUnit}`;
    document.getElementById("legend-max").textContent = `${maxValue.toFixed(2)}${legendUnit}`;
  }

  function updateMap() {
    const year = availableYears[currentIndex];
    yearDisplay.textContent = year;
    slider.value = currentIndex;

    const transitionDuration = +year < 1980 ? 27 : 180;

    const currentData = environmentData.filter(
      (d) => d.Indicator === currentIndicator && +d.Year === +year
    );
    const valueMap = new Map(currentData.map((d) => [d.Country, +d.Value]));
    const scale = createColorScale(currentIndicator);

    dataCircles.transition().duration(transitionDuration)
      .attr("fill", (d) => {
        const value = valueMap.get(d.Country);
        return value === undefined ? "#DCE9DD" : scale(value);
      })
      .attr("stroke", (d) => {
        const value = valueMap.get(d.Country);
        return value === undefined ? "#AFC3B1" : d3.color(scale(value)).darker(0.7);
      });

    circleRings.transition().duration(transitionDuration)
      .attr("stroke", (d) => {
        const value = valueMap.get(d.Country);
        return value === undefined ? "#BCCDBC" : scale(value);
      });

    const displayedCountries = new Set(territories.map((d) => d.Country));
    const regionalValues = currentData
      .filter((d) => displayedCountries.has(d.Country))
      .map((d) => +d.Value)
      .filter(Number.isFinite);

    const average = regionalValues.length > 0 ? d3.mean(regionalValues) : null;
    const currentConfig = indicatorConfig[currentIndicator];

    regionalYear.textContent = `Year ${year}`;
    regionalValue.textContent = average === null ? "—" : formatValue(currentIndicator, average);
    regionalIndicator.textContent = currentConfig.baseline
      ? `${currentConfig.label} · ${currentConfig.baseline}`
      : currentConfig.label;
    regionalValue.style.color = average === null
      ? "#1B5E20"
      : d3.color(scale(average)).darker(0.65);

    updateLegend();
  }

  function loadIndicator(indicator) {
    currentIndicator = indicator;
    story.hide(true);
    stopAnimation();

    if (indicator === RLI_INDICATOR) {
      setViewMode("rli");
      return;
    }

    setViewMode("climate");

    availableYears = Array.from(new Set(
      environmentData
        .filter((d) => d.Indicator === currentIndicator)
        .map((d) => +d.Year)
    )).sort((a, b) => a - b);

    currentIndex = 0;
    slider.min = 0;
    slider.max = Math.max(availableYears.length - 1, 0);
    slider.step = 1;
    slider.value = 0;

    if (availableYears.length) {
      document.getElementById("year-min").textContent = availableYears[0];
      document.getElementById("year-max").textContent = availableYears[availableYears.length - 1];
    }

    updateMap();
  }

  function playAnimation() {
    if (currentIndex >= availableYears.length - 1) {
      currentIndex = 0;
      story.resetPlayback();
      updateMap();
    }
    isPlaying = true;
    playButton.textContent = "❚❚";
    scheduleNextFrame();
  }

  async function scheduleNextFrame() {
    if (!isPlaying || story.isActive()) return;

    if (currentIndex >= availableYears.length - 1) {
      stopAnimation();
      return;
    }

    const nextYear = availableYears[currentIndex + 1];
    const delay = +nextYear < 1980 ? 37 : 220;

    timer = setTimeout(async () => {
      if (!isPlaying || story.isActive()) return;

      currentIndex += 1;
      updateMap();

      const year = availableYears[currentIndex];
      const pausedForStory = await story.maybeShow(
        year,
        currentIndicator,
        availableYears,
        isPlaying
      );

      if (!isPlaying) return;
      if (pausedForStory) {
        scheduleNextFrame();
        return;
      }

      scheduleNextFrame();
    }, delay);
  }

  function stopAnimation() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    isPlaying = false;
    playButton.textContent = "▶";
    story.hide();
  }

  function setupIndicatorHint() {
    const hint = document.getElementById("indicator-hint");
    if (!hint) return;

    const dismissHint = () => {
      hint.classList.add("is-dismissed");
      document.querySelectorAll(".indicator-button").forEach((btn) => btn.classList.remove("hint-pulse"));
    };

    document.querySelectorAll(".indicator-button:not(.active)").forEach((btn) => {
      btn.classList.add("hint-pulse");
    });

    document.querySelectorAll(".indicator-button").forEach((button) => {
      button.addEventListener("click", dismissHint, { once: true });
    });

    setTimeout(dismissHint, 12000);
  }

  function wireControls() {
    playButton.addEventListener("click", () => {
      if (isPlaying) stopAnimation();
      else playAnimation();
    });

    slider.addEventListener("input", (event) => {
      stopAnimation();
      const newIndex = +event.target.value;
      const newYear = availableYears[newIndex];
      story.clearAvailabilityBeforeYear(newYear, currentIndicator);
      currentIndex = newIndex;
      updateMap();
    });

    document.querySelectorAll(".indicator-button").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".indicator-button").forEach((x) => x.classList.remove("active"));
        button.classList.add("active");
        loadIndicator(button.dataset.indicator);
      });
    });

    setupIndicatorHint();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(initEnvironmentMap, document.documentElement.classList.contains("book-embed") ? 80 : 0);
  });
} else {
  setTimeout(initEnvironmentMap, document.documentElement.classList.contains("book-embed") ? 80 : 0);
}
