/* AUTHORSHIP KEY: [STUDENT] written by the team (as reported by the team) | [AI-FIX] bug fix made by AI (Claude) to student code | [AI] new code written by AI (Claude). Code with no tag is student-written.
   [AI] Controls on the Effects page: animation on/off and the reminder/question timing. */
document.addEventListener("DOMContentLoaded", () => {
  const animBtn = document.getElementById("toggle-animations");

  function paintButton() {
    const off = KairnPrefs.get("animationsOff", false);
    animBtn.textContent = off ? "Restore Animations" : "Remove Animations";
    animBtn.setAttribute("aria-pressed", String(off));
  }
  animBtn.addEventListener("click", () => {
    KairnPrefs.set("animationsOff", !KairnPrefs.get("animationsOff", false));
    applyAnimationPref();
    paintButton();
  });
  paintButton();

  // Number boxes: only save sensible values (0.5 to 240 minutes), otherwise put the old value back.
  function bindNumber(id, key, fallback) {
    const input = document.getElementById(id);
    input.value = KairnPrefs.get(key, fallback);
    input.addEventListener("change", () => {
      const n = parseFloat(input.value);
      if (Number.isFinite(n) && n >= 0.5 && n <= 240) KairnPrefs.set(key, n);
      else input.value = KairnPrefs.get(key, fallback);
    });
  }
  bindNumber("reminder-min", "reminderMin", 20);
  bindNumber("question-min", "questionMin", 20);
});
