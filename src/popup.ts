/// <reference types="chrome"/>

document.addEventListener('DOMContentLoaded', () => {
  const hideShortsToggle = document.getElementById('hideShortsToggle') as HTMLInputElement | null;
  const hoverActionsToggle = document.getElementById(
    'hoverActionsToggle',
  ) as HTMLInputElement | null;

  if (hideShortsToggle && hoverActionsToggle) {
    let hideShortsInteracted = false;
    let hoverActionsInteracted = false;

    // Save changes on toggle (active immediately)
    hideShortsToggle.addEventListener('change', () => {
      hideShortsInteracted = true;
      chrome.storage.local.set({ hideShorts: hideShortsToggle.checked });
    });

    hoverActionsToggle.addEventListener('change', () => {
      hoverActionsInteracted = true;
      chrome.storage.local.set({ hoverActions: hoverActionsToggle.checked });
    });

    // Load current settings without overwriting user's quick first click
    chrome.storage.local.get({ hideShorts: false, hoverActions: true }, (items) => {
      if (!hideShortsInteracted) {
        hideShortsToggle.checked = !!items.hideShorts;
      }
      if (!hoverActionsInteracted) {
        hoverActionsToggle.checked = !!items.hoverActions;
      }
    });
  }
});
