const TEMPERATURE_INDICATORS = [
  "Surface Temperature anomalies",
  "Sea Surface Temperature anomalies",
];

const storyMoments = [
  {
    year: 1988,
    eyebrow: "A NEW WARMING PATTERN",
    headline: "Above average becomes the new normal.",
    body:
      "From the late 1980s onward, Pacific territories consistently shift toward "
      + "positive temperature anomalies, marking a sustained departure from the "
      + "historical baseline.",
    period: "LATE 1980s →",
    duration: 3500,
  },
];

function createStoryMomentController(options) {
  const {
    dimEl,
    cardEl,
    connectorEl,
    wrapperEl,
    timelineEl,
    sliderEl,
  } = options;

  const triggered = new Set();
  let active = false;
  let dismissTimer = null;

  function momentKey(moment, indicator) {
    return `${indicator}:${moment.year}`;
  }

  function isTemperatureIndicator(indicator) {
    return TEMPERATURE_INDICATORS.includes(indicator);
  }

  function findMoment(year, indicator) {
    if (!isTemperatureIndicator(indicator)) return null;
    return storyMoments.find((moment) => +year === +moment.year) || null;
  }

  function yearToSliderRatio(year, availableYears) {
    const index = availableYears.indexOf(+year);
    if (index < 0) return null;
    const maxIndex = availableYears.length - 1;
    return maxIndex > 0 ? index / maxIndex : 0;
  }

  function populateCard(moment) {
    cardEl.querySelector(".story-moment-eyebrow").textContent = moment.eyebrow;
    cardEl.querySelector(".story-moment-headline").textContent = moment.headline;
    cardEl.querySelector(".story-moment-body").textContent = moment.body;
    cardEl.querySelector(".story-moment-period").textContent = moment.period;
  }

  function positionConnector(year, availableYears) {
    const line = connectorEl.querySelector("line");
    const dot = connectorEl.querySelector("circle");
    const ratio = yearToSliderRatio(year, availableYears);
    if (ratio === null) return;

    const wrapperRect = wrapperEl.getBoundingClientRect();
    const cardRect = cardEl.getBoundingClientRect();
    const sliderRect = sliderEl.getBoundingClientRect();
    const timelineRect = timelineEl.getBoundingClientRect();
    const width = wrapperEl.offsetWidth;
    const height = wrapperEl.offsetHeight;

    const x1 = cardRect.left + cardRect.width * 0.32 - wrapperRect.left;
    const y1 = cardRect.bottom - wrapperRect.top - 6;
    const x2 = sliderRect.left + sliderRect.width * ratio - wrapperRect.left;
    const y2 = timelineRect.top - wrapperRect.top + 10;

    connectorEl.setAttribute("viewBox", `0 0 ${width} ${height}`);
    connectorEl.setAttribute("width", width);
    connectorEl.setAttribute("height", height);
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    dot.setAttribute("cx", x2);
    dot.setAttribute("cy", y2);
  }

  function hide(immediate = false) {
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }

    active = false;
    dimEl.classList.remove("visible");
    cardEl.classList.remove("visible");
    connectorEl.classList.remove("visible");
    cardEl.setAttribute("aria-hidden", "true");

    if (immediate) {
      [dimEl, cardEl, connectorEl].forEach((element) => {
        element.style.transition = "none";
      });
      requestAnimationFrame(() => {
        [dimEl, cardEl, connectorEl].forEach((element) => {
          element.style.transition = "";
        });
      });
    }
  }

  function show(moment, availableYears) {
    return new Promise((resolve) => {
      active = true;
      populateCard(moment);
      cardEl.setAttribute("aria-hidden", "false");

      requestAnimationFrame(() => {
        dimEl.classList.add("visible");
        cardEl.classList.add("visible");

        requestAnimationFrame(() => {
          positionConnector(moment.year, availableYears);
          connectorEl.classList.add("visible");
        });
      });

      dismissTimer = setTimeout(() => {
        hide();
        dismissTimer = null;
        resolve();
      }, moment.duration || 3500);
    });
  }

  async function maybeShow(year, indicator, availableYears, isPlaying) {
    if (!isPlaying || active) return false;

    const moment = findMoment(year, indicator);
    if (!moment) return false;

    const key = momentKey(moment, indicator);
    if (triggered.has(key)) return false;

    triggered.add(key);
    await show(moment, availableYears);
    return true;
  }

  function resetPlayback() {
    triggered.clear();
    hide(true);
  }

  function clearAvailabilityBeforeYear(year, indicator) {
    storyMoments.forEach((moment) => {
      if (+year < +moment.year) {
        triggered.delete(momentKey(moment, indicator));
      }
    });
    hide(true);
  }

  return {
    maybeShow,
    hide,
    resetPlayback,
    clearAvailabilityBeforeYear,
    isActive: () => active,
  };
}
