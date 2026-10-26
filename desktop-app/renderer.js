// AUTHORSHIP KEY: [STUDENT] written by the team (as reported by the team) | [AI-FIX] bug fix made by AI (Claude) to existing code | [AI] code written by AI. Code with no tag is student-written.
// File status: [AI] original generated with AI by the teammate (per the team). [AI-FIX] edits and the weekly report were added by AI.
const { ipcRenderer } = require('electron');

    let categoryStates = {};
    let groupYouTube = true; // Default state for grouping YouTube items
    let lastAppData = {};    // Cache data so toggle button updates instantly

    // Toggle button event listener
    document.getElementById('toggle-yt').addEventListener('click', () => {
      groupYouTube = !groupYouTube;
      const btn = document.getElementById('toggle-yt');
      btn.innerText = `Group YouTube Items: ${groupYouTube ? 'ON' : 'OFF'}`;
      btn.classList.toggle('off', !groupYouTube); // [AI-FIX] was an inline colour, which overrode the stylesheet
      
      // Instantly re-render with the cached data
      renderDashboard(lastAppData);
    });

    function formatTime(seconds) {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      if (hrs > 0) return `${hrs}h ${mins}m`;
      if (mins > 0) return `${mins}m ${secs}s`;
      return `${secs}s`;
    }

    function getCategory(title) {
      const lower = title.toLowerCase();
      if (lower.includes('youtube')) return 'YouTube'; // Renamed from YouTube Videos
      if (lower.includes('visual studio code') || lower.includes('main.js')) return 'VS Code / Coding';
      if (lower.includes('chrome') || lower.includes('edge') || lower.includes('brave') || lower.includes('download') || lower.includes('gemini') || lower.includes('google') || lower.includes('search') || lower.includes('new tab') || lower.includes('history')) {
        return 'Web Browsing';
      }
      if (lower.includes('roblox') || lower.includes('game')) return 'Games';
      return 'Other Applications';
    }

    function renderDashboard(appData) {
      lastAppData = appData; // Save to cache
      const listContainer = document.getElementById('tracker-list');

      // Save open/closed folder states
      listContainer.querySelectorAll('details').forEach(det => {
        let catName = det.getAttribute('data-category');
        if (catName) {
          categoryStates[catName] = det.open;
        }
      });

      listContainer.innerHTML = '';

      let categories = {};

      for (const [title, seconds] of Object.entries(appData)) {
        let cat = getCategory(title);
        if (!categories[cat]) {
          categories[cat] = { total: 0, items: [] };
        }
        categories[cat].total += seconds;
        categories[cat].items.push({ name: title, time: seconds });
      }

      // [AI-FIX] without this the list went blank when there was no data
      if (Object.keys(categories).length === 0) {
        listContainer.innerHTML = '<p>Waiting for activity...</p>';
        return;
      }

      // Special handling for YouTube grouping feature
      if (categories['YouTube'] && groupYouTube) {
        let ytShortsTime = 0;
        let ytVideosTime = 0;
        let rawYtItems = categories['YouTube'].items;

        rawYtItems.forEach(item => {
          if (item.name.toLowerCase().includes('shorts')) {
            ytShortsTime += item.time;
          } else {
            ytVideosTime += item.time;
          }
        });

        // Rebuild YouTube sub-items based on toggle
        categories['YouTube'].items = [];
        if (ytVideosTime > 0) {
          categories['YouTube'].items.push({ name: 'YouTube Videos', time: ytVideosTime });
        }
        if (ytShortsTime > 0) {
          categories['YouTube'].items.push({ name: 'YouTube Shorts', time: ytShortsTime });
        }
      }

      for (const [catName, data] of Object.entries(categories)) {
        let details = document.createElement('details');
        details.setAttribute('data-category', catName);
        details.open = categoryStates[catName] !== undefined ? categoryStates[catName] : true;

        let summary = document.createElement('summary');
        summary.innerHTML = `
          <span><span class="arrow">▶</span> 📁 ${catName}</span>
          <span class="group-total">${formatTime(data.total)}</span>
        `;
        details.appendChild(summary);

        data.items.sort((a, b) => b.time - a.time);

        data.items.forEach(item => {
          let subItem = document.createElement('div');
          subItem.className = 'sub-item';
          // [AI-FIX] window titles come from web pages, so they are inserted as plain text, never as HTML
          subItem.innerHTML = '<span class="sub-name"></span><span class="sub-time"></span>';
          subItem.querySelector('.sub-name').textContent = item.name;
          subItem.querySelector('.sub-time').textContent = formatTime(item.time);
          details.appendChild(subItem);
        });

        listContainer.appendChild(details);
      }
    }

    ipcRenderer.on('tracker-update', (event, appData) => {
      renderDashboard(appData);
    });

