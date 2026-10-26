# Kairn Screentime app (Windows only)

## Easiest: GitHub builds it for you
1. Push this whole repo to GitHub (branch `main`).
2. Open the repo's **Actions** tab: "Build Windows app" runs by itself (about 3-5 minutes).
3. When it turns green, **Releases** shows "Kairn Screentime (Windows)" with `Kairn-Screentime.exe` attached.
4. On GitHub Pages the Screen Time page links to that file automatically.
If Actions is switched off: repo Settings > Actions > General > Allow all actions.

## Or build it by hand
Install Node.js (LTS), open a terminal in this folder, then:
```
npm install
npm start        (test: the dashboard opens and fills with data)
npm run build    (creates dist/Kairn-Screentime.exe)
```
If the build says "Cannot create symbolic link", turn on Windows Developer Mode or run the terminal as Administrator.

## Notes
- Windows 10/11 only (tracking uses PowerShell and Windows APIs).
- The app tracks while it is running. Closing the window quits it, so minimize it instead.
- Windows SmartScreen may warn because the app is not code-signed: "More info" > "Run anyway".
- Data stays on the user's own computer (`screentime-data.json` in their app-data folder). 5 weeks of history are kept.
