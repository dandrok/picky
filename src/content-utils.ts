export const ACTIONS = {
  NOT_INTERESTED: 'not-interested',
  DONT_RECOMMEND_CHANNEL: 'dont-recommend-channel',
} as const;

export type ActionType = (typeof ACTIONS)[keyof typeof ACTIONS];

export const ACTION_LABELS = {
  [ACTIONS.NOT_INTERESTED]: 'Not interested',
  [ACTIONS.DONT_RECOMMEND_CHANNEL]: "Don't recommend channel",
} as const;

export const SELECTORS = {
  MENU_ITEMS: [
    'ytd-menu-service-item-renderer',
    'yt-list-item-view-model',
    'tp-yt-paper-item',
    '[role="menuitem"]',
    '.ytm-menu-item',
    '.ytListItemViewModelHost',
  ].join(','),

  MENU_ACTION_TARGETS: [
    'yt-list-item-view-model',
    'ytd-menu-service-item-renderer',
    'ytd-menu-navigation-item-renderer',
    'tp-yt-paper-item:not([hidden])',
    '[role="option"]:not([hidden])',
    'a:not([hidden])',
    'button:not([hidden])',
  ].join(','),

  DISMISSED_CARDS: [
    'ytd-dismissed-data-renderer',
    '.yt-dismissed-data-renderer',
    'ytd-dismissal-follow-up-renderer',
    '[is-dismissed]',
  ].join(','),

  UNDO_BUTTONS: [
    'button:not([hidden])',
    '[role="button"]:not([hidden])',
    'tp-yt-paper-button:not([hidden])',
    'ytd-button-renderer:not([hidden])',
    'yt-button-view-model:not([hidden])',
    'a:not([hidden])',
  ].join(','),

  CARDS: [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-compact-video-renderer',
    'ytd-playlist-video-renderer',
    'ytd-reel-item-renderer',
    'yt-lockup-view-model',
    'ytm-video-with-context-renderer',
    'ytd-rich-grid-media',
  ],
} as const;

export function normalizeMenuText(value: string | null): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function getActionLabel(action: ActionType): string {
  return ACTION_LABELS[action] || '';
}

export function textMatchesAction(value: string | null, action: ActionType): boolean {
  const target = normalizeMenuText(getActionLabel(action));
  const text = normalizeMenuText(value);
  return Boolean(target && (text === target || text.includes(target)));
}

export function isMenuItemHost(item: Element | null): boolean {
  if (!item) return false;
  const tagName = normalizeMenuText(item.tagName);
  const role = normalizeMenuText(item.getAttribute?.('role'));

  return (
    role === 'menuitem' ||
    tagName.includes('menu-service-item') ||
    tagName.includes('menu-navigation-item')
  );
}

export function getActionClickTarget(item: Element | null): Element | null {
  if (!item) return null;
  if (typeof item.querySelector !== 'function') return item;
  if (isMenuItemHost(item)) return item;

  return item.querySelector(SELECTORS.MENU_ACTION_TARGETS) || item;
}

export function getButtonClickTarget(item: Element | null): Element | null {
  if (!item) return null;
  if (typeof item.querySelector !== 'function') return item;
  return (
    item.querySelector('button:not([hidden]), [role="button"]:not([hidden]), a:not([hidden])') ||
    item
  );
}

export function getActionFromSvg(element: Element | null, action: ActionType): boolean {
  if (!element || typeof element.querySelectorAll !== 'function') return false;
  const paths = Array.from(element.querySelectorAll('path'));
  for (const path of paths) {
    const d = path.getAttribute('d') || '';
    const normalizedD = d.replace(/[\s,]+/g, '').toLowerCase();

    if (action === ACTIONS.NOT_INTERESTED) {
      if (
        normalizedD.includes('3.7548.393l15.4918.944') ||
        normalizedD.includes('3.754') ||
        normalizedD.includes('8.393') ||
        normalizedD.includes('15.491') ||
        normalizedD.includes('8.944') ||
        (normalizedD.includes('m122c') && normalizedD.includes('l8.46')) ||
        (normalizedD.includes('m122') && normalizedD.includes('5.69'))
      ) {
        return true;
      }
    } else if (action === ACTIONS.DONT_RECOMMEND_CHANNEL) {
      if (
        normalizedD.includes('48h8a110002h8') ||
        normalizedD.includes('48h8') ||
        normalizedD.includes('8h8a1') ||
        normalizedD.includes('511h7') ||
        normalizedD.includes('7v-2h10') ||
        normalizedD.includes('1713h7')
      ) {
        return true;
      }
    }
  }
  return false;
}

export function findMenuItemByAction(
  items: Iterable<Element> | null,
  action: ActionType,
): Element | null {
  const itemArray = Array.from(items || []);

  // 1. Try language-agnostic SVG path matching
  let item = itemArray.find((candidate) => getActionFromSvg(candidate, action));

  // 2. Fall back to text matching
  if (!item) {
    item = itemArray.find((candidate) => textMatchesAction(candidate.textContent, action));
  }

  return getActionClickTarget(item || null);
}

