// Tracks active tab time and resets daily at midnight
// const DEFAULT_GOAL = 60; // minutes - This constant is no longer needed

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ lastCheck: null, lastReset: null }); // Initialize global state
  // Initialize SITES and dailyTimes in storage if not present
  chrome.storage.local.get(['SITES', 'dailyTimes'], (result) => {
    if (!result.SITES || result.SITES.length === 0) { // Check for empty array too
      chrome.storage.local.set({
        SITES: [
          { domain: "udemy.com", goal: 60, streak: 0 },
          { domain: "datacamp.com", goal: 60, streak: 0 },
          { domain: "coursera.com", goal: 60, streak: 0 }
        ]
      }, () => {
        console.log("SITES initialized to defaults:", [{ domain: "udemy.com", goal: 60, streak: 0 }, { domain: "datacamp.com", goal: 60, streak: 0 }, { domain: "coursera.com", goal: 60, streak: 0 }]);
      });
    } else {
      console.log("SITES already exists:", result.SITES);
    }
    if (!result.dailyTimes) {
      chrome.storage.local.set({ dailyTimes: {} }, () => {
        console.log("dailyTimes initialized to empty object.");
      });
    } else {
      console.log("dailyTimes already exists:", result.dailyTimes);
    }
  });
  scheduleMidnightReset();
  // Start tracking immediately
  chrome.alarms.create("trackTime", { periodInMinutes: 1 });
  console.log("Extension installed or updated. Tracking and midnight reset scheduled.");
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "trackTime") {
    console.log("Alarm: trackTime triggered.");
    trackActiveTime();
  }
  if (alarm.name === "midnightReset") {
    console.log("Alarm: midnightReset triggered.");
    resetDaily();
  }
});

function scheduleMidnightReset() {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0); // Set to next midnight
  chrome.alarms.create("midnightReset", { when: midnight.getTime(), periodInMinutes: 24 * 60 });
  console.log("Midnight reset scheduled for:", midnight.toLocaleString());
}

chrome.idle.onStateChanged.addListener((state) => {
  if (state === "active") {
    chrome.alarms.create("trackTime", { periodInMinutes: 1 });
    console.log("User active, trackTime alarm re-created.");
  } else {
    chrome.alarms.clear("trackTime");
    console.log("User idle, trackTime alarm cleared.");
  }
});

async function trackActiveTime() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab || !tab.url) {
      console.log("No active tab or URL.");
      return;
    }

    const url = new URL(tab.url);
    const now = Date.now();

    let { SITES: storedSites = [], dailyTimes = {}, lastCheck = now, lastReset } = await chrome.storage.local.get(["SITES", "dailyTimes", "lastCheck", "lastReset"]);
    console.log("trackActiveTime: Initial storage data:", { storedSites, dailyTimes, lastCheck, lastReset });

    // Check if it's a new day based on lastReset and trigger a daily reset if necessary
    if (!lastReset || new Date(lastReset).toDateString() !== new Date().toDateString()) {
      console.log("trackActiveTime: New day detected. Triggering daily reset.");
      await resetDaily(); // Perform the daily reset before tracking time for the new day
      // After reset, re-fetch the storage data as it might have changed
      const updatedStorage = await chrome.storage.local.get(["SITES", "dailyTimes", "lastCheck", "lastReset"]);
      storedSites = updatedStorage.SITES;
      dailyTimes = updatedStorage.dailyTimes;
      lastCheck = updatedStorage.lastCheck;
      lastReset = updatedStorage.lastReset; // This will now be the current date
      console.log("trackActiveTime: Storage data after reset:", { storedSites, dailyTimes, lastCheck, lastReset });
    }

    let currentSiteObj = null;
    for (const siteObj of storedSites) {
      if (url.hostname.includes(siteObj.domain)) {
        currentSiteObj = siteObj;
        break;
      }
    }

    if (currentSiteObj) {
      const currentDomain = currentSiteObj.domain;
      const currentDailyTime = dailyTimes[currentDomain] || 0;
      const currentGoal = currentSiteObj.goal;

      // Calculate time delta (max 2 minutes to prevent huge jumps)
      const delta = Math.min(2, Math.round((now - lastCheck) / 1000 / 60));
      const newTime = currentDailyTime + delta;

      const updatedDailyTimes = { ...dailyTimes, [currentDomain]: newTime };

      await chrome.storage.local.set({
        dailyTimes: updatedDailyTimes,
        lastCheck: now,
      });
      console.log(`Time tracked for ${currentDomain}: ${newTime}/${currentGoal} minutes. Delta: ${delta}. Last check: ${new Date(lastCheck).toLocaleString()}. New dailyTimes:`, updatedDailyTimes);
    } else {
      // Update lastCheck even when not on learning site
      await chrome.storage.local.set({ lastCheck: now });
      console.log("Not on a tracked site. lastCheck updated.");
    }
  } catch (error) {
    console.error("Error tracking time:", error);
  }
}

async function resetDaily() {
  try {
    const { SITES: storedSites = [], dailyTimes = {}, lastReset } = await chrome.storage.local.get(["SITES", "dailyTimes", "lastReset"]);
    console.log("resetDaily: Initial storage data:", { storedSites, dailyTimes, lastReset });

    // Ensure reset only happens once per day (or if lastReset is null/invalid)
    if (lastReset && new Date(lastReset).toDateString() === new Date().toDateString()) {
      console.log("Daily reset already performed today. Skipping.");
      return;
    }

    const newDailyTimes = {}; // All daily times are reset to empty

    const updatedSiteObjects = storedSites.map(siteObj => {
      const currentDailyTime = dailyTimes[siteObj.domain] || 0;
      const reachedGoal = currentDailyTime >= siteObj.goal;
      console.log(`Resetting: ${siteObj.domain}. Daily time: ${currentDailyTime}. Goal: ${siteObj.goal}. Reached goal: ${reachedGoal}. Current streak: ${siteObj.streak}.`);
      return {
        ...siteObj,
        streak: reachedGoal ? siteObj.streak + 1 : 0 // Increment streak if goal reached, else reset
      };
    });

    await chrome.storage.local.set({
      dailyTimes: newDailyTimes, // Clear all daily times
      lastReset: Date.now(),
      SITES: updatedSiteObjects // Update SITES array with new streaks
    });
    console.log("Daily reset completed. Streaks updated. New SITES:", updatedSiteObjects, "New dailyTimes:", newDailyTimes);
  } catch (error) {
    console.error("Error resetting daily:", error);
  }
} 