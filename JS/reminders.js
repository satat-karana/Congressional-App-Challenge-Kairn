/* AUTHORSHIP KEY: [STUDENT] written by the team (as reported by the team) | [AI-FIX] bug fix made by AI (Claude) to student code | [AI] new code written by AI (Claude). Code with no tag is student-written.
   [AI] Shared settings. Loaded in <head> on every page so the animation setting applies before the page paints.
   Values are stored in localStorage (this browser only, nothing is sent anywhere). */
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
  
  // [AI-FIX] Fixed home bounding rect to include page scroll offset so natural triggers align correctly
  const home = () => {
    const rect = document.getElementById("camera-widget").getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    };
  };

document.addEventListener("DOMContentLoaded", () => {
    video = document.getElementById("webcam");
    widget = document.getElementById("widget-video");
    
    console.log("Reminders script loaded. Found video:", !!video, "Found widget:", !!widget);

    if (!video || !widget) {
      console.error("ERROR: Webcam or widget element not found on this page!");
      return;
    }
    
    setInterval(tick, 1000);
    console.log("Tick interval started successfully.");

    // Used by the Preview buttons on the home page
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
    
    // [AI-FIX] Set first reminder to 10 seconds from now for testing purposes (change back to reminderMs for production)
    const initialTestDelay = 10000; 
    session = { 
      reminderMs, 
      questionMs, 
      nextReminder: t0 + initialTestDelay, 
      nextQuestion: t0 + initialTestDelay / 2 
    };
  }

 // ---- Scheduler: runs once a second ----
  function startSession() {
    const reminderMs = (Number(KairnPrefs.get("reminderMin", 20)) || 20) * 60000;
    const questionMs = (Number(KairnPrefs.get("questionMin", 20)) || 20) * 60000;
    const t0 = Date.now();
    
    // 10-second test delay
    const initialTestDelay = 10000; 
    session = { 
      reminderMs, 
      questionMs, 
      nextReminder: t0 + initialTestDelay, 
      nextQuestion: t0 + initialTestDelay / 2 
    };
    console.log("Kairn Session Started. First reminder in 10s.");
  }

  function tick() {
    const cameraOn = !!video.srcObject;
    
    // Failsafe: if the camera turns off, reset busy so it doesn't stay locked
    if (!cameraOn) {
      if (session) console.log("Camera turned off, resetting session.");
      session = null;
      busy = false; 
    }

    if (cameraOn && !session) startSession();
    
    if (!session || busy) {
      // Uncomment the line below if you want to watch it tick in the console
      // console.log("Tick skipped. Session active:", !!session, "Busy:", busy);
      return;
    }

    const now = Date.now();
    console.log("Checking timer. Time left for reminder:", Math.round((session.nextReminder - now) / 1000), "s");

    if (now >= session.nextReminder) {
      while (session.nextReminder <= now) session.nextReminder += session.reminderMs;
      while (session.nextQuestion <= now) session.nextQuestion += session.questionMs;
      console.log("Triggering natural reminder!");
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
    return { top: window.scrollY, left: window.scrollX, width: el.clientWidth, height: el.clientHeight };
  }
  function wanderSpots() {
    const w = Math.min(240, innerWidth - 40), h = 170, m = 24, topY = 110 + window.scrollY; // 110 keeps clear of the nav bar
    return [
      { width: w, height: h, left: m, top: topY },
      { width: w, height: h, left: innerWidth - w - m, top: innerHeight - h - m + window.scrollY },
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
      input.input = ""; // the answer is never stored
      input.classList.remove("hidden");
      actions.classList.remove("hidden");
      showOnly(null);
      clearFloating();
      busy = false;
    }
  }
})();