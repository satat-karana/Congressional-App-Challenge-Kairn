/* AUTHORSHIP KEY: [STUDENT] written by the team | [AI-FIX] bug fix by AI | [AI] code written by AI.
   [AI] On GitHub Pages (https://USER.github.io/REPO/HTML/...) this points the download button at the app that the
   GitHub Action publishes: https://github.com/USER/REPO/releases/latest/download/Kairn-Screentime.exe
   When testing locally the placeholder link in the HTML stays. */
document.addEventListener("DOMContentLoaded", () => {
  const link = document.getElementById("download-link");
  const repo = location.pathname.split("/")[1];
  if (link && location.hostname.slice(-10) === ".github.io" && repo && repo !== "HTML") {
    link.href = "https://github.com/" + location.hostname.split(".")[0] + "/" + repo + "/releases/latest/download/Kairn-Screentime.exe";
  }
});
