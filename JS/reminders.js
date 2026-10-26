/* AUTHORSHIP KEY: [STUDENT] written by the team (as reported by the team) | [AI-FIX] bug fix made by AI (Claude) to student code | [AI] new code written by AI (Claude). Code with no tag is student-written.
   [AI] Reminder system for the camera widget. While the camera feed is on:
     - every "reminder" interval (default 20 min): the widget glides around the window, grows into a
       20-second countdown, then returns home and shows the video again.
     - halfway between reminders (10, 30, 50 min...): the widget asks a short question with a text box.
       Answers are NOT saved anywhere.
   Timing compares Date.now() to the next due time (instead of counting ticks), so a slowed-down
   background tab stays on schedule. If a question and a reminder are due together, the reminder wins.
   When the widget is popped out into the Picture-in-Picture window it cannot glide (the browser owns
   that window), so the countdown and question happen in place. */
(() => {
  const QUESTIONS = [
    "What are you working on right now?",
    "Is this what you planned to be doing?",
    "What is one thing you want to finish next?",
    "How is your focus right now?",
  ];
  const COUNTDOWN_SECONDS = 20;
  const GLIDE_MS = 1100; // matches the CSS transition on .widget-back.floating
  const ANSWER_TIMEOUT_MS = 60000; // an ignored question closes itself

  let video, widget;
  let session = null; // timing for the current camera session
  let busy = false; // true while a reminder or question is on screen
  let questionIndex = 0;
  let previewing = false; // true while a preview runs without a camera

  // Look elements up inside the widget so this still works after it moves into the PiP window
  const $ = (id) => widget.querySelector("#" + id);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const animationsOff = () => document.documentElement.classList.contains("no-animations");
  const inPip = () => widget.ownerDocument !== document;
  const home = () => document.getElementById("camera-widget").getBoundingClientRect();

  document.addEventListener("DOMContentLoaded", () => {
    video = document.getElementById("webcam");
    widget = document.getElementById("widget-video");
    if (!video || !widget) return;
    setInterval(tick, 1000);
    // Used by the Preview buttons on the home page (also callable from the console)
    window.kairnDemo = { reminder: () => preview(runReminder), question: () => preview(runQuestion) };
  });

  // ---- Preview: works even with no webcam, so it can be shown to anyone without waiting 10-20 minutes ----
  async function preview(run) {
    if (busy) return;
    const cameraWasOff = !video.srcObject;
    previewing = true;
    if (cameraWasOff && typeof showVideo === "function") showVideo(); // show the widget without a camera
    try {
      await run();
    } catch (e) {
      console.error(e);
    } finally {
      previewing = false;
      if (cameraWasOff && !video.srcObject && typeof showGreeting === "function") showGreeting();
    }
  }

  // ---- Scheduler: runs once a second ----
  function startSession() {
    const reminderMs = (Number(KairnPrefs.get("reminderMin", 20)) || 20) * 60000;
    const questionMs = (Number(KairnPrefs.get("questionMin", 20)) || 20) * 60000;
    const t0 = Date.now();
    // first reminder after one full interval; first question halfway to it
    session = { reminderMs, questionMs, nextReminder: t0 + reminderMs, nextQuestion: t0 + questionMs / 2 };
  }

  function tick() {
    const cameraOn = !!video.srcObject;
    if (cameraOn && !session) startSession();
    if (!cameraOn) session = null;
    if (!session || busy) return;

    const now = Date.now();
    if (now >= session.nextReminder) {
      while (session.nextReminder <= now) session.nextReminder += session.reminderMs;
      while (session.nextQuestion <= now) session.nextQuestion += session.questionMs; // reminder wins a clash
      runReminder().catch(console.error);
    } else if (now >= session.nextQuestion) {
      while (session.nextQuestion <= now) session.nextQuestion += session.questionMs;
      runQuestion().catch(console.error);
    }
  }

  // ---- Moving the widget (in-page only) ----
  function setRect(r) {
    Object.assign(widget.style, { top: r.top + "px", left: r.left + "px", width: r.width + "px", height: r.height + "px" });
  }
  async function glideTo(r) {
    setRect(r);
    await sleep(animationsOff() ? 50 : GLIDE_MS);
  }
  function startFloating() {
    widget.style.transition = "none"; // start exactly where the widget sits (no slide in from the corner)
    widget.classList.add("floating"); // position: fixed, so the page layout does not change
    setRect(home());
    void widget.offsetWidth; // flush styles, then turn transitions back on for the glides
    widget.style.removeProperty("transition");
  }
  function clearFloating() {
    widget.classList.remove("floating", "takeover");
    ["top", "left", "width", "height"].forEach((p) => widget.style.removeProperty(p));
  }
  function centered(w, h) {
    w = Math.min(w, innerWidth - 40);
    h = Math.min(h, innerHeight - 40);
    return { width: w, height: h, left: (innerWidth - w) / 2, top: (innerHeight - h) / 2 };
  }
  function fullScreen() { // the whole browser window
    const el = document.documentElement;
    return { top: 0, left: 0, width: el.clientWidth, height: el.clientHeight };
  }
  function wanderSpots() {
    const w = Math.min(240, innerWidth - 40), h = 170, m = 24, topY = 110; // 110 keeps clear of the nav bar
    return [
      { width: w, height: h, left: m, top: topY },
      { width: w, height: h, left: innerWidth - w - m, top: innerHeight - h - m },
      { width: w, height: h, left: innerWidth - w - m, top: topY },
    ];
  }
  function showOnly(panelId) {
    ["countdown-panel", "question-panel"].forEach((id) => $(id).classList.toggle("hidden", id !== panelId));
  }

  // ---- Reminder: wander, expand, 20 s countdown, return ----
  async function runReminder() {
    busy = true;
    const floating = !inPip();
    try {
      if (floating) {
        startFloating();
        for (const spot of wanderSpots()) await glideTo(spot);
        widget.classList.add("takeover"); // square corners while it fills the window
        await glideTo(fullScreen()); // grow to take up the whole screen for the countdown
      }
      showOnly("countdown-panel");
      for (let s = COUNTDOWN_SECONDS; s > 0; s--) {
        $("countdown-number").textContent = s;
        await sleep(1000);
        if (!video.srcObject && !previewing) break; // camera turned off mid-reminder (a preview has no camera on purpose)
      }
      showOnly(null); // video feed is visible again
      widget.classList.remove("takeover"); // shrink back, corners round again
      if (floating) await glideTo(home());
    } finally {
      showOnly(null);
      clearFloating();
      busy = false;
    }
  }

  // ---- Question: pop up, wait for an answer (not saved), close ----
  function waitForAnswer() {
    return new Promise((resolve) => {
      const send = $("question-send"), skip = $("question-skip"), input = $("question-input");
      const timer = setTimeout(() => finish(false), ANSWER_TIMEOUT_MS);
      function finish(answered) {
        clearTimeout(timer);
        send.onclick = skip.onclick = input.onkeydown = null;
        resolve(answered);
      }
      send.onclick = () => finish(true);
      skip.onclick = () => finish(false);
      input.onkeydown = (e) => { if (e.key === "Enter") finish(true); };
    });
  }

  async function runQuestion() {
    busy = true;
    const floating = !inPip();
    const input = $("question-input"), actions = $("question-actions");
    try {
      if (floating) {
        startFloating();
        await glideTo(centered(420, 260));
      }
      $("question-text").textContent = QUESTIONS[questionIndex++ % QUESTIONS.length];
      input.value = "";
      showOnly("question-panel");
      input.focus();
      if (await waitForAnswer()) {
        $("question-text").textContent = "Thanks! Back to it.";
        input.classList.add("hidden");
        actions.classList.add("hidden");
        await sleep(1500);
      }
      showOnly(null);
      if (floating) await glideTo(home());
    } finally {
      input.value = ""; // the answer is never stored
      input.classList.remove("hidden");
      actions.classList.remove("hidden");
      showOnly(null);
      clearFloating();
      busy = false;
    }
  }
})();
