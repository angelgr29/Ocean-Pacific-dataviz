/** Shared Pacific map utilities for D3 visualizations. */

const PACIFIC_ATLAS_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

function createPacificProjection(width, height, scaleFactor = 0.45, centerLat = -5, yOffset = 25) {
  return d3.geoNaturalEarth1()
    .rotate([-170, 0])
    .center([0, centerLat])
    .scale(width * scaleFactor)
    .translate([width / 2, height / 2 + yOffset]);
}

function setupSvg(selector, wrapperSelector, height) {
  const svg = d3.select(selector);
  const wrapper = document.querySelector(wrapperSelector);
  if (!wrapper) {
    throw new Error(`Map wrapper not found: ${wrapperSelector}`);
  }

  const isEmbed = document.documentElement.classList.contains("book-embed");

  function measureWidth() {
    return Math.max(
      wrapper.clientWidth || 0,
      wrapper.getBoundingClientRect().width || 0,
      isEmbed ? window.innerWidth - 32 : 0,
      1200
    );
  }

  let measured = measureWidth();

  svg
    .attr("width", "100%")
    .attr("height", height)
    .attr("viewBox", `0 0 ${measured} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  if (isEmbed) {
    window.addEventListener("resize", () => {
      measured = measureWidth();
      svg.attr("viewBox", `0 0 ${measured} ${height}`);
    });
  }

  return { svg, wrapper, width: measured, height };
}

function drawBasemap(svg, projection, options = {}) {
  const path = d3.geoPath(projection);
  const withGlow = options.withGlow !== false;

  svg.append("path")
    .datum({ type: "Sphere" })
    .attr("class", "sphere")
    .attr("d", path);

  svg.append("path")
    .datum(d3.geoGraticule10())
    .attr("class", "graticule")
    .attr("d", path);

  svg.append("text")
    .attr("class", "ocean-title")
    .attr("x", options.width / 2)
    .attr("y", options.height / 2 + (options.titleOffsetY || 15))
    .attr("text-anchor", "middle")
    .text("PACIFIC");

  const mapLayer = svg.append("g");

  return d3.json(PACIFIC_ATLAS_URL).then((world) => {
    const countries = topojson.feature(world, world.objects.countries);

    if (withGlow) {
      mapLayer.append("path")
        .datum(countries)
        .attr("class", "coast-glow")
        .attr("d", path);
    }

    mapLayer.selectAll(".land")
      .data(countries.features)
      .enter()
      .append("path")
      .attr("class", "land")
      .attr("d", path);

    return { mapLayer, path, countries };
  }).catch((error) => {
    console.error("World map failed to load:", error);
    return { mapLayer, path, countries: null };
  });
}

function projectPoints(data, projection, lonKey = "Longitude", latKey = "Latitude") {
  data.forEach((d) => {
    const coords = projection([+d[lonKey], +d[latKey]]);
    d.x = coords[0];
    d.y = coords[1];
  });
}
