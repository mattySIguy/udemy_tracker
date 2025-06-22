document.addEventListener("DOMContentLoaded", async () => {
  const { dailyGoal } = await chrome.storage.local.get("dailyGoal");
  document.getElementById("goalInput").value = dailyGoal;
  document.getElementById("save").addEventListener("click", async () => {
    const val = parseInt(document.getElementById("goalInput").value, 10);
    if (val > 0) {
      await chrome.storage.local.set({ dailyGoal: val });
      alert("Saved!");
    }
  });
}); 