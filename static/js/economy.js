function initEconomyMap() {
  if (!window.PACIFIC_DATA) {
    console.error("PACIFIC_DATA missing — rebuild with: python3 build.py");
    return;
  }

  const tourism = window.PACIFIC_DATA.tourism;
  const { svg, wrapper, width, height } = setupSvg("#pacific-map", ".map-wrapper", 700);
  const projection = createPacificProjection(width, height, 0.45, -5, 25);
  const tooltip = d3.select("#tooltip");

  const radius = d3.scaleSqrt()
    .domain([0, d3.max(tourism, (d) => +d.Value)])
    .range([5, 44]);

  drawBasemap(svg, projection, { width, height }).then(drawTourism);

  function drawTourism() {
    const auraLayer = svg.append("g");
    const bubbleLayer = svg.append("g");
    const labelLayer = svg.append("g");

    projectPoints(tourism, projection);

    const auraOuter = 62;
    const auraMiddle = 45;
    const auraInner = 30;

    [["aura-outer", auraOuter], ["aura-middle", auraMiddle], ["aura-inner", auraInner]].forEach(
      ([className, r]) => {
        auraLayer.selectAll(`.${className}`)
          .data(tourism)
          .enter()
          .append("circle")
          .attr("class", className)
          .attr("cx", (d) => d.x)
          .attr("cy", (d) => d.y)
          .attr("r", r);
      }
    );

    const pulseData = tourism.filter((d) => +d.Value >= 18);
    const pulse = bubbleLayer.selectAll(".pulse-ring")
      .data(pulseData)
      .enter()
      .append("circle")
      .attr("class", "pulse-ring")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", (d) => radius(+d.Value));

    function animatePulse() {
      pulse
        .attr("r", (d) => radius(+d.Value))
        .attr("opacity", 0.38)
        .transition()
        .duration(2500)
        .ease(d3.easeCubicOut)
        .attr("r", (d) => radius(+d.Value) + 18)
        .attr("opacity", 0)
        .on("end", animatePulse);
    }
    animatePulse();

    const bubbles = bubbleLayer.selectAll(".bubble")
      .data(tourism)
      .enter()
      .append("circle")
      .attr("class", "bubble bubble-world")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", (d) => radius(+d.Value))
      .attr("fill-opacity", 0.82)
      .on("mouseenter", function (_event, d) {
        d3.select(this).transition().duration(160).attr("r", radius(+d.Value) * 1.12);
        tooltip.style("opacity", 1).html(`
          <div class="tooltip-country">${d.Flag} ${d.Country}</div>
          <div class="tooltip-stat">Tourism contribution:
            <span class="tooltip-value">${(+d.Value).toFixed(2)}%</span>
          </div>
          <div class="tooltip-source">Source: ${d.Source}</div>
        `);
      })
      .on("mousemove", function (event) {
        const box = wrapper.getBoundingClientRect();
        tooltip
          .style("left", `${event.clientX - box.left + 15}px`)
          .style("top", `${event.clientY - box.top + 15}px`);
      })
      .on("mouseleave", function (_event, d) {
        d3.select(this).transition().duration(160).attr("r", radius(+d.Value));
        tooltip.style("opacity", 0);
      });

    bubbleLayer.selectAll(".inner-bubble")
      .data(tourism)
      .enter()
      .append("circle")
      .attr("class", "inner-bubble")
      .attr("cx", (d) => d.x - radius(+d.Value) * 0.20)
      .attr("cy", (d) => d.y - radius(+d.Value) * 0.20)
      .attr("r", (d) => Math.max(3, radius(+d.Value) * 0.22));

    labelLayer.selectAll(".leader-line")
      .data(tourism)
      .enter()
      .append("line")
      .attr("class", "leader-line")
      .attr("x1", (d) => d.x)
      .attr("y1", (d) => d.y)
      .attr("x2", (d) => d.x + +d.dx)
      .attr("y2", (d) => d.y + +d.dy);

    labelLayer.selectAll(".country-label")
      .data(tourism)
      .enter()
      .append("text")
      .attr("class", "country-label")
      .attr("x", (d) => d.x + +d.dx)
      .attr("y", (d) => d.y + +d.dy)
      .attr("text-anchor", (d) => (+d.dx < 0 ? "end" : "start"))
      .text((d) => `${d.Flag} ${d.Country}`);

    labelLayer.selectAll(".value-label")
      .data(tourism)
      .enter()
      .append("text")
      .attr("class", "value-label")
      .attr("x", (d) => d.x + +d.dx)
      .attr("y", (d) => d.y + +d.dy + 16)
      .attr("text-anchor", (d) => (+d.dx < 0 ? "end" : "start"))
      .text((d) => `${(+d.Value).toFixed(1)}%`);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(initEconomyMap, document.documentElement.classList.contains("book-embed") ? 80 : 0);
  });
} else {
  setTimeout(initEconomyMap, document.documentElement.classList.contains("book-embed") ? 80 : 0);
}