// ===================== [AI] Weekly report (this week + 4 weeks back) =====================
let historyData = {};   // { 'YYYY-MM-DD': { 'YouTube': seconds, ... } } sent by main.js
let selectedWeek = 0;   // 0 = this week ... 4 = four weeks ago
const WEEK_LABELS = ['This week', 'Last week', '2 weeks ago', '3 weeks ago', '4 weeks ago'];

function dayNumber(key) { // whole days since 1970, computed from the date parts so daylight-saving never shifts it
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}
function mondayOf(n) { return n - ((n + 3) % 7); } // weeks start on Monday (1 Jan 1970 was a Thursday)
function localTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function buildWeek(weeksAgo) { // adds up every site for the 7 days of that week
  const start = mondayOf(dayNumber(localTodayKey())) - weeksAgo * 7;
  const sites = {};
  for (const [key, perSite] of Object.entries(historyData)) {
    const n = dayNumber(key);
    if (n < start || n >= start + 7) continue;
    for (const [site, secs] of Object.entries(perSite)) sites[site] = (sites[site] || 0) + secs;
  }
  return { sites, start };
}
function formatDay(n) {
  return new Date(n * 86400000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// Week buttons are built once (not every second) so clicks are never lost
const weekTabs = document.getElementById('week-tabs');
WEEK_LABELS.forEach((label, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pill-btn' + (i === 0 ? ' active' : '');
  b.textContent = label;
  b.addEventListener('click', () => { selectedWeek = i; renderWeekly(); });
  weekTabs.appendChild(b);
});

function renderWeekly() {
  [...weekTabs.children].forEach((b, i) => b.classList.toggle('active', i === selectedWeek));
  const { sites, start } = buildWeek(selectedWeek);
  document.getElementById('week-range').textContent = `${formatDay(start)} - ${formatDay(start + 6)}`;
  const list = document.getElementById('weekly-list');
  list.innerHTML = '';
  const rows = Object.entries(sites).sort((a, b) => b[1] - a[1]);
  if (rows.length === 0) {
    list.innerHTML = '<p class="weekly-empty">No activity recorded for this week yet.</p>';
    return;
  }
  const max = rows[0][1];
  rows.forEach(([name, secs]) => {
    const row = document.createElement('div');
    row.className = 'site-row';
    row.innerHTML = '<div class="site-head"><span class="site-name"></span><span class="site-time"></span></div><div class="site-bar"><span></span></div>';
    row.querySelector('.site-name').textContent = name;
    row.querySelector('.site-time').textContent = formatTime(secs);
    row.querySelector('.site-bar > span').style.width = Math.max(2, Math.round((secs / max) * 100)) + '%';
    list.appendChild(row);
  });
}

// Switch between the Today and Weekly Report views
const todayView = document.getElementById('today-view');
const weeklyView = document.getElementById('weekly-view');
const viewToday = document.getElementById('view-today');
const viewWeekly = document.getElementById('view-weekly');
function showView(weekly) {
  todayView.hidden = weekly;
  weeklyView.hidden = !weekly;
  viewToday.classList.toggle('active', !weekly);
  viewWeekly.classList.toggle('active', weekly);
  if (weekly) renderWeekly();
}
viewToday.addEventListener('click', () => showView(false));
viewWeekly.addEventListener('click', () => showView(true));

ipcRenderer.on('history-update', (event, data) => {
  historyData = data || {};
  if (!weeklyView.hidden) renderWeekly();
});
