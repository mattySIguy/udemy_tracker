document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const url = tab ? new URL(tab.url) : null;

  let currentDailyTime = 0;
  let currentGoal = 0;
  let currentStreak = 0;

  const { SITES: storedSites = [], dailyTimes = {} } = await chrome.storage.local.get(["SITES", "dailyTimes"]);

  if (url) {
    const matchingSite = storedSites.find(siteObj => url.hostname.includes(siteObj.domain));
    if (matchingSite) {
      currentDailyTime = dailyTimes[matchingSite.domain] || 0;
      currentGoal = matchingSite.goal;
      currentStreak = matchingSite.streak;
    }
  }
  
  document.getElementById("todayTime").textContent = currentDailyTime;
  document.getElementById("todayGoal").textContent = currentGoal > 0 ? currentGoal : 'N/A';
  document.getElementById("streak").textContent = currentStreak;
  document.getElementById("openOptions").addEventListener("click", () => chrome.runtime.openOptionsPage());
}); 