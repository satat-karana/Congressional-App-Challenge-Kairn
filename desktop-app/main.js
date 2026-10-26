// AUTHORSHIP KEY: [STUDENT] written by the team (as reported by the team) | [AI-FIX] bug fix made by AI (Claude) to existing code | [AI] code written by AI. Code with no tag is student-written.
// File status: [AI] original generated with AI by the teammate (per the team). Monthly history and the weekly-report feed were added by AI, marked [AI] / [AI-FIX] below.
const { app, BrowserWindow } = require('electron'); // Imports Electron's app lifecycle and desktop-window APIs.
const { exec } = require('child_process'); // Imports the function used to run the Windows PowerShell command.
const fs = require('fs'); // Imports filesystem helpers for loading and saving tracker data.
const path = require('path'); // Imports helpers for building a platform-correct data-file path.

let mainWindow; // Holds the dashboard window so tracking updates can be sent to it.
let dataFilePath = path.join(app.getPath('userData'), 'screentime-data.json'); // Stores tracker data in Electron's per-user application-data folder.

// Uses your computer's actual local timezone for midnight resets.
function getTodayDate() { // Defines a helper that formats the current local date for daily tracking.
  const d = new Date(); // Gets the current date and time from the computer.
  const year = d.getFullYear(); // Reads the current year in the local timezone.
  const month = String(d.getMonth() + 1).padStart(2, '0'); // Converts the zero-based month to a two-digit string.
  const day = String(d.getDate()).padStart(2, '0'); // Converts the day of the month to a two-digit string.
  return `${year}-${month}-${day}`; // Returns YYYY-MM-DD for date comparisons and saved data.
} // Ends the local-date formatting helper.

// [AI] ---- Monthly history for the weekly report ----
// history[YYYY-MM-DD][site name] = seconds that site was visible that day. Kept for 35 days (5 weeks).
const HISTORY_DAYS = 35;
const KNOWN_SITES = [ // window titles containing these words are grouped into one entry (e.g. every YouTube video -> "YouTube")
  ['youtube', 'YouTube'], ['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['facebook', 'Facebook'], ['twitter', 'X (Twitter)'],
  ['reddit', 'Reddit'], ['snapchat', 'Snapchat'], ['discord', 'Discord'], ['whatsapp', 'WhatsApp'], ['pinterest', 'Pinterest'],
  ['twitch', 'Twitch'], ['netflix', 'Netflix'], ['spotify', 'Spotify'], ['roblox', 'Roblox'], ['minecraft', 'Minecraft'],
  ['visual studio code', 'VS Code'], ['gmail', 'Gmail'], ['google docs', 'Google Docs'], ['google slides', 'Google Slides'],
  ['google classroom', 'Google Classroom'], ['chatgpt', 'ChatGPT'], ['gemini', 'Gemini'], ['claude', 'Claude']
];
function dateKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function pruneHistory(history) { // drops days older than HISTORY_DAYS
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - HISTORY_DAYS);
  const cutoffKey = dateKey(cutoff);
  Object.keys(history).forEach((day) => { if (day < cutoffKey) delete history[day]; });
  return history;
}
function startNewDay(history) { return { date: getTodayDate(), tracker: {}, history: pruneHistory(history || {}) }; }
function siteName(title) { // the app only sees window titles (not URLs), so the site is read from the title
  const lower = title.toLowerCase();
  for (const [key, name] of KNOWN_SITES) { if (lower.includes(key)) return name; }
  if (/ \/ x$/i.test(title)) return 'X (Twitter)';
  const parts = title.split(/ [-\u2013\u2014|\u00b7] /);
  const name = (parts.length > 1 ? parts[parts.length - 1] : title).trim();
  if (!name) return title;
  return name.length > 40 ? name.slice(0, 40) + '...' : name;
}

let savedData = { date: getTodayDate(), tracker: {}, history: {} }; // Starts with today's date and an empty usage-counter map.

