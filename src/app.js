import { FloatingTextEngine } from "./gameEngine.js";
import kindergartenCourse from "./data/kindergarten_course.json";
import firstGradeCourse from "./data/first_grade_course.json";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

window.speechSynthesisUtterances = [];

function speak(text) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window))
    return;

  // Remove cancel entirely as it aggressively breaks iOS 15+ Safari
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  u.rate = 0.525;
  u.pitch = 1;
  u.volume = 1;

  // Explicitly assign a Chinese voice if the OS has one loaded
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    const zhVoice = voices.find(v => v.lang === "zh-CN" || v.lang === "zh-HK" || v.lang === "zh-TW" || v.lang.toLowerCase().includes("zh"));
    if (zhVoice) {
      u.voice = zhVoice;
    } else {
      // If the system has TTS voices but absolutely NONE are Chinese (e.g., Linux espeak English),
      // we must abort. An English/Fallback voice will wildly mispronounce UTF-8 characters as "Type these letters" or garbage.
      return;
    }
  }

  // Prevent iOS Safari aggressive garbage collection
  window.speechSynthesisUtterances.push(u);
  if (window.speechSynthesisUtterances.length > 5) {
    window.speechSynthesisUtterances.shift();
  }

  window.speechSynthesis.speak(u);
  window.speechSynthesis.resume();
}

function createFlowerSvg() {
  return `
  <svg viewBox="0 0 64 64" width="34" height="34" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pet" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ff6fae"/>
        <stop offset="1" stop-color="#ff9fca"/>
      </linearGradient>
    </defs>
    <circle cx="32" cy="34" r="10" fill="#ffd166" stroke="#7a4b00" stroke-width="1"/>
    <g fill="url(#pet)" stroke="#7a4b00" stroke-width="1">
      <ellipse cx="32" cy="12" rx="9" ry="14"/>
      <ellipse cx="48" cy="20" rx="9" ry="14"/>
      <ellipse cx="52" cy="36" rx="9" ry="14"/>
      <ellipse cx="40" cy="52" rx="9" ry="14"/>
      <ellipse cx="24" cy="52" rx="9" ry="14"/>
      <ellipse cx="12" cy="36" rx="9" ry="14"/>
      <ellipse cx="16" cy="20" rx="9" ry="14"/>
    </g>
    <path d="M30 36 C 29 42, 29 46, 30 52" stroke="#2f9e3a" stroke-width="2" fill="none"/>
    <path d="M34 36 C 35 42, 35 46, 34 52" stroke="#2f9e3a" stroke-width="2" fill="none"/>
  </svg>`;
}

function createDiamondSvg() {
  return `
  <svg viewBox="0 0 64 64" width="34" height="34" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="dia" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#a855f7"/>
        <stop offset="1" stop-color="#22d3ee"/>
      </linearGradient>
    </defs>
    <rect x="14" y="14" width="36" height="36" fill="url(#dia)" transform="rotate(45 32 32)" stroke="#0b2148" stroke-width="2"/>
    <path d="M32 16 L44 32 L32 48 L20 32 Z" fill="rgba(255,255,255,0.18)"/>
    <path d="M20 32 L32 48 L44 32" stroke="rgba(255,255,255,0.55)" stroke-width="2" fill="none"/>
  </svg>`;
}

function createIcon(kind) {
  if (kind === "flower") return createFlowerSvg();
  return createDiamondSvg();
}

function getCourseUnit(course, unitId) {
  return course.units.find((u) => u.id === unitId) || null;
}

function getCourseLesson(course, unitId, lessonId) {
  const unit = getCourseUnit(course, unitId);
  if (!unit) return null;
  return unit.lessons.find((l) => l.id === lessonId) || null;
}

function tokenizeSpeech(tokens) {
  // Use Chinese comma and space to force a significant pause (approx 1 second at reduced rate) between words.
  // We avoid '。。。' because some Linux/fallback screen readers literally read it as "Type these letters".
  return tokens.join("， ");
}

