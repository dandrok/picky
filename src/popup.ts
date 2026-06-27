/// <reference types="chrome"/>

document.addEventListener('DOMContentLoaded', () => {
  const hideShortsToggle = document.getElementById('hideShortsToggle') as HTMLInputElement | null;
  const hoverActionsToggle = document.getElementById(
    'hoverActionsToggle',
  ) as HTMLInputElement | null;

  if (hideShortsToggle && hoverActionsToggle) {
    // Load current settings
    chrome.storage.local.get({ hideShorts: false, hoverActions: true }, (items) => {
      hideShortsToggle.checked = !!items.hideShorts;
      hoverActionsToggle.checked = !!items.hoverActions;

      // Save changes on toggle
      hideShortsToggle.addEventListener('change', () => {
        chrome.storage.local.set({ hideShorts: hideShortsToggle.checked });
      });

      hoverActionsToggle.addEventListener('change', () => {
        chrome.storage.local.set({ hoverActions: hoverActionsToggle.checked });
      });
    });
  }
});