export function isOverflowButton(element: Element | null): boolean {
  if (!element || typeof element.matches !== 'function' || !element.matches('button')) {
    return false;
  }

  // 1. English label matches
  const label = normalizeMenuText(element.getAttribute?.('aria-label'));
  if (label === 'action menu' || label === 'more actions' || label === 'more options') {
    return true;
  }

  // 2. Class/ID checking (language-agnostic)
  const hasMenuClassOrParent =
    (typeof element.closest === 'function' &&
      (element.closest('.dropdown-trigger') ||
        element.closest('ytd-menu-renderer') ||
        element.closest('ytd-menu-button-renderer'))) ||
    (element.classList &&
      typeof element.classList.contains === 'function' &&
      element.classList.contains('media-item-menu-button'));

  if (hasMenuClassOrParent) {
    return true;
  }

  // 3. SVG path check (language-agnostic)
  if (typeof element.querySelectorAll === 'function') {
    const paths = Array.from(element.querySelectorAll('path'));
    for (const path of paths) {
      const d = path.getAttribute('d') || '';
      const normalizedD = d.replace(/[\s,]+/g, '').toLowerCase();
      if (
        normalizedD.includes('128c') ||
        normalizedD.includes('m125a2') ||
        normalizedD.includes('m1216a2') ||
        (normalizedD.match(/a22/g) || []).length === 3 ||
        (normalizedD.match(/a1\.51\.5/g) || []).length === 3
      ) {
        return true;
      }
    }
  }

  return false;
}

export function isVisibleElement(element: Element | null): boolean {
  if (!element) return false;

  const htmlElement = element as HTMLElement;
  if (htmlElement.hidden || element.getAttribute?.('aria-hidden') === 'true') {
    return false;
  }

  if (htmlElement.offsetParent) {
    if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
      const style = window.getComputedStyle(htmlElement);
      if (style.visibility === 'hidden' || style.visibility === 'collapse') {
        return false;
      }
    }
  }

  if (typeof element.getBoundingClientRect !== 'function') {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export function isCardDismissed(card: Element | null): boolean {
  return Boolean(
    card &&
    typeof card.querySelector === 'function' &&
    card.querySelector(SELECTORS.DISMISSED_CARDS),
  );
}

export function textMatchesUndo(element: Element | null): boolean {
  if (!element) return false;

  // 1. English fallback or direct aria-label check
  const values = [
    element.textContent,
    element.getAttribute?.('aria-label'),
    element.getAttribute?.('title'),
  ];
  if (values.some((value) => normalizeMenuText(value) === 'undo')) {
    return true;
  }

  // 2. Class/ID checking (language-agnostic)
  const hasUndoIdOrClass = (el: Element | null): boolean => {
    if (!el) return false;
    const id = el.id || '';
    const className = typeof el.className === 'string' ? el.className : '';
    const ariaLabel = el.getAttribute?.('aria-label') || '';

    return (
      id.toLowerCase().includes('undo') ||
      className.toLowerCase().includes('undo') ||
      ariaLabel.toLowerCase().includes('undo')
    );
  };

  if (
    hasUndoIdOrClass(element) ||
    hasUndoIdOrClass(element.parentElement) ||
    (typeof element.closest === 'function' &&
      (hasUndoIdOrClass(element.closest('ytd-button-renderer')) ||
        hasUndoIdOrClass(element.closest('yt-button-view-model'))))
  ) {
    return true;
  }

  return false;
}

export function isExtensionActionButton(element: Element | null): boolean {
  return Boolean(
    element && element.classList && element.classList.contains('yt-hover-actions-button'),
  );
}

export function findUndoButton(container: Element | null): Element | null {
  if (!container) return null;

  const candidates = Array.from(container.querySelectorAll(SELECTORS.UNDO_BUTTONS));
  const undoCandidate = candidates.find(
    (candidate) =>
      !isExtensionActionButton(candidate) &&
      textMatchesUndo(candidate) &&
      isVisibleElement(candidate),
  );

  return getButtonClickTarget(undoCandidate || null);
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function dispatchNativeClick(element: Element | null): boolean {
  if (!element || typeof element.dispatchEvent !== 'function') return false;

  const eventOptions = {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: typeof window !== 'undefined' ? window : null,
    buttons: 1,
  };

  const createEvent = (type: string, isPointer: boolean, options: PointerEventInit) => {
    if (isPointer && typeof PointerEvent === 'function') {
      return new PointerEvent(type, { ...options, pointerType: 'mouse' });
    }
    if (typeof MouseEvent === 'function') {
      return new MouseEvent(type, options as MouseEventInit);
    }
    if (typeof Event === 'function') {
      return new Event(type, options);
    }
    return { type } as Event;
  };

  const pointerEvents = [
    createEvent('pointerdown', true, eventOptions),
    createEvent('mousedown', false, eventOptions),
    createEvent('pointerup', true, { ...eventOptions, buttons: 0 }),
    createEvent('mouseup', false, { ...eventOptions, buttons: 0 }),
  ];

  pointerEvents.forEach((ev) => element.dispatchEvent(ev));

  const htmlElement = element as HTMLElement;
  if (typeof htmlElement.click === 'function') {
    try {
      htmlElement.click();
    } catch {
      // Ignore potential errors from native click
    }
  } else {
    element.dispatchEvent(createEvent('click', false, { ...eventOptions, buttons: 0 }));
  }

  return true;
}
