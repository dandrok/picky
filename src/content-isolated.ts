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

  function checkShortsRedirect(hide: boolean) {
    if (typeof window === 'undefined') return;
    if (!hide) return;

    const path = window.location.pathname;
    const isShortsRoute = path === '/shorts' || path === '/shorts/' || path.startsWith('/shorts/');
    if (!isShortsRoute) return;

    document.querySelectorAll('video').forEach((v) => {
      try {
        v.pause();
      } catch {
        // ignore error
      }
    });

    const parts = path.split('/').filter(Boolean);
    const videoId = parts.length > 1 && parts[0] === 'shorts' ? parts[1] : null;

    if (videoId) {
      window.location.replace(`/watch?v=${encodeURIComponent(videoId)}`);
    } else {
      window.location.replace('/');
    }
  }

  // Load initial settings
  chrome.storage.local.get({ hideShorts: false, hoverActions: true }, (result) => {
    const hide = !!result.hideShorts;
    updateHideShorts(hide);
    updateHoverActions(!result.hoverActions);
    checkShortsRedirect(hide);
  });

  // Listen for dynamic changes from the popup
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.hideShorts) {
        const hide =
          changes.hideShorts.newValue !== undefined ? !!changes.hideShorts.newValue : false;
        updateHideShorts(hide);
        checkShortsRedirect(hide);
      }
      if (changes.hoverActions) {
        const enabled =
          changes.hoverActions.newValue !== undefined ? !!changes.hoverActions.newValue : true;
        updateHoverActions(!enabled);
      }
    }
  });
})();
