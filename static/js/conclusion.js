(function () {
  function revealConclusion() {
    const part1 = document.getElementById("conclusion-part-1");
    const part2 = document.getElementById("conclusion-part-2");
    if (!part1 || !part2) return;

    const startDelay = document.documentElement.classList.contains("book-embed") ? 1100 : 200;

    setTimeout(() => {
      part1.classList.add("is-visible");
    }, startDelay);

    setTimeout(() => {
      part2.classList.add("is-visible");
    }, startDelay + 900);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", revealConclusion);
  } else {
    revealConclusion();
  }
})();
