https://satat-karana.github.io/Congressional-App-Challenge-Kairn/
# Kairn

Kairn helps you stay aware of your screen time: a webcam "mirror" widget, 20-minute eye-rest reminders, short check-in questions, and a desktop screen-time tracker.

**Run the website:** open `HTML/homepage.html` (or the GitHub Pages link; `index.html` redirects there). The camera needs HTTPS or localhost, and the pop-out widget needs a recent Chrome or Edge.

## AI disclosure (Congressional App Challenge)
Every file starts with a key: `[STUDENT]`, `[AI-FIX]` (a bug fix made by AI to student code), `[AI]` (new code written by AI). Tags in the code mark each edited block.

| Part | Who |
|---|---|
| Pages (HTML), site styling, nav bar, camera widget, sign-up validation | Student-written (TEAM: confirm and edit this row) |
| Bug fixes in `styles.css`, `homepage.html`, `real-mirror-script.js` | AI (Claude), tagged `[AI-FIX]` |
| Reminder/question system (`reminders.js`), settings (`prefs.js`, `effects-settings.js`), Effects page controls, Screen Time/Effects page CSS | AI (Claude), tagged `[AI]` |
| Desktop screen-time tracker (`desktop-app/`): `main.js`, `renderer.js`, original `index.html` | Generated with AI by a teammate (per the team; TEAM: confirm). Two `[AI-FIX]` edits and `styles.css` also AI |
| Monthly history and Weekly Report (`desktop-app/main.js` history, `renderer.js` weekly view, `index.html`/`styles.css` report UI), GitHub build workflow, download-link script, full-screen reminder animation | AI (Claude), tagged `[AI]` |
| Images | TEAM: list sources; `long-ai-image.png` appears to be AI-generated |

## Desktop app
Windows only. Push to `main` and GitHub builds `Kairn-Screentime.exe` and publishes it under Releases (see `desktop-app/BUILD.md`); the Screen Time page links to it. The app stores 5 weeks of history on the user's own computer and has a Today view and a Weekly Report view.