try { // Attempts to restore tracking data saved during an earlier run.
  if (fs.existsSync(dataFilePath)) { // Checks that the data file exists before reading it.
    const fileData = fs.readFileSync(dataFilePath, 'utf8'); // Reads the file contents as UTF-8 text.
    savedData = JSON.parse(fileData); // Parses the JSON text into the saved-data object.
    if (!savedData.tracker) savedData.tracker = {}; // [AI] guard against odd files
    savedData.history = pruneHistory(savedData.history || {}); // [AI] older save files have no history yet
    if (savedData.date !== getTodayDate()) { // Checks whether the saved counters belong to an earlier day.
      savedData = startNewDay(savedData.history); // [AI-FIX] keeps the history, resets only today's counters (data used to be lost at midnight)
    } // Ends the daily rollover check.
  } // Ends the check for an existing data file.
} catch (err) { // Handles a missing, unreadable, or invalid data file without stopping startup.
  console.log("Initializing fresh data file."); // Reports that tracking will continue with fresh in-memory data.
} // Ends the attempt to restore data.

function createWindow() { // Defines the function that creates and displays the dashboard.
  mainWindow = new BrowserWindow({ // Creates a browser window and stores its reference.
    width: 900, // Sets the initial window width in pixels.
    height: 700, // Sets the initial window height in pixels.
    webPreferences: { // Configures how the dashboard page interacts with Electron.
      nodeIntegration: true, // Allows the renderer page to access Node.js APIs.
      contextIsolation: false // Runs page code without a separate isolated JavaScript context.
    } // Ends the web preferences object.
  }); // Finishes creating the browser window.

  mainWindow.loadFile('index.html'); // Loads the dashboard's local HTML file in the window.
  mainWindow.webContents.on('did-finish-load', () => mainWindow.webContents.send('history-update', savedData.history)); // [AI] weekly report shows stored data right away
} // Ends the dashboard-window creation function.

