function initCheckpoint() {
  const SCALE = 1.175;
  const NODE_R = Math.round(37 * SCALE);

  const svg = document.getElementById("journey-svg");
  const journal = document.querySelector(".journal");
  const checkpointEl = document.querySelector(".checkpoint");
  const badChoice = document.getElementById("bad-choice");
  const goodChoice = document.getElementById("good-choice");
  const resetButton = document.getElementById("reset-button");

  let width = Math.max(
    journal.clientWidth || 0,
    journal.getBoundingClientRect().width || 0,
    document.documentElement.classList.contains("book-embed") ? window.innerWidth : 0,
    1200
  );
  const height = 780;

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const lx = (pct) => width * (0.5 + (pct - 0.5) * SCALE);
  const ly = (y) => 88 + (y - 88) * SCALE;

  function svgElement(tag) {
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
  }

  function addText(x, y, text, className) {
    const element = svgElement("text");
    element.setAttribute("x", x);
    element.setAttribute("y", y);
    element.setAttribute("class", className);
    element.textContent = text;
    svg.appendChild(element);
    return element;
  }

  function addPath(d, className) {
    const path = svgElement("path");
    path.setAttribute("d", d);
    path.setAttribute("class", className);
    svg.appendChild(path);
    return path;
  }

  const nodes = [
    { x: lx(0.22), y: ly(178), icon: "🌴", title: "Natural ecosystems", subtitle: "The attraction" },
    { x: lx(0.355), y: ly(268), icon: "✈️", title: "Tourism demand", subtitle: "Visitors arrive" },
    { x: lx(0.49), y: ly(178), icon: "💰", title: "Economic value", subtitle: "Income · jobs · growth" },
    { x: lx(0.625), y: ly(268), icon: "🏨", title: "Tourism expansion", subtitle: "Infrastructure · mobility · activity" },
    { x: lx(0.755), y: ly(178), icon: "⚠️", title: "Environmental pressure", subtitle: "The trade-off emerges" },
  ];

  const checkpointX = lx(0.5);
  const checkpointY = ly(408);

  const badEndX = lx(0.155);
  const badEndY = ly(628);
  const goodEndX = lx(0.845);
  const goodEndY = ly(628);

  const mainRoute = addPath(
    `
    M ${nodes[0].x} ${nodes[0].y}
    C ${lx(0.28)} ${ly(108)}, ${lx(0.31)} ${ly(332)}, ${nodes[1].x} ${nodes[1].y}
    S ${lx(0.44)} ${ly(112)}, ${nodes[2].x} ${nodes[2].y}
    S ${lx(0.58)} ${ly(332)}, ${nodes[3].x} ${nodes[3].y}
    S ${lx(0.71)} ${ly(118)}, ${nodes[4].x} ${nodes[4].y}
    `,
    "route"
  );

  const checkpointRoute = addPath(
    `
    M ${nodes[4].x} ${nodes[4].y + NODE_R + 2}
    C ${lx(0.73)} ${ly(318)}, ${lx(0.58)} ${ly(352)}, ${checkpointX} ${checkpointY - NODE_R - 6}
    `,
    "route"
  );

  nodes.forEach((node) => {
    const circle = svgElement("circle");
    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.y);
    circle.setAttribute("r", NODE_R);
    circle.setAttribute("class", "node-main");
    svg.appendChild(circle);

    addText(node.x, node.y + 1, node.icon, "node-icon");
    addText(node.x, node.y + Math.round(59 * SCALE), node.title, "node-title");
    addText(node.x, node.y + Math.round(76 * SCALE), node.subtitle, "node-subtitle");
  });

  const badRoute = addPath(
    `
    M ${checkpointX - 34} ${checkpointY + NODE_R - 4}
    C ${lx(0.41)} ${ly(528)}, ${lx(0.28)} ${ly(552)}, ${badEndX} ${badEndY}
    `,
    "route route-bad route-fork"
  );

  const goodRoute = addPath(
    `
    M ${checkpointX + 34} ${checkpointY + NODE_R - 4}
    C ${lx(0.59)} ${ly(528)}, ${lx(0.72)} ${ly(552)}, ${goodEndX} ${goodEndY}
    `,
    "route route-good route-fork"
  );

  const goodRouteContinue = addPath(
    `
    M ${goodEndX} ${goodEndY}
    C ${lx(0.92)} ${ly(612)}, ${lx(0.98)} ${ly(590)}, ${width * 1.06} ${ly(568)}
    `,
    "route route-good route-continue route-fork"
  );

  addText(badEndX, badEndY, "🪸", "node-icon node-end-icon");
  addText(goodEndX, goodEndY, "🌱", "node-icon node-end-icon");

  const planePath = addPath(
    `
    M ${nodes[0].x} ${nodes[0].y}
    C ${lx(0.28)} ${ly(108)}, ${lx(0.31)} ${ly(332)}, ${nodes[1].x} ${nodes[1].y}
    S ${lx(0.44)} ${ly(112)}, ${nodes[2].x} ${nodes[2].y}
    S ${lx(0.58)} ${ly(332)}, ${nodes[3].x} ${nodes[3].y}
    S ${lx(0.71)} ${ly(118)}, ${nodes[4].x} ${nodes[4].y}
    C ${lx(0.73)} ${ly(318)}, ${lx(0.58)} ${ly(352)}, ${checkpointX} ${checkpointY}
    `,
    "plane-path"
  );
  planePath.setAttribute("fill", "none");
  planePath.setAttribute("stroke", "none");

  const plane = svgElement("text");
  plane.setAttribute("class", "plane");
  plane.textContent = "✈";
  svg.appendChild(plane);

  const forkPaths = [badRoute, goodRoute, goodRouteContinue];
  const journeyLength = planePath.getTotalLength();

  let mainFrame = null;
  let forkFrame = null;
  let phase = "idle";

  function setPlaneAt(distance) {
    const point = planePath.getPointAtLength(distance);
    const nextPoint = planePath.getPointAtLength(Math.min(distance + 3, journeyLength));
    const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * (180 / Math.PI);
    plane.setAttribute("x", point.x);
    plane.setAttribute("y", point.y - 13);
    plane.setAttribute("transform", `rotate(${angle}, ${point.x}, ${point.y - 13})`);
  }

  function prepareForkPaths() {
    forkPaths.forEach((path) => {
      const len = path.getTotalLength();
      path.style.strokeDasharray = `${len}`;
      path.style.strokeDashoffset = `${len}`;
      path.classList.remove(
        "route-drawn",
        "route-terminated",
        "route-continued",
        "route-drawing",
        "route-emphasis"
      );
    });
  }

  function resetVisualState() {
    phase = "idle";
    checkpointEl.classList.remove("visible");
    badChoice.classList.remove("active", "inactive");
    goodChoice.classList.remove("active", "inactive");
    prepareForkPaths();
    setPlaneAt(0);
  }

  function animateMainJourney(onComplete) {
    phase = "main";
    const duration = 8800;
    let startTime = null;

    function step(timestamp) {
      if (startTime === null) startTime = timestamp;
      const raw = Math.min((timestamp - startTime) / duration, 1);
      const progress = raw < 0.5
        ? 2 * raw * raw
        : 1 - Math.pow(-2 * raw + 2, 2) / 2;

      setPlaneAt(journeyLength * progress);

      if (raw < 1) {
        mainFrame = requestAnimationFrame(step);
      } else {
        setPlaneAt(journeyLength);
        onComplete();
      }
    }

    mainFrame = requestAnimationFrame(step);
  }

  function pauseAtCheckpoint(onComplete) {
    phase = "pause";
    checkpointEl.classList.add("visible");
    setTimeout(onComplete, 1300);
  }

  function animateFork(onComplete) {
    phase = "fork";
    prepareForkPaths();
    forkPaths.forEach((path) => path.classList.add("route-drawing"));

    const badLen = badRoute.getTotalLength();
    const goodLen = goodRoute.getTotalLength();
    const contLen = goodRouteContinue.getTotalLength();
    const badDuration = 2400;
    const goodDuration = 2400;
    const contDuration = 1800;
    const contStart = 1900;
    let startTime = null;

    function easeOut(t) {
      return 1 - Math.pow(1 - t, 2);
    }

    function step(timestamp) {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;

      const badT = easeOut(Math.min(elapsed / badDuration, 1));
      badRoute.style.strokeDashoffset = `${badLen * (1 - badT)}`;
      if (badT >= 1) badRoute.classList.add("route-terminated");

      const goodT = easeOut(Math.min(elapsed / goodDuration, 1));
      goodRoute.style.strokeDashoffset = `${goodLen * (1 - goodT)}`;

      const contElapsed = Math.max(0, elapsed - contStart);
      const contT = easeOut(Math.min(contElapsed / contDuration, 1));
      goodRouteContinue.style.strokeDashoffset = `${contLen * (1 - contT)}`;

      const finished = badT >= 1 && goodT >= 1 && contT >= 1;
      if (!finished) {
        forkFrame = requestAnimationFrame(step);
        return;
      }

      goodRouteContinue.classList.add("route-continued");
      badChoice.classList.add("inactive");
      goodChoice.classList.add("active");
      phase = "done";
      onComplete();
    }

    forkFrame = requestAnimationFrame(step);
  }

  function runSequence() {
    if (mainFrame) cancelAnimationFrame(mainFrame);
    if (forkFrame) cancelAnimationFrame(forkFrame);
    resetVisualState();

    animateMainJourney(() => {
      pauseAtCheckpoint(() => {
        animateFork(() => {});
      });
    });
  }

  function highlightChoice(side) {
    if (phase !== "done" && phase !== "fork") return;
    badChoice.classList.toggle("active", side === "bad");
    badChoice.classList.toggle("inactive", side === "good");
    goodChoice.classList.toggle("active", side === "good");
    goodChoice.classList.toggle("inactive", side === "bad");
    badRoute.classList.toggle("route-emphasis", side === "bad");
    goodRoute.classList.toggle("route-emphasis", side === "good");
    goodRouteContinue.classList.toggle("route-emphasis", side === "good");
  }

  badChoice.addEventListener("click", () => highlightChoice("bad"));
  goodChoice.addEventListener("click", () => highlightChoice("good"));
  resetButton.addEventListener("click", runSequence);

  prepareForkPaths();
  runSequence();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(initCheckpoint, document.documentElement.classList.contains("book-embed") ? 80 : 0);
  });
} else {
  setTimeout(initCheckpoint, document.documentElement.classList.contains("book-embed") ? 80 : 0);
}
