(function () {
  const chapters = window.PACIFIC_BOOK || [];
  let currentIndex = 0;
  let isTransitioning = false;

  const stage = document.getElementById("book-stage");
  const iframe = document.getElementById("book-iframe");
  const cover = document.getElementById("book-cover");
  const splash = document.getElementById("chapter-splash");
  const splashEyebrow = document.getElementById("splash-eyebrow");
  const splashTitle = document.getElementById("splash-title");
  const splashSubtitle = document.getElementById("splash-subtitle");
  const peel = document.getElementById("page-peel");
  const cornerNext = document.getElementById("corner-next");
  const cornerPrev = document.getElementById("corner-prev");
  const progress = document.getElementById("book-progress");

  function buildProgress() {
    progress.innerHTML = chapters
      .map((chapter, i) => {
        const label = chapter.navLabel || chapter.title || chapter.eyebrow || `Chapter ${i + 1}`;
        return (
          `<button type="button" class="progress-dot${i === currentIndex ? " active" : ""}"`
          + ` data-index="${i}" aria-label="Go to: ${label}"`
          + ` aria-current="${i === currentIndex ? "true" : "false"}"></button>`
        );
      })
      .join("");
  }

  function updateControls() {
    cornerPrev.hidden = currentIndex === 0;
    cornerNext.hidden = currentIndex >= chapters.length - 1;
    buildProgress();
  }

  function renderCover(chapter) {
    iframe.classList.remove("is-active");
    iframe.removeAttribute("src");
    cover.hidden = false;
    cover.innerHTML = `
      <div class="cover-inner">
        <div class="cover-eyebrow">${chapter.eyebrow}</div>
        <h1 class="cover-title">${chapter.title}</h1>
        <p class="cover-subtitle">${chapter.subtitle}</p>
        <p class="cover-hint">Click the folded corner to begin →</p>
      </div>
      ${chapter.credit ? `<p class="cover-credit">${chapter.credit}</p>` : ""}
    `;
  }

  function loadIframe(chapter) {
    return new Promise((resolve, reject) => {
      cover.hidden = true;
      iframe.classList.add("is-active");

      const onLoad = () => {
        iframe.removeEventListener("load", onLoad);
        iframe.removeEventListener("error", onError);
        // Give layout a frame so maps measure correct width
        requestAnimationFrame(() => {
          try {
            iframe.contentWindow.dispatchEvent(new Event("resize"));
          } catch (e) {
            /* ignore cross-origin */
          }
          resolve();
        });
      };

      const onError = () => {
        iframe.removeEventListener("load", onLoad);
        iframe.removeEventListener("error", onError);
        reject(new Error(`Failed to load ${chapter.file}`));
      };

      iframe.addEventListener("load", onLoad);
      iframe.addEventListener("error", onError);
      iframe.src = `${chapter.file}?embed=1&_=${Date.now()}`;
    });
  }

  const DEFAULT_SPLASH_MS = 3000;

  function showSplash(chapter) {
    const duration = chapter.splashMs ?? DEFAULT_SPLASH_MS;
    return new Promise((resolve) => {
      splashEyebrow.textContent = chapter.eyebrow || "";
      splashTitle.textContent = chapter.title || "";
      splashSubtitle.textContent = chapter.subtitle || "";
      splash.dataset.chapter = chapter.slug || "";
      splash.classList.toggle("theme-journal", chapter.theme === "journal");
      splash.classList.add("visible");
      splash.setAttribute("aria-hidden", "false");

      setTimeout(() => {
        splash.classList.remove("visible");
        splash.setAttribute("aria-hidden", "true");
        resolve();
      }, duration);
    });
  }

  function playPeel() {
    return new Promise((resolve) => {
      peel.classList.add("active");
      stage.classList.add("turning-out");
      setTimeout(() => {
        peel.classList.remove("active");
        stage.classList.remove("turning-out");
        resolve();
      }, 850);
    });
  }

  async function showChapter(index) {
    const chapter = chapters[index];

    if (chapter.type === "splash") {
      renderCover(chapter);
      return;
    }

    try {
      await loadIframe(chapter);
    } catch (err) {
      console.error(err);
      cover.hidden = false;
      cover.innerHTML = `
        <div class="cover-inner">
          <p class="cover-subtitle">Could not load chapter. Try running:<br>
          <code>python3 app.py</code><br>then open http://localhost:8000</p>
        </div>`;
    }
  }

  async function goToPage(index) {
    if (isTransitioning || index < 0 || index >= chapters.length || index === currentIndex) return;
    isTransitioning = true;

    const chapter = chapters[index];

    await playPeel();

    // Load chapter content WHILE splash plays (so maps are ready when splash fades)
    const loadTask =
      chapter.type === "iframe"
        ? loadIframe(chapter)
        : Promise.resolve();

    await showSplash(chapter);
    await loadTask;

    currentIndex = index;

    if (chapter.type === "splash") {
      renderCover(chapter);
    }

    updateControls();
    isTransitioning = false;
  }

  async function nextPage() {
    await goToPage(currentIndex + 1);
  }

  async function prevPage() {
    await goToPage(currentIndex - 1);
  }

  cornerNext.addEventListener("click", nextPage);
  cornerPrev.addEventListener("click", prevPage);

  progress.addEventListener("click", (event) => {
    const dot = event.target.closest(".progress-dot");
    if (!dot) return;
    const index = Number(dot.dataset.index);
    if (!Number.isNaN(index)) goToPage(index);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === " ") {
      e.preventDefault();
      nextPage();
    } else if (e.key === "ArrowLeft") {
      prevPage();
    }
  });

  updateControls();
  renderCover(chapters[0]);
})();