function trackActiveWindow() { // Defines one polling cycle for collecting window titles and updating counters.
  // Runs PowerShell and Windows APIs to list visible, non-minimized window titles not fully covered by earlier windows.
  const command = 'powershell -NoProfile -Command "$code = \'using System; using System.Runtime.InteropServices; using System.Text; using System.Collections.Generic; public class WindowOcclusion { [DllImport(\\"user32.dll\\\")] public static extern IntPtr GetForegroundWindow(); [DllImport(\\\"user32.dll\\\")] public static extern IntPtr GetWindow(IntPtr hWnd, uint uCmd); [DllImport(\\"user32.dll\\\")] public static extern bool IsWindowVisible(IntPtr hWnd); [DllImport(\\"user32.dll\\\")] public static extern bool IsIconic(IntPtr hWnd); [DllImport(\\"user32.dll\\\")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count); [DllImport(\\\"user32.dll\\\")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect); [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; } public static List<string> GetVisibleUncoveredWindows() { List<string> visibleTitles = new List<string>(); List<RECT> coveredRects = new List<RECT>(); IntPtr hwnd = GetForegroundWindow(); while (hwnd != IntPtr.Zero) { if (IsWindowVisible(hwnd) && !IsIconic(hwnd)) { StringBuilder sb = new StringBuilder(256); GetWindowText(hwnd, sb, 256); string title = sb.ToString(); if (!string.IsNullOrEmpty(title)) { RECT rect; GetWindowRect(hwnd, out rect); if (rect.Right > rect.Left && rect.Bottom > rect.Top) { bool isFullyCovered = false; foreach (var r in coveredRects) { if (rect.Left >= r.Left && rect.Top >= r.Top && rect.Right <= r.Right && rect.Bottom <= r.Bottom) { isFullyCovered = true; break; } } if (!isFullyCovered) { visibleTitles.Add(title); coveredRects.Add(rect); } } } } hwnd = GetWindow(hwnd, 2); } return visibleTitles; } }\'; Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue; [WindowOcclusion]::GetVisibleUncoveredWindows()"';

  exec(command, (error, stdout, stderr) => { // Runs the command and processes its output asynchronously.
    if (!error && stdout) { // Continues only when the command succeeds and returns output.
      let lines = stdout.split('\r\n').map(l => l.trim()).filter(l => l.length > 0); // Trims the output into a list of non-empty window titles.
      
      if (savedData.date !== getTodayDate()) { // Checks again in case midnight passed while the app was running.
        savedData = startNewDay(savedData.history); // [AI-FIX] keeps the history, resets only today's counters
      } // Ends the daily rollover check.

      lines.forEach(title => { // Processes each returned title as one observed window.
        let appName = title; // Copies the title so browser-specific text can be cleaned up if necessary.

        const ignoredTitles = [ // Lists window titles that should not count toward tracked app usage.
          "Screen Time Dashboard", // Ignores this app's own dashboard.
          "Windows Input Experience", // Ignores the Windows text-input interface.
          "Settings", // Ignores the Windows Settings app.
          "Task Switching", // Ignores the task-switching interface.
          "Program Manager", // Ignores the Windows desktop shell.
          "Handle Title", // Ignores command-output/header text.
          "-----" // Ignores a separator that may appear in command output.
        ]; // Ends the ignored-title list.

        const isSystemArtifact = /^\d{1,3}$/.test(appName); // Detects numeric-only output that is unlikely to be a window title.
        const isHeaderArtifact = appName.includes("Handle Title") || appName.includes("-----") || appName.includes("False"); // Detects headers, separators, or boolean artifacts.

        if (!isSystemArtifact && !isHeaderArtifact && !ignoredTitles.some(ignored => appName.includes(ignored))) { // Processes only titles that are not artifacts or ignored windows.
          
          if (appName.includes(" - Google Chrome") || appName.includes(" - Microsoft Edge") || appName.includes(" - Brave")) { // Checks whether the title ends with a supported browser name.
            appName = appName.replace(/ - (Google Chrome|Microsoft Edge|Brave).*$/, ''); // Removes the browser name and trailing details to keep the page title.
          } // Ends browser-title cleanup.

          if (appName) { // Ensures there is a title left to count.
            if (!savedData.tracker[appName]) { // Checks whether this title already has a usage counter.
              savedData.tracker[appName] = 0; // Initializes the counter for a newly observed title.
            } // Ends counter initialization.
            savedData.tracker[appName] += 1; // Adds one polling interval to the title's usage count.
            const site = siteName(appName); // [AI] also add it to today's per-site history
            const dayData = savedData.history[savedData.date] || (savedData.history[savedData.date] = {});
            dayData[site] = (dayData[site] || 0) + 1;
          } // Ends the non-empty title check.
        } // Ends filtering and counting for this window title.
      }); // Ends processing of all returned titles.

      fs.writeFileSync(dataFilePath, JSON.stringify(savedData)); // Saves the updated date and counters as JSON.

      if (mainWindow && !mainWindow.isDestroyed()) { // Checks that the dashboard exists and is not already closed.
        mainWindow.webContents.send('tracker-update', savedData.tracker); // Sends updated counters to the page using the tracker-update event.
        mainWindow.webContents.send('history-update', savedData.history); // [AI] sends the history for the weekly report
      } // Ends the dashboard availability check.
    } // Ends processing of successful command output.
  }); // Ends the asynchronous command callback.
} // Ends the active-window tracking function.

app.whenReady().then(() => { // Waits for Electron initialization before starting the dashboard and tracker.
  createWindow(); // Opens the dashboard window.
  setInterval(trackActiveWindow, 1000); // Samples visible windows once every second.
}); // Ends the Electron-ready startup callback.

app.on('window-all-closed', () => { // Handles the event fired when every application window has closed.
  if (process.platform !== 'darwin') app.quit(); // Quits on Windows/Linux but follows macOS's usual app lifecycle.
}); // Ends the all-windows-closed handler.
// TODO: Investigate admin-window tracking and tab-related issues.
// Run the app from the project folder with: node_modules\.bin\electron .
