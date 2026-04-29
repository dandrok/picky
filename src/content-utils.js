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

  const DISMISSED_CARD_SELECTOR = [
    'ytd-dismissed-data-renderer',
    '.yt-dismissed-data-renderer',
    'ytd-dismissal-follow-up-renderer',
    '[is-dismissed]',
  ].join(',');

  const UNDO_BUTTON_SELECTOR = [
    'button:not([hidden])',
    '[role="button"]:not([hidden])',
    'tp-yt-paper-button:not([hidden])',
    'ytd-button-renderer:not([hidden])',
    'yt-button-view-model:not([hidden])',
    'a:not([hidden])',
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

  function getButtonClickTarget(item) {
    if (!item || typeof item.querySelector !== 'function') return item || null;
    return item.querySelector('button:not([hidden]), [role="button"]:not([hidden]), a:not([hidden])') || item;
  }

  function findMenuItemByAction(items, action) {
    const item = Array.from(items || []).find((candidate) => textMatchesAction(candidate.textContent, action));
    return getActionClickTarget(item);
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

  function isCardDismissed(card) {
    return Boolean(card && typeof card.querySelector === 'function' && card.querySelector(DISMISSED_CARD_SELECTOR));
  }

  function textMatchesUndo(element) {
    if (!element) return false;

    const values = [
      element.textContent,
      element.getAttribute && element.getAttribute('aria-label'),
      element.getAttribute && element.getAttribute('title'),
    ];

    return values.some((value) => normalizeMenuText(value) === 'undo');
  }

  function isExtensionActionButton(element) {
    return Boolean(
      element &&
      element.classList &&
      typeof element.classList.contains === 'function' &&
      element.classList.contains('yt-hover-actions-button')
    );
  }

  function findUndoButton(container) {
    if (!container || typeof container.querySelectorAll !== 'function') return null;

    const candidates = Array.from(container.querySelectorAll(UNDO_BUTTON_SELECTOR));
    const undoCandidate = candidates.find((candidate) => (
      !isExtensionActionButton(candidate) &&
      textMatchesUndo(candidate) &&
      isVisibleElement(candidate)
    ));

    return getButtonClickTarget(undoCandidate);
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

    const createPointerEvent = (type, options) => {
      if (typeof PointerEvent === 'function') {
        return new PointerEvent(type, { ...options, pointerType: 'mouse' });
      }
      if (typeof MouseEvent === 'function') {
        return new MouseEvent(type, options);
      }
      return { type };
    };

    const createMouseEvent = (type, options) => {
      if (typeof MouseEvent === 'function') {
        return new MouseEvent(type, options);
      }
      return { type };
    };

    const pointerEvents = [
      createPointerEvent('pointerdown', eventOptions),
      createMouseEvent('mousedown', eventOptions),
      createPointerEvent('pointerup', { ...eventOptions, buttons: 0 }),
      createMouseEvent('mouseup', { ...eventOptions, buttons: 0 }),
    ];

    pointerEvents.forEach((ev) => element.dispatchEvent(ev));

    if (typeof element.click === 'function') {
      try {
        element.click();
      } catch (e) {
        // Ignore potential errors from native click
      }
    } else {
      element.dispatchEvent(createMouseEvent('click', { ...eventOptions, buttons: 0 }));
    }

    return true;
  }

  return {
    ACTIONS,
    normalizeMenuText,
    getActionLabel,
    findMenuItemByAction,
    isOverflowButton,
    isVisibleElement,
    isCardDismissed,
    findUndoButton,
    dispatchNativeClick,
    wait,
  };
});