export function initApp() {
  const root = document.getElementById("root");
  root.innerHTML = "";

  let speechUnlocked = false;
  function unlockSpeech() {
    if (speechUnlocked) return;
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(" ");
      window.speechSynthesis.speak(u);
      window.speechSynthesis.resume();
      speechUnlocked = true;
    }
    document.removeEventListener("touchstart", unlockSpeech);
    document.removeEventListener("click", unlockSpeech);
  }
  document.addEventListener("touchstart", unlockSpeech, { once: true });
  document.addEventListener("click", unlockSpeech, { once: true });

  const scene = document.createElement("div");
  scene.className = "scene";
  const clouds = document.createElement("div");
  clouds.className = "clouds";
  const grass = document.createElement("div");
  grass.className = "grass";
  scene.appendChild(clouds);
  scene.appendChild(grass);

  const app = document.createElement("div");
  app.className = "app";

  const left = document.createElement("div");
  left.className = "panel left";
  const center = document.createElement("div");
  center.className = "panel center";
  const right = document.createElement("div");
  right.className = "panel right";

  const kindergartenBtn = document.createElement("button");
  kindergartenBtn.className = "btn btn-accent";
  kindergartenBtn.textContent = "Kindergarten 学前班";

  const firstGradeBtn = document.createElement("button");
  firstGradeBtn.className = "btn btn-green";
  firstGradeBtn.textContent = "1st Grade 一年级";

  const aboutBtn = document.createElement("button");
  aboutBtn.className = "btn";
  aboutBtn.textContent = "关于游戏 About";

  const donationLink = document.createElement("a");
  donationLink.className = "btn";
  donationLink.textContent = "Donation";
  donationLink.href =
    "https://www.paypal.com/donate/?hosted_button_id=SS3LVP7AGTN9N";
  donationLink.target = "_blank";

  const gameButtons = document.createElement("div");
  gameButtons.className = "game-buttons";
  gameButtons.appendChild(kindergartenBtn);
  gameButtons.appendChild(firstGradeBtn);

  left.appendChild(gameButtons);

  const stageTop = document.createElement("div");
  stageTop.className = "selector-panel";
  const stageTitle = document.createElement("div");
  stageTitle.className = "stage-title";
  stageTitle.textContent = "Choose Unit, Lesson, and Section";
  stageTop.appendChild(stageTitle);

  const dropdownRow = document.createElement("div");
  dropdownRow.className = "dropdown-row";

  const unitSelect = document.createElement("select");
  unitSelect.innerHTML =
    '<option value="">Select Unit (学前班/一年级)</option>';

  const lessonSelect = document.createElement("select");
  lessonSelect.innerHTML =
    '<option value="">Select Lesson</option>';

  const optionSelect = document.createElement("select");
  optionSelect.innerHTML =
    '<option value="">Select Lesson Section</option>';

  dropdownRow.appendChild(unitSelect);
  dropdownRow.appendChild(lessonSelect);
  dropdownRow.appendChild(optionSelect);

  stageTop.appendChild(dropdownRow);

  const helper = document.createElement("div");
  helper.className = "subtle";
  helper.textContent =
    "Touch or click the correct word(s) when you hear the hint.";
  stageTop.appendChild(helper);

  left.appendChild(stageTop);
  left.appendChild(aboutBtn);
  left.appendChild(donationLink);

  const canvasWrap = document.createElement("div");
  canvasWrap.className = "canvas-wrap";
  const messageEl = document.createElement("div");
  messageEl.className = "message";
  messageEl.innerHTML = "<div></div>";
  canvasWrap.appendChild(messageEl);

  let pendingStartAction = null;
  const startGameBtn = document.createElement("button");
  startGameBtn.className = "btn btn-accent start-game-btn";
  startGameBtn.textContent = "Start Game 开始";
  startGameBtn.style.position = "absolute";
  startGameBtn.style.left = "50%";
  startGameBtn.style.top = "50%";
  startGameBtn.style.transform = "translate(-50%, -50%)";
  startGameBtn.style.zIndex = "40";
  startGameBtn.style.padding = "18px 36px";
  startGameBtn.style.fontSize = "22px";
  startGameBtn.style.display = "none";
  startGameBtn.style.boxShadow = "var(--shadow)";
  canvasWrap.appendChild(startGameBtn);

  startGameBtn.addEventListener("click", () => {
    startGameBtn.style.display = "none";
    if ("speechSynthesis" in window) {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(" "));
      window.speechSynthesis.resume();
    }
    if (pendingStartAction) {
      const action = pendingStartAction;
      pendingStartAction = null;
      action();
    }
  });

  function showStartButton(action) {
    hideMessage();
    pendingStartAction = action;
    startGameBtn.style.display = "block";
  }

  const canvas = document.createElement("canvas");
  canvasWrap.appendChild(canvas);
  center.appendChild(canvasWrap);

  const modalBackdrop = document.createElement("div");
  modalBackdrop.className = "modal-backdrop";
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <h2>关于游戏 About</h2>
    <div class="subtle">
      When you hear a word prounced, click the one you think is the right word.
      <br />
      When you hear a sentence, click the words in the right order to build the sentence.
    </div>
    <button class="close">Close</button>
  `;
  modalBackdrop.appendChild(modal);
  canvasWrap.appendChild(modalBackdrop);

  const awardStat = document.createElement("div");
  awardStat.className = "stat";
  const awardTitle = document.createElement("h3");
  awardTitle.textContent = "Award";
  const awardValue = document.createElement("div");
  awardValue.className = "value";
  awardValue.textContent = " ";
  const awardIcons = document.createElement("div");
  awardIcons.className = "award-icons";
  awardStat.appendChild(awardTitle);
  awardStat.appendChild(awardValue);
  awardStat.appendChild(awardIcons);

  const lessonStat = document.createElement("div");
  lessonStat.className = "stat";
  const lessonTitle = document.createElement("h3");
  lessonTitle.textContent = "Lesson";
  const lessonValue = document.createElement("div");
  lessonValue.className = "value";
  lessonValue.textContent = "-";
  lessonStat.appendChild(lessonTitle);
  lessonStat.appendChild(lessonValue);

  const scoreStat = document.createElement("div");
  scoreStat.className = "stat";
  const scoreTitle = document.createElement("h3");
  scoreTitle.textContent = "Score";
  const scoreValue = document.createElement("div");
  scoreValue.className = "value";
  scoreValue.textContent = "0";
  scoreStat.appendChild(scoreTitle);
  scoreStat.appendChild(scoreValue);

  const backHint = document.createElement("div");
  backHint.className = "subtle";
  backHint.textContent = "Tap the left buttons to switch courses.";

  right.appendChild(awardStat);
  right.appendChild(lessonStat);
  right.appendChild(scoreStat);
  right.appendChild(backHint);

  app.appendChild(left);
  app.appendChild(center);
  app.appendChild(right);
  root.appendChild(scene);
  root.appendChild(app);

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");

  const fontFamily = 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif';

  const engine = new FloatingTextEngine(canvas, (entity) => {
    if (!gameState.active) return;
    gameState.onEntityClick(entity);
  });

  let resizeQueued = false;
  let lastResize = { w: 0, h: 0 };

  const resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    const cr = entry.contentRect;
    const w = Math.floor(cr.width);
    const h = Math.floor(cr.height);
    if (w <= 0 || h <= 0) return;
    if (w === lastResize.w && h === lastResize.h) return;
    lastResize = { w, h };

    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      try {
        engine.resize(lastResize.w, lastResize.h);
      } catch {
        // Avoid crashing the game if ResizeObserver loops.
      }
    });
  });
  resizeObserver.observe(canvasWrap);

  let gameState = {
    active: false,
    mode: null,
    onEntityClick: null,
  };

  let score = 0;
  let awards = { flowers: 0, diamonds: 0 };

  let pendingAwardIconKind = null;

  function renderAwardIcons(pendingKind = null) {
    awardIcons.innerHTML = "";
    pendingAwardIconKind = pendingKind;
    const icons = [];
    for (let i = 0; i < awards.diamonds; i++) icons.push("diamond");
    for (let i = 0; i < awards.flowers; i++) icons.push("flower");

    for (let idx = 0; idx < icons.length; idx++) {
      const kind = icons[idx];
      const el = document.createElement("div");
      el.className = "icon";
      if (pendingKind && idx === icons.length - 1) {
        el.classList.add("pending-reward");
      }
      el.innerHTML = createIcon(kind);
      awardIcons.appendChild(el);
    }

    awardValue.textContent = `${awards.diamonds} diamond(s)`;
  }

  function showMessage(text, small) {
    const inner = messageEl.querySelector("div");
    inner.textContent = text;
    if (small) {
      if (messageEl.querySelector(".small")) {
        messageEl.querySelector(".small").textContent = small;
      } else {
        const s = document.createElement("span");
        s.className = "small";
        s.textContent = small;
        inner.appendChild(document.createElement("br"));
        inner.appendChild(s);
      }
    }
    messageEl.classList.add("show");
  }

  function hideMessage() {
    messageEl.classList.remove("show");
    const inner = messageEl.querySelector("div");
    inner.innerHTML = "";
  }

  function animationDelay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function centerOfViewport() {
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  function getIconRect(kindForTarget = null) {
    const children = Array.from(awardIcons.children);
    if (!children.length) {
      return awardIcons.getBoundingClientRect();
    }
    // Target the last icon (the one that just got added).
    const last = children[children.length - 1];
    return last.getBoundingClientRect();
  }

  function flyRewardToAward(svgHtml) {
    const fly = document.createElement("div");
    fly.className = "reward-fly";
    fly.innerHTML = svgHtml;
    document.body.appendChild(fly);

    const { x: cx, y: cy } = centerOfViewport();
    const r = getIconRect();
    const dx = (r.left + r.width / 2) - cx;
    const dy = (r.top + r.height / 2) - cy;

    // Kick the transition.
    fly.style.transform = "translate(-50%, -50%) scale(1)";
    // Force layout so the next transform change triggers the transition.
    // eslint-disable-next-line no-unused-expressions
    fly.offsetHeight;
    fly.classList.add("moving");
    fly.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(0.2)`;

    return new Promise((resolve) => {
      fly.addEventListener(
        "transitionend",
        () => {
          fly.remove();
          resolve();
        },
        { once: true },
      );
    });
  }

  async function addFlowerAward({ speechText = null } = {}) {
    const willDiamond = awards.flowers === 4;
    if (willDiamond) {
      awards.flowers = 0;
      awards.diamonds += 1;
    } else {
      awards.flowers += 1;
    }

    renderAwardIcons("flower");

    const svgHtml = willDiamond ? createDiamondSvg() : createFlowerSvg();
    await flyRewardToAward(svgHtml);

    // Reveal the pending icon.
    const pending = awardIcons.querySelector(".pending-reward");
    if (pending) pending.classList.remove("pending-reward");

    if (willDiamond) {
      showMessage("You just earned a diamond!");
      if (speechText) speak(speechText);
      await animationDelay(900);
      hideMessage();
    }
  }

  function resetAll() {
    if (typeof startGameBtn !== "undefined") {
      startGameBtn.style.display = "none";
      pendingStartAction = null;
    }
    score = 0;
    awards = { flowers: 0, diamonds: 0 };
    scoreValue.textContent = "0";
    lessonValue.textContent = "-";
    renderAwardIcons();
    hideMessage();
    engine.setEntities([]);
    engine.stop();
    gameState.active = false;
    gameState.mode = null;
    gameState.onEntityClick = null;

    unitSelect.disabled = false;
    lessonSelect.disabled = false;
    optionSelect.disabled = true;
    optionSelect.style.display = "";
  }

  function setDropdownsEnabled(enabled) {
    unitSelect.disabled = !enabled;
    lessonSelect.disabled = !enabled;
    optionSelect.disabled = !enabled;
  }

  function getFontSizeFromHeight(h) {
    const isMobilePortrait = window.matchMedia("(max-width: 900px) and (orientation: portrait)").matches;
    const factor = isMobilePortrait ? 0.55 : 0.75;
    return clamp(Math.round((h / 10) * factor), 15, 45);
  }

  function measureEntity(text, fontSize) {
    measureCtx.font = `${fontSize}px ${fontFamily}`;
    const metrics = measureCtx.measureText(text);
    const w = Math.ceil(metrics.width);
    const h = Math.ceil(fontSize * 1.05);
    return { w, h };
  }

  function placeTokens(tokens, fontSize, avoidOverlap = true) {
    const entities = [];
    const maxTries = 2200;
    const padding = 6;
    // Speed reduced to 50% of original rate per user request
    const speed = clamp(fontSize * 0.3, 7.5, 22.5);
    const color = "#0b2148";

    const cw = engine.w || canvasWrap.clientWidth;
    const ch = engine.h || canvasWrap.clientHeight;

    const rects = [];

    let id = 1;
    for (const text of tokens) {
      const { w, h } = measureEntity(text, fontSize);
      let x = 0;
      let y = 0;

      const tryPlace = () => {
        const rx = padding;
        const ry = padding;
        x = rx + Math.random() * Math.max(1, cw - w - rx * 2);
        y = ry + Math.random() * Math.max(1, ch - h - ry * 2);
      };

      let tries = 0;
      while (tries < maxTries) {
        tries++;
        tryPlace();
        if (!avoidOverlap) break;
        let ok = true;
        for (const r of rects) {
          const overlap =
            !(x + w < r.x || x > r.x + r.w || y + h < r.y || y > r.y + r.h);
          if (overlap) {
            ok = false;
            break;
          }
        }
        if (ok) break;
      }

      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * speed * (0.7 + Math.random() * 0.6);
      const vy = Math.sin(angle) * speed * (0.7 + Math.random() * 0.6);

      rects.push({ x, y, w, h });
      entities.push({
        id: id++,
        text,
        x,
        y,
        w,
        h,
        vx,
        vy,
        fontSize,
        fontFamily,
        color,
      });
    }

    return entities;
  }

  async function startKindergartenWords(unitId, lessonId) {
    hideMessage();
    engine.stop();
    setDropdownsEnabled(false);

    const lesson = getCourseLesson(kindergartenCourse, unitId, lessonId);
    const wordLines = lesson?.words ?? [];
    if (!wordLines.length) {
      showMessage("No words content found for this lesson.");
      return;
    }

    gameState.active = true;
    gameState.mode = "words";

    const remaining = wordLines.map((_, idx) => idx);
    let currentTokens = null;
    let entities = [];

    // Words queue: each token gets pronounced in a random order.
    let hintQueue = [];
    let currentTargetId = null;
    let hintAttempts = 0;

    async function nextWordsLine() {
      if (!remaining.length) {
        engine.setEntities([]);
        engine.stop();
        gameState.active = false;
        setDropdownsEnabled(true);
        showMessage("Great job! You earn a flower!");
        await addFlowerAward();
        await animationDelay(5000);
        hideMessage();
        return;
      }

      const idx = remaining.splice(
        Math.floor(Math.random() * remaining.length),
        1,
      )[0];
      currentTokens = wordLines[idx];
      const fontSize = getFontSizeFromHeight(engine.h || 600);

      const shuffled = [...currentTokens];
      // Shuffle token positions but keep each token clickable.
      entities = placeTokens(shuffled, fontSize, true);
      hintQueue = shuffleInPlace(entities.map((e) => e.id));
      currentTargetId = hintQueue.shift();
      hintAttempts = 0;

      engine.setEntities(entities);
      engine.start();

      const target = entities.find((e) => e.id === currentTargetId);
      if (target) {
        speak(target.text);
      }
    }

    gameState.onEntityClick = (entity) => {
      if (gameState.mode !== "words") return;
      if (!currentTargetId) return;

      if (entity.id === currentTargetId) {
        // Correct word.
        entities = entities.filter((e) => e.id !== entity.id);
        engine.setEntities(entities);
        score += 100;
        scoreValue.textContent = String(score);

        if (!hintQueue.length) {
          // All words in the line are done.
          nextWordsLine();
          return;
        }

        currentTargetId = hintQueue.shift();
        hintAttempts = 0;
        const target = entities.find((e) => e.id === currentTargetId);
        if (target) speak(target.text);
        return;
      }

      // Wrong click.
      hintAttempts += 1;
      if (hintAttempts === 1) {
        const target = entities.find((e) => e.id === currentTargetId);
        if (target) speak(target.text);
      } else {
        showMessage("Sorry, please try the next word");
        animationDelay(650).then(() => hideMessage());
        hintAttempts = 0;

        // Put current target back for later matching, then try the next.
        if (entities.some((e) => e.id === currentTargetId)) {
          hintQueue.push(currentTargetId);
        }
        currentTargetId = hintQueue.shift() || null;
        const target = entities.find((e) => e.id === currentTargetId);
        if (target) speak(target.text);
      }
    };

    nextWordsLine();
  }

  async function startKindergartenRhythm(unitId, lessonId) {
    hideMessage();
    engine.stop();
    setDropdownsEnabled(false);

    const lesson = getCourseLesson(kindergartenCourse, unitId, lessonId);
    const rhythmLines = lesson?.rhythm ?? [];
    if (!rhythmLines.length) {
      showMessage("No rhythm content found for this lesson.");
      return;
    }

    gameState.active = true;
    gameState.mode = "sentence";

    const remaining = rhythmLines.map((_, idx) => idx);
    let expectedTokens = [];
    let entities = [];
    let pointer = 0;
    let running = true;

    async function buildNextLine() {
      if (!remaining.length) {
        engine.setEntities([]);
        engine.stop();
        gameState.active = false;
        setDropdownsEnabled(true);
        showMessage("You finished this lesson. Welcome back later!");
        await animationDelay(5000);
        hideMessage();
        return;
      }

      const idx = remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0];
      expectedTokens = rhythmLines[idx];
      pointer = 0;

      const fontSize = getFontSizeFromHeight(engine.h || 600);
      const shuffled = shuffleInPlace([...expectedTokens]);
      entities = placeTokens(shuffled, fontSize, true);
      engine.setEntities(entities);
      engine.start();

      speak(tokenizeSpeech(expectedTokens));
    }

    gameState.onEntityClick = (entity) => {
      if (!running) return;
      if (gameState.mode !== "sentence") return;
      if (pointer >= expectedTokens.length) return;

      if (entity.text === expectedTokens[pointer]) {
        entities = entities.filter((e) => e.id !== entity.id);
        engine.setEntities(entities);
        pointer += 1;

        if (pointer === expectedTokens.length) {
          running = false;
          engine.setEntities([]);
          engine.stop();
          score += 1000;
          scoreValue.textContent = String(score);

          showMessage(
            "Great job! You just earned 1,000 points and a flower!",
          );

          Promise.resolve(addFlowerAward()).then(async () => {
            await animationDelay(850);
            hideMessage();
            running = true;
            buildNextLine();
          });
        }
      } else {
        // Wrong click doesn't advance the sequence.
      }
    };

    buildNextLine();
  }

  async function startFirstGradeLesson(unitId, lessonId, optionKey) {
    hideMessage();
    engine.stop();
    setDropdownsEnabled(false);

    const lesson = getCourseLesson(firstGradeCourse, unitId, lessonId);
    const lines = lesson?.[optionKey] ?? [];
    if (!lines.length) {
      showMessage("No content found for this option.");
      return;
    }

    gameState.active = true;
    gameState.mode = "sentence";

    const remaining = lines.map((_, idx) => idx);
    let expectedTokens = [];
    let entities = [];
    let pointer = 0;

    async function buildNextLine() {
      if (!remaining.length) {
        engine.setEntities([]);
        engine.stop();
        gameState.active = false;
        setDropdownsEnabled(true);
        showMessage("You finished this lesson. Welcome back later!");
        await animationDelay(5000);
        hideMessage();
        return;
      }

      const idx = remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0];
      expectedTokens = lines[idx];
      pointer = 0;

      const fontSize = getFontSizeFromHeight(engine.h || 600);
      const shuffled = shuffleInPlace([...expectedTokens]);
      entities = placeTokens(shuffled, fontSize, true);
      engine.setEntities(entities);
      engine.start();

      speak(tokenizeSpeech(expectedTokens));
    }

    gameState.onEntityClick = (entity) => {
      if (gameState.mode !== "sentence") return;
      if (pointer >= expectedTokens.length) return;

      if (entity.text === expectedTokens[pointer]) {
        entities = entities.filter((e) => e.id !== entity.id);
        engine.setEntities(entities);
        pointer += 1;

        if (pointer === expectedTokens.length) {
          engine.setEntities([]);
          engine.stop();
          score += 1000;
          scoreValue.textContent = String(score);
          showMessage(
            "Great job! You just earned 1,000 points and a flower!",
          );
          Promise.resolve(addFlowerAward()).then(async () => {
            await animationDelay(850);
            hideMessage();
            buildNextLine();
          });
        }
      } else {
        // Wrong click doesn't advance the sequence.
      }
    };

    buildNextLine();
  }

  function setLessonField(lessonId) {
    lessonValue.textContent = `Lesson ${lessonId}`;
  }

  function startMenuForKindergarten() {
    resetAll();

    stageTitle.textContent = "Kindergarten 学前班: Units → Lessons → Words/Rhythm";

    unitSelect.value = "";
    lessonSelect.value = "";
    optionSelect.value = "";

    optionSelect.style.display = "";
    optionSelect.disabled = true;
    optionSelect.innerHTML = '<option value="">Select Lesson Section</option>';

    // Populate units
    const unitIds = Array.from(new Set(kindergartenCourse.units.map((u) => u.id)))
      .sort((a, b) => a - b)
      .filter(Boolean);
    unitSelect.innerHTML =
      '<option value="">Select Unit</option>' +
      unitIds
        .map((id) => `<option value="${id}">Unit ${id}</option>`)
        .join("");
  }

  function startMenuForFirstGrade() {
    resetAll();

    stageTitle.textContent =
      "1st Grade 一年级: Units → Lessons → Text/Reading/Rhythm/Laughs";

    unitSelect.value = "";
    lessonSelect.value = "";
    optionSelect.value = "";

    optionSelect.style.display = "";
    optionSelect.disabled = true;
    optionSelect.innerHTML = '<option value="">Select Lesson Section</option>';

    const unitIds = Array.from(new Set(firstGradeCourse.units.map((u) => u.id)))
      .sort((a, b) => a - b)
      .filter(Boolean);
    unitSelect.innerHTML =
      '<option value="">Select Unit</option>' +
      unitIds
        .map((id) => `<option value="${id}">Unit ${id}</option>`)
        .join("");
  }

  function getKindergartenLessonIds(unitId) {
    const unit = getCourseUnit(kindergartenCourse, unitId);
    if (!unit) return [];
    return unit.lessons.map((l) => l.id).sort((a, b) => a - b);
  }

  function getFirstGradeLessonIds(unitId) {
    const unit = getCourseUnit(firstGradeCourse, unitId);
    if (!unit) return [];
    return unit.lessons.map((l) => l.id).sort((a, b) => a - b);
  }

  function buildKindergartenOptionSelect(unitId) {
    if (Number(unitId) === 4) {
      optionSelect.style.display = "none";
      optionSelect.disabled = true;
      return [];
    }
    optionSelect.style.display = "";
    optionSelect.disabled = false;
    optionSelect.innerHTML =
      '<option value="">Select Lesson Section</option>' +
      '<option value="words">Words 语汇</option>' +
      '<option value="rhythm">Rhythm 儿歌</option>';
    return ["words", "rhythm"];
  }

  function buildFirstGradeOptionSelect(unitId, lessonId) {
    optionSelect.style.display = "";
    optionSelect.disabled = false;

    const u = Number(unitId);
    const l = Number(lessonId);
    /** @type {Array<string>} */
    let keys = [];

    if (u === 1) keys = ["text", "reading"];
    else if (u === 2) {
      keys = l === 5 ? ["text", "reading1", "reading2"] : ["text", "reading"];
    } else if (u === 3) {
      if (l === 6) keys = ["text"];
      else if (l === 1 || l === 2) keys = ["text", "reading1", "reading2"];
      else if (l === 3)
        keys = [
          "text",
          "reading1",
          "reading2",
          "reading3",
          "reading4",
          "reading5",
          "reading6",
        ];
      else if (l === 4 || l === 5)
        keys = ["text", "reading1", "reading2", "reading3", "reading4"];
    } else if (u === 4) {
      keys = ["rhythm", "laugh"];
    }

    optionSelect.innerHTML =
      '<option value="">Select Lesson Section</option>' +
      keys
        .map((k) => {
          if (k === "text") return '<option value="text">Text 课文</option>';
          if (k === "reading")
            return '<option value="reading">Reading 阅读</option>';
          if (k.startsWith("reading"))
            return `<option value="${k}">${k.replace("reading", "Reading 阅读 ")}</option>`;
          if (k === "rhythm") return '<option value="rhythm">Rhythm 儿歌</option>';
          if (k === "laugh") return '<option value="laugh">Laughs 笑话</option>';
          return "";
        })
        .join("");

    return keys;
  }

  kindergartenBtn.addEventListener("click", () => {
    startMenuForKindergarten();
  });

  firstGradeBtn.addEventListener("click", () => {
    startMenuForFirstGrade();
  });

  aboutBtn.addEventListener("click", () => {
    modalBackdrop.classList.add("show");
  });
  modal.querySelector(".close").addEventListener("click", () => {
    modalBackdrop.classList.remove("show");
  });

  // Ensure "touch-friendly" selects.
  unitSelect.addEventListener("change", () => {
    const unitId = unitSelect.value;
    lessonSelect.value = "";
    optionSelect.value = "";
    hideMessage();
    if (typeof startGameBtn !== "undefined") {
      startGameBtn.style.display = "none";
      pendingStartAction = null;
    }

    const isKindergarten = stageTitle.textContent.includes("Kindergarten");
    if (isKindergarten) {
      const lessonIds = getKindergartenLessonIds(Number(unitId));
      lessonSelect.innerHTML =
        '<option value="">Select Lesson</option>' +
        lessonIds
          .map((id) => `<option value="${id}">Lesson ${id}</option>`)
          .join("");

      // Third dropdown appears only after lesson is selected.
      if (Number(unitId) === 4) {
        optionSelect.style.display = "none";
        optionSelect.disabled = true;
        optionSelect.innerHTML = '<option value="">Select Lesson Section</option>';
      } else {
        optionSelect.style.display = "";
        optionSelect.disabled = true;
        optionSelect.innerHTML = '<option value="">Select Lesson Section</option>';
      }
    } else {
      const lessonIds = getFirstGradeLessonIds(Number(unitId));
      lessonSelect.innerHTML =
        '<option value="">Select Lesson</option>' +
        lessonIds
          .map((id) => `<option value="${id}">Lesson ${id}</option>`)
          .join("");
      // Option dropdown depends on lesson selection.
      optionSelect.style.display = "";
      optionSelect.disabled = true;
      optionSelect.innerHTML = '<option value="">Select Lesson Section</option>';
    }
  });

  lessonSelect.addEventListener("change", () => {
    const unitId = unitSelect.value;
    const lessonId = lessonSelect.value;
    optionSelect.value = "";
    hideMessage();

    const isKindergarten = stageTitle.textContent.includes("Kindergarten");
    if (isKindergarten) {
      const options = buildKindergartenOptionSelect(unitId);
      // Unit 4 has only rhythms and no third dropdown.
      if (!options.length) {
        setLessonField(lessonId);
        showStartButton(() => startKindergartenRhythm(Number(unitId), Number(lessonId)));
      } else {
        // Enable third dropdown only now.
        optionSelect.disabled = false;
      }
    } else {
      buildFirstGradeOptionSelect(unitId, lessonId);
      optionSelect.disabled = false;
    }
  });

  optionSelect.addEventListener("change", () => {
    const unitId = unitSelect.value;
    const lessonId = lessonSelect.value;
    const key = optionSelect.value;
    if (!key) return;

    const isKindergarten = stageTitle.textContent.includes("Kindergarten");
    setLessonField(lessonId);

    if (isKindergarten) {
      if (key === "words") showStartButton(() => startKindergartenWords(Number(unitId), Number(lessonId)));
      else showStartButton(() => startKindergartenRhythm(Number(unitId), Number(lessonId)));
    } else {
      showStartButton(() => startFirstGradeLesson(Number(unitId), Number(lessonId), key));
    }
  });

  // Initialize UI.
  resetAll();
}

