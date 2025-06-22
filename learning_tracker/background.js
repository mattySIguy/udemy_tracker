// Tracks active tab time and resets daily at midnight
const SITES = ["udemy.com"];
const DEFAULT_GOAL = 60; // minutes

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ dailyGoal: DEFAULT_GOAL, streak: 0, lastCheck: null });
  scheduleMidnightReset();
  // Start tracking immediately
  chrome.alarms.create("trackTime", { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "trackTime") trackActiveTime();
  if (alarm.name === "midnightReset") resetDaily();
});

function scheduleMidnightReset() {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  chrome.alarms.create("midnightReset", { when: midnight.getTime(), periodInMinutes: 24 * 60 });
}

chrome.idle.onStateChanged.addListener((state) => {
  if (state === "active") {
    chrome.alarms.create("trackTime", { periodInMinutes: 1 });
  } else {
    chrome.alarms.clear("trackTime");
  }
});

async function trackActiveTime() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab || !tab.url) return;
    
    const url = new URL(tab.url);
    const now = Date.now();
    
    if (SITES.some(domain => url.hostname.includes(domain))) {
      const { lastCheck = now, dailyTime = 0, dailyGoal = DEFAULT_GOAL, streak = 0, lastReset } = await chrome.storage.local.get(["lastCheck","dailyTime","dailyGoal","streak","lastReset"]);
      
      // Check if it's a new day
      if (!lastReset || new Date(lastReset).toDateString() !== new Date().toDateString()) {
        await chrome.storage.local.set({ dailyTime: 0, lastReset: now });
        return; // Don't add time on first check of new day
      }
      
      // Calculate time delta (max 2 minutes to prevent huge jumps)
      const delta = Math.min(2, Math.round((now - lastCheck) / 1000 / 60));
      const newTime = dailyTime + delta;
      const updated = { dailyTime: newTime, lastCheck: now };
      
      // Check if goal was just reached
      if (dailyGoal && newTime >= dailyGoal && dailyTime < dailyGoal) {
        updated.streak = streak + 1;
        console.log("Goal reached! Streak updated to:", updated.streak);
      }
      
      await chrome.storage.local.set(updated);
      console.log(`Time tracked: ${newTime}/${dailyGoal} minutes`);
    } else {
      // Update lastCheck even when not on learning site
      await chrome.storage.local.set({ lastCheck: now });
    }
  } catch (error) {
    console.error("Error tracking time:", error);
  }
}

async function resetDaily() {
  try {
    const { dailyTime = 0, dailyGoal = DEFAULT_GOAL, streak = 0 } = await chrome.storage.local.get(["dailyTime","dailyGoal","streak"]);
    const reached = dailyTime >= dailyGoal;
    await chrome.storage.local.set({ 
      dailyTime: 0, 
      lastReset: Date.now(), 
      streak: reached ? streak : 0 
    });
    console.log("Daily reset completed. Streak:", reached ? streak : 0);
  } catch (error) {
    console.error("Error resetting daily:", error);
  }
} 