(function initContentUtils(root, factory) {
  if (typeof window !== 'undefined') {
    root.YTHoverActionsUtils = factory();
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function createContentUtils() {
  const ACTIONS = {
    NOT_INTERESTED: 'not-interested',
    DONT_RECOMMEND_CHANNEL: 'dont-recommend-channel',
  };

  const ACTION_LABELS = {
    [ACTIONS.NOT_INTERESTED]: 'Not interested',
    [ACTIONS.DONT_RECOMMEND_CHANNEL]: "Don't recommend channel",
  };

  const MENU_ACTION_TARGET_SELECTOR = [
    'yt-list-item-view-model',
    'ytd-menu-service-item-renderer',
    'ytd-menu-navigation-item-renderer',
    'tp-yt-paper-item:not([hidden])',
    '[role="option"]:not([hidden])',
    'a:not([hidden])',
    'button:not([hidden])',
  ].join(',');

  function normalizeMenuText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function getActionLabel(action) {
    return ACTION_LABELS[action] || '';
  }

  function textMatchesAction(value, action) {
    const target = normalizeMenuText(getActionLabel(action));
    const text = normalizeMenuText(value);
    return Boolean(target && (text === target || text.includes(target)));
  }

  function isMenuItemHost(item) {
    const tagName = normalizeMenuText(item && item.tagName);
    const role = normalizeMenuText(item && item.getAttribute && item.getAttribute('role'));

    return role === 'menuitem' || tagName.includes('menu-service-item') || tagName.includes('menu-navigation-item');
  }

  function getActionClickTarget(item) {
    if (!item || typeof item.querySelector !== 'function') return item || null;
    if (isMenuItemHost(item)) return item;

    return item.querySelector(MENU_ACTION_TARGET_SELECTOR) || item;
  }

  function findMenuItemByAction(items, action) {
    const item = Array.from(items || []).find((candidate) => textMatchesAction(candidate.textContent, action));
    return getActionClickTarget(item);
  }

  function getMenuItemEndpoint(item) {
    if (!item) return null;
    if (item.endpoint) return item.endpoint;
    if (item.data) {
      return item.data.serviceEndpoint || item.data.navigationEndpoint || item.data.command || null;
    }
    if (item.__data) {
      return item.__data.serviceEndpoint || item.__data.navigationEndpoint || item.__data.command || null;
    }
    return null;
  }

  function findCommandInData(data, action) {
    if (!data) return null;
    const label = normalizeMenuText(getActionLabel(action));
    
    // YouTube data structures are deeply nested and vary by renderer
    const search = (obj, depth = 0) => {
      if (!obj || depth > 10) return null;

      // Handle ViewModels (newer YouTube UI)
      if (obj.viewModel?.menuViewModel?.menuViewModel?.items) {
        for (const item of obj.viewModel.menuViewModel.menuViewModel.items) {
          const renderer = item.menuItemViewModel;
          if (renderer) {
            const text = normalizeMenuText(renderer.title || '');
            if (text.includes(label)) {
              return renderer.serviceEndpoint || renderer.navigationEndpoint || renderer.command || renderer.onTap;
            }
          }
        }
      }
      
      // If we found a menu renderer, look through its items
      if (obj.menuRenderer && obj.menuRenderer.items) {
        for (const item of obj.menuRenderer.items) {
          const renderer = item.menuServiceItemRenderer || item.menuNavigationItemRenderer;
          if (renderer) {
            const text = normalizeMenuText(renderer.text?.runs?.[0]?.text || renderer.text?.simpleText || '');
            if (text.includes(label)) {
              return renderer.serviceEndpoint || renderer.navigationEndpoint || renderer.command;
            }
          }
        }
      }

      // Recursively search in likely properties
      const keys = ['menu', 'content', 'videoRenderer', 'reelItemRenderer', 'gridVideoRenderer', 'compactVideoRenderer', 'onTap', 'command'];
      for (const key of keys) {
        if (obj[key] && typeof obj[key] === 'object') {
          const result = search(obj[key], depth + 1);
          if (result) return result;
        }
      }
      return null;
    };

    return search(data);
  }

  function isOverflowButton(element) {
    if (!element || typeof element.matches !== 'function' || !element.matches('button')) {
      return false;
    }

    const label = normalizeMenuText(element.getAttribute && element.getAttribute('aria-label'));
    return label === 'action menu' || label === 'more actions' || label === 'more options';
  }

  function isVisibleElement(element) {
    if (!element || element.hidden || (element.getAttribute && element.getAttribute('aria-hidden') === 'true')) {
      return false;
    }

    if (element.offsetParent) {
      return true;
    }

    if (typeof element.getBoundingClientRect !== 'function') {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function wait(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  function dispatchNativeClick(element) {
    if (!element || typeof element.dispatchEvent !== 'function') return false;

    // YouTube's modern UI components (like ViewModels) often listen for 
    // pointerdown or mousedown instead of just click.
    const eventOptions = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: typeof window !== 'undefined' ? window : null,
      buttons: 1,
    };

    const events = [
      new PointerEvent('pointerdown', { ...eventOptions, pointerType: 'mouse' }),
      new MouseEvent('mousedown', eventOptions),
      new PointerEvent('pointerup', { ...eventOptions, buttons: 0, pointerType: 'mouse' }),
      new MouseEvent('mouseup', { ...eventOptions, buttons: 0 }),
      new MouseEvent('click', { ...eventOptions, buttons: 0 }),
    ];

    events.forEach((ev) => element.dispatchEvent(ev));

    // Also call the native .click() if it exists as a fallback
    if (typeof element.click === 'function') {
      try {
        element.click();
      } catch (e) {
        // Ignore potential errors from native click
      }
    }

    return true;
  }

  function setActionButtonCommand(button, command) {
    if (!button) return;

    button.__ytHoverCommand = command || null;

    if (button.dataset) {
      button.dataset.ytHoverReady = command ? 'true' : 'false';
    }

    if (typeof button.setAttribute === 'function') {
      button.setAttribute('aria-disabled', command ? 'false' : 'true');
    }

    if ('disabled' in button) {
      button.disabled = false;
    }
  }

  return {
    ACTIONS,
    normalizeMenuText,
    getActionLabel,
    getMenuItemEndpoint,
    findMenuItemByAction,
    isOverflowButton,
    isVisibleElement,
    dispatchNativeClick,
    setActionButtonCommand,
    wait,
  };
});
