document.addEventListener("DOMContentLoaded", async () => {
  const { dailyTime, dailyGoal, streak } = await chrome.storage.local.get(["dailyTime","dailyGoal","streak"]);
  document.getElementById("todayTime").textContent = dailyTime || 0;
  document.getElementById("todayGoal").textContent = dailyGoal;
  document.getElementById("streak").textContent = streak;
  document.getElementById("openOptions").addEventListener("click", () => chrome.runtime.openOptionsPage());
}); 