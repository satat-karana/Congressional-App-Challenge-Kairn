/* AUTHORSHIP KEY: [STUDENT] existing project structure | [AI-FIX] reliability and animation fixes.
   Reminder scheduler, eye-rest animation, and check-in question behavior. */

(() => {
  "use strict";

  const QUESTIONS = [
    "What are you working on right now?",
    "Is this what you planned to be doing?",
    "What is one thing you want to finish next?",
    "How is your focus right now?"
  ];

  const COUNTDOWN_SECONDS = 20;
  const GLIDE_MS = 720;
  const ANSWER_TIMEOUT_MS = 60000;
  const DEFAULT_INTERVAL_MINUTES = 20;

  let video = null;
  let widget = null;
  let session = null;
  let busy = false;
  let questionIndex = 0;
  let previewing = false;
  let tickHandle = null;

  const $ = (id) => widget?.querySelector(`#${id}`) ?? null;
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const animationsOff = () =>
    document.documentElement.classList.contains("no-animations") ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  // The widget's ownerDocument changes when it is moved into Document Picture-in-Picture.
  const inPip = () => !!widget && widget.ownerDocument !== document;
  const currentWindow = () => widget?.ownerDocument?.defaultView || window;

  function prefNumber(key, fallback) {
    try {
      const value = Number(window.KairnPrefs?.get?.(key, fallback));
      return Number.isFinite(value) && value > 0 ? value : fallback;
    } catch (error) {
      console.warn(`Could not read preference "${key}"; using default.`, error);
      return fallback;
    }
  }

  function homeRect() {
    const el = document.getElementById("camera-widget");
    if (!el) return { top: 100, left: 20, width: Math.max(280, innerWidth - 40), height: 300 };

    const rect = el.getBoundingClientRect();
    // .floating is position:fixed, so use viewport coordinates: do not add scrollX/scrollY.
    return {
      top: rect.top,
      left: rect.left,
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height)
    };
  }

  function viewportRect() {
    const win = currentWindow();
    const doc = widget.ownerDocument;
    const root = doc.documentElement;
    return {
      top: 0,
      left: 0,
      width: Math.max(1, win.innerWidth || root.clientWidth),
      height: Math.max(1, win.innerHeight || root.clientHeight)
    };
  }

  function setRect(rect) {
    Object.assign(widget.style, {
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`
    });
  }

  function centeredRect(width, height) {
    const view = viewportRect();
    const w = Math.max(1, Math.min(width, view.width - 24));
    const h = Math.max(1, Math.min(height, view.height - 24));
    return {
      width: w,
      height: h,
      left: (view.width - w) / 2,
      top: (view.height - h) / 2
    };
  }

  async function glideTo(rect) {
    setRect(rect);
    await sleep(animationsOff() ? 0 : GLIDE_MS);
  }

  function startFloating() {
    const rect = widget.getBoundingClientRect();
    const start = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    };

    widget.classList.add("floating");
    setRect(start);
    // Force the browser to commit the starting geometry before the target geometry is set.
    void widget.offsetWidth;
    return start;
  }

  function restoreAfterAnimation(start, wasPip) {
    widget.classList.remove("takeover", "floating");
    ["top", "left", "width", "height"].forEach((property) => {
      widget.style.removeProperty(property);
    });

    // In PiP the widget remains inside the PiP document; it must not be moved to the homepage.
    if (wasPip) {
      widget.style.position = "fixed";
      widget.style.inset = "0";
      widget.style.width = "100%";
      widget.style.height = "100%";
      widget.style.borderRadius = "0";
    } else {
      widget.style.removeProperty("position");
      widget.style.removeProperty("inset");
      widget.style.removeProperty("border-radius");
    }
  }

  function showOnly(panelId) {
    for (const id of ["countdown-panel", "question-panel"]) {
      const panel = $(id);
      if (panel) panel.classList.toggle("hidden", id !== panelId);
    }
  }

  function cameraIsRunning() {
    return !!video?.srcObject;
  }

  function startSession() {
    const reminderMs = prefNumber("reminderMin", DEFAULT_INTERVAL_MINUTES) * 60000;
    const questionMs = prefNumber("questionMin", DEFAULT_INTERVAL_MINUTES) * 60000;
    const now = Date.now();

    // Both reminders use the configured interval. No hard-coded test delay remains.
    session = {
      reminderMs,
      questionMs,
      nextReminder: now + reminderMs,
      nextQuestion: now + questionMs
    };
  }

  function tick() {
    if (!cameraIsRunning()) {
      session = null;
      return;
    }
    if (!session) startSession();
    if (busy || !session) return;

    const now = Date.now();

    if (now >= session.nextReminder && session.nextReminder <= session.nextQuestion) {
      while (session.nextReminder <= now) session.nextReminder += session.reminderMs;
      runReminder().catch((error) => console.error("Reminder animation failed:", error));
    } else if (now >= session.nextQuestion) {
      while (session.nextQuestion <= now) session.nextQuestion += session.questionMs;
      runQuestion().catch((error) => console.error("Check-in animation failed:", error));
    }
  }

  async function preview(run) {
    if (busy) return;
    previewing = true;
    try {
      if (typeof window.showVideo === "function" && !cameraIsRunning()) window.showVideo();
      await run();
    } catch (error) {
      console.error("Preview failed:", error);
    } finally {
      previewing = false;
      if (!cameraIsRunning() && typeof window.showGreeting === "function") window.showGreeting();
    }
  }

  async function runReminder() {
    if (busy || (!cameraIsRunning() && !previewing)) return;
    busy = true;
    const wasPip = inPip();
    let start = null;

    try {
      start = startFloating();
      widget.classList.add("takeover");
      showOnly("countdown-panel");
      await glideTo(viewportRect());

      const number = $("countdown-number");
      for (let seconds = COUNTDOWN_SECONDS; seconds > 0; seconds--) {
        if (!cameraIsRunning() && !previewing) break;
        if (number) number.textContent = String(seconds);
        await sleep(1000);
      }
    } finally {
      showOnly(null);
      if (start) restoreAfterAnimation(start, wasPip);
      busy = false;
    }
  }

  function waitForAnswer() {
    return new Promise((resolve) => {
      const send = $("question-send");
      const skip = $("question-skip");
      const input = $("question-input");
      if (!send || !skip || !input) {
        resolve(false);
        return;
      }

      let finished = false;
      const finish = (answered) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        send.onclick = null;
        skip.onclick = null;
        input.onkeydown = null;
        resolve(answered);
      };

      const timer = window.setTimeout(() => finish(false), ANSWER_TIMEOUT_MS);
      send.onclick = () => finish(true);
      skip.onclick = () => finish(false);
      input.onkeydown = (event) => {
        if (event.key === "Enter") finish(true);
      };
    });
  }

  async function runQuestion() {
    if (busy || (!cameraIsRunning() && !previewing)) return;
    busy = true;
    const wasPip = inPip();
    let start = null;
    const input = $("question-input");
    const actions = $("question-actions");

    try {
      start = startFloating();
      showOnly("question-panel");
      const questionText = $("question-text");
      if (questionText) questionText.textContent = QUESTIONS[questionIndex++ % QUESTIONS.length];

      if (input) input.value = "";
      await glideTo(centeredRect(440, 280));
      input?.focus();

      if (await waitForAnswer()) {
        if (questionText) questionText.textContent = "Thanks. Back to it.";
        input?.classList.add("hidden");
        actions?.classList.add("hidden");
        await sleep(1200);
      }
    } finally {
      if (input) {
        input.value = "";
        input.classList.remove("hidden");
      }
      actions?.classList.remove("hidden");
      showOnly(null);

      // A question returns to the widget's original size/location, not full screen.
      if (start) {
        if (wasPip) {
          await glideTo(start);
          restoreAfterAnimation(start, true);
        } else {
          await glideTo(homeRect());
          restoreAfterAnimation(start, false);
        }
      }
      busy = false;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    video = document.getElementById("webcam");
    widget = document.getElementById("widget-video");

    if (!video || !widget) {
      console.error("Kairn reminders: #webcam or #widget-video was not found.");
      return;
    }

    if (tickHandle !== null) window.clearInterval(tickHandle);
    tickHandle = window.setInterval(tick, 500);

    window.kairnDemo = {
      reminder: () => preview(runReminder),
      question: () => preview(runQuestion)
    };
  });
})();
