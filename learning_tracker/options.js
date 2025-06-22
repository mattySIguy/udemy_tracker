document.addEventListener("DOMContentLoaded", async () => {
  const websitesList = document.getElementById("websitesList");
  const websiteInput = document.getElementById("websiteInput");
  const addWebsiteButton = document.getElementById("addWebsite");

  // Function to render the list of websites
  async function renderWebsites() {
    websitesList.innerHTML = ''; // Clear current list
    // SITES will now store objects with {domain: "example.com", goal: 60}
    const { SITES: storedSites = [] } = await chrome.storage.local.get("SITES");

    if (storedSites.length === 0) {
      websitesList.innerHTML = '<p>No websites are being tracked yet. Add one below!</p>';
      return;
    }

    storedSites.forEach(siteObj => {
      const siteDiv = document.createElement("div");
      siteDiv.className = "website-item";
      siteDiv.innerHTML = `
        <span>${siteObj.domain}</span>
        <label>Goal (min): <input type="number" class="goal-input" data-domain="${siteObj.domain}" value="${siteObj.goal}" min="1"></label>
        <button class="save-goal" data-domain="${siteObj.domain}">Save Goal</button>
        <button class="remove-website" data-domain="${siteObj.domain}">Remove</button>
      `;
      websitesList.appendChild(siteDiv);
    });

    // Add event listeners to goal inputs
    document.querySelectorAll(".goal-input").forEach(input => {
      input.addEventListener("change", async (event) => {
        // This part is now handled by the explicit Save Goal button
        // The value will be read when the Save Goal button is clicked
      });
    });

    // Add event listeners to save goal buttons
    document.querySelectorAll(".save-goal").forEach(button => {
      button.addEventListener("click", async (event) => {
        const domainToUpdate = event.target.dataset.domain;
        const inputElement = document.querySelector(`.goal-input[data-domain="${domainToUpdate}"]`);
        const newGoal = parseInt(inputElement.value, 10);

        if (newGoal > 0) {
          const { SITES: storedSitesCurrent = [] } = await chrome.storage.local.get("SITES");
          const updatedSites = storedSitesCurrent.map(siteObj => 
            siteObj.domain === domainToUpdate ? { ...siteObj, goal: newGoal } : siteObj
          );
          await chrome.storage.local.set({ SITES: updatedSites });
          alert(`Goal for ${domainToUpdate} saved!`);
        } else {
          alert("Please enter a valid goal (a number greater than 0).");
          // No need to revert value here, user can re-enter
        }
      });
    });

    // Add event listeners to remove buttons
    document.querySelectorAll(".remove-website").forEach(button => {
      button.addEventListener("click", async (event) => {
        const domainToRemove = event.target.dataset.domain;
        const { SITES: storedSitesCurrent = [] } = await chrome.storage.local.get("SITES"); // Fetch latest data
        const updatedSites = storedSitesCurrent.filter(siteObj => siteObj.domain !== domainToRemove);
        await chrome.storage.local.set({ SITES: updatedSites });
        renderWebsites(); // Re-render the list after removal
      });
    });
  }

  // Add new website
  addWebsiteButton.addEventListener("click", async () => {
    const newWebsite = websiteInput.value.trim();
    if (newWebsite) {
      const { SITES: storedSites = [] } = await chrome.storage.local.get("SITES");
      if (!storedSites.some(siteObj => siteObj.domain === newWebsite)) {
        const updatedSites = [...storedSites, { domain: newWebsite, goal: 60 }]; // Default goal for new site
        await chrome.storage.local.set({ SITES: updatedSites });
        websiteInput.value = ''; // Clear input
        renderWebsites(); // Re-render the list
      } else {
        alert("This website is already in the list.");
      }
    } else {
      alert("Please enter a website to add.");
    }
  });

  // Initial render
  renderWebsites();
}); 