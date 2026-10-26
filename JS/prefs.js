/* AUTHORSHIP KEY: [STUDENT] written by the team (as reported by the team) | [AI-FIX] bug fix made by AI (Claude) to student code | [AI] new code written by AI (Claude). Code with no tag is student-written.
   [AI] Shared settings. Loaded in <head> on every page so the animation setting applies before the page paints.
   Values are stored in localStorage (this browser only, nothing is sent anywhere). */
window.KairnPrefs = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem("kairn." + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem("kairn." + key, JSON.stringify(value));
    } catch (e) {}
  },
};

function applyAnimationPref() {
  document.documentElement.classList.toggle("no-animations", KairnPrefs.get("animationsOff", false));
}
applyAnimationPref();
window.addEventListener("storage", applyAnimationPref); // keeps other open tabs in sync
