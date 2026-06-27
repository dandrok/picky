/// <reference types="chrome"/>

(function initIsolated() {
  function updateHideShorts(hide: boolean) {
    if (hide) {
      document.documentElement.setAttribute('data-hide-shorts', 'true');
    } else {
      document.documentElement.removeAttribute('data-hide-shorts');
    }
  }

  function updateHoverActions(disable: boolean) {
    if (disable) {
      document.documentElement.setAttribute('data-disable-hover-actions', 'true');
    } else {
      document.documentElement.removeAttribute('data-disable-hover-actions');
    }
  }

  // Load initial settings
  chrome.storage.local.get({ hideShorts: false, hoverActions: true }, (result) => {
    updateHideShorts(!!result.hideShorts);
    updateHoverActions(!result.hoverActions);
  });

  // Listen for dynamic changes from the popup
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.hideShorts) {
        const hide =
          changes.hideShorts.newValue !== undefined ? !!changes.hideShorts.newValue : false;
        updateHideShorts(hide);
      }
      if (changes.hoverActions) {
        const enabled =
          changes.hoverActions.newValue !== undefined ? !!changes.hoverActions.newValue : true;
        updateHoverActions(!enabled);
      }
    }
  });
})();
