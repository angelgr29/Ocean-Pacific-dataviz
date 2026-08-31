function initAttractionsMap() {
  if (!window.PACIFIC_DATA) {
    console.error("PACIFIC_DATA missing — rebuild with: python3 build.py");
    return;
  }

  const attractions = window.PACIFIC_DATA.attractions;
  const { svg, width, height } = setupSvg("#pacific-map", ".map-wrapper", 780);
  const projection = createPacificProjection(width, height, 0.65, -7, 30);

  const card = document.getElementById("attraction-card");
  const cardImage = document.getElementById("card-image");
  const cardCountry = document.getElementById("card-country");
  const cardTitle = document.getElementById("card-title");
  const cardExperience = document.getElementById("card-experience");
  const cardDescription = document.getElementById("card-description");

  drawBasemap(svg, projection, { width, height, titleOffsetY: 20 }).then(drawAttractions);

  function showCard(d) {
    if (d.Image) {
      cardImage.src = d.Image;
      cardImage.style.display = "block";
    } else {
      cardImage.removeAttribute("src");
      cardImage.style.display = "none";
    }
    cardImage.alt = d.Attraction;
    cardCountry.textContent = `${d.Flag} ${d.Country}`;
    cardTitle.textContent = d.Attraction;
    cardExperience.textContent = d.Experience;
    cardDescription.textContent = d.Description;
    card.classList.add("visible");
  }

  function hideCard() {
    card.classList.remove("visible");
  }

  function drawAttractions() {
    const markerLayer = svg.append("g");
    const labelLayer = svg.append("g");

    projectPoints(attractions, projection);

    const rings = markerLayer.selectAll(".marker-ring")
      .data(attractions)
      .enter()
      .append("circle")
      .attr("class", "marker-ring")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", 11);

    function animateRings() {
      rings
        .attr("r", 10)
        .attr("opacity", 0.35)
        .transition()
        .duration(2500)
        .ease(d3.easeCubicOut)
        .attr("r", 19)
        .attr("opacity", 0)
        .on("end", animateRings);
    }
    animateRings();

    markerLayer.selectAll(".marker-halo")
      .data(attractions)
      .enter()
      .append("circle")
      .attr("class", "marker-halo")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", 8);

    const markers = markerLayer.selectAll(".marker")
      .data(attractions)
      .enter()
      .append("circle")
      .attr("class", "marker")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", 5)
      .on("mouseenter", function (_event, d) {
        d3.select(this).transition().duration(160).attr("r", 8);
        showCard(d);
      })
      .on("mouseleave", function () {
        d3.select(this).transition().duration(160).attr("r", 5);
        hideCard();
      });

    labelLayer.selectAll(".country-label")
      .data(attractions)
      .enter()
      .append("text")
      .attr("class", "country-label")
      .attr("x", (d) => d.x + 11)
      .attr("y", (d) => d.y + 4)
      .text((d) => `${d.Flag} ${d.Country}`);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(initAttractionsMap, document.documentElement.classList.contains("book-embed") ? 80 : 0);
  });
} else {
  setTimeout(initAttractionsMap, document.documentElement.classList.contains("book-embed") ? 80 : 0);
}
