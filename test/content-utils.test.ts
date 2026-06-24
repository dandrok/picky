import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTIONS,
  normalizeMenuText,
  getActionLabel,
  findMenuItemByAction,
  isOverflowButton,
  isVisibleElement,
  dispatchNativeClick,
  isCardDismissed,
  findUndoButton,
} from '../src/content-utils';

test('normalizeMenuText collapses whitespace and lowercases labels', () => {
  assert.equal(normalizeMenuText('  Not   Interested  '), 'not interested');
});

test('getActionLabel returns the exact YouTube label for supported actions', () => {
  assert.equal(getActionLabel(ACTIONS.NOT_INTERESTED), 'Not interested');
  assert.equal(getActionLabel(ACTIONS.DONT_RECOMMEND_CHANNEL), "Don't recommend channel");
});

test('findMenuItemByAction finds target item by normalized visible text', () => {
  const items = [
    { textContent: 'Add to queue' },
    { textContent: "  Don't   recommend channel " },
  ] as Element[];

  assert.equal(findMenuItemByAction(items, ACTIONS.DONT_RECOMMEND_CHANNEL), items[1]);
});

test('findMenuItemByAction returns menuitem host before nested rows', () => {
  const nestedTarget = { textContent: 'Not interested' } as Element;
  const item = {
    tagName: 'YTD-MENU-SERVICE-ITEM-RENDERER',
    textContent: 'Not interested',
    getAttribute(name: string) {
      return name === 'role' ? 'menuitem' : null;
    },
    querySelector(selector: string) {
      return selector.includes('tp-yt-paper-item') ? nestedTarget : null;
    },
  } as unknown as Element;

  assert.equal(findMenuItemByAction([item], ACTIONS.NOT_INTERESTED), item);
});

test('findMenuItemByAction returns nested target for non-menuitem wrappers', () => {
  const nestedTarget = { textContent: 'Not interested' } as Element;
  const item = {
    tagName: 'DIV',
    textContent: 'Not interested',
    getAttribute() {
      return null;
    },
    querySelector(selector: string) {
      return selector.includes('tp-yt-paper-item') ? nestedTarget : null;
    },
  } as unknown as Element;

  assert.equal(findMenuItemByAction([item], ACTIONS.NOT_INTERESTED), nestedTarget);
});

test('findMenuItemByAction matches target labels inside noisy menu text', () => {
  const item = { textContent: 'Not interested Tell us why' } as Element;

  assert.equal(findMenuItemByAction([item], ACTIONS.NOT_INTERESTED), item);
});

test('findMenuItemByAction returns null when the action is missing', () => {
  const items = [{ textContent: 'Share' }] as Element[];

  assert.equal(findMenuItemByAction(items, ACTIONS.NOT_INTERESTED), null);
});

test('isOverflowButton accepts common YouTube overflow aria labels', () => {
  const button = {
    getAttribute(name: string) {
      return name === 'aria-label' ? 'Action menu' : null;
    },
    matches(selector: string) {
      return selector === 'button';
    },
  } as unknown as Element;

  assert.equal(isOverflowButton(button), true);
});

test('isOverflowButton rejects non-overflow labels', () => {
  const button = {
    getAttribute(name: string) {
      return name === 'aria-label' ? 'Search' : null;
    },
    matches(selector: string) {
      return selector === 'button';
    },
  } as unknown as Element;

  assert.equal(isOverflowButton(button), false);
});

test('isVisibleElement rejects hidden elements', () => {
  const hiddenElement = {
    hidden: true,
    getAttribute() {
      return null;
    },
    getBoundingClientRect() {
      return { width: 200, height: 100 };
    },
  } as unknown as Element;

  assert.equal(isVisibleElement(hiddenElement), false);
});

test('isVisibleElement accepts laid out elements even when opacity is zero', () => {
  const visibleElement = {
    hidden: false,
    offsetParent: {},
    getAttribute() {
      return null;
    },
    getBoundingClientRect() {
      return { width: 200, height: 100 };
    },
  } as unknown as Element;

  assert.equal(isVisibleElement(visibleElement), true);
});

test('isVisibleElement rejects elements with visibility: hidden computed style', () => {
  const hiddenElement = {
    hidden: false,
    offsetParent: {},
    getAttribute() {
      return null;
    },
    getBoundingClientRect() {
      return { width: 200, height: 100 };
    },
  } as unknown as Element;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalWindow = (globalThis as any).window;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window = {
    getComputedStyle() {
      return { visibility: 'hidden' } as unknown as CSSStyleDeclaration;
    },
  };

  try {
    assert.equal(isVisibleElement(hiddenElement), false);
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = originalWindow;
  }
});

test('dispatchNativeClick dispatches native-like events even when browser event constructors are unavailable', () => {
  const eventTypes: string[] = [];
  const events: Event[] = [];
  let clickCallCount = 0;
  const element = {
    dispatchEvent(event: Event) {
      eventTypes.push(event.type);
      events.push(event);
      return true;
    },
    click() {
      clickCallCount += 1;
    },
  } as unknown as Element;

  assert.equal(dispatchNativeClick(element), true);
  assert.deepEqual(eventTypes, ['pointerdown', 'mousedown', 'pointerup', 'mouseup']);
  assert.equal(clickCallCount, 1);
  events.forEach((ev) => {
    assert.ok(ev instanceof Event);
  });
});

test('dispatchNativeClick dispatches a full mouse sequence when click method is unavailable', () => {
  const eventTypes: string[] = [];
  const element = {
    dispatchEvent(event: Event) {
      eventTypes.push(event.type);
      return true;
    },
  } as unknown as Element;

  assert.equal(dispatchNativeClick(element), true);
  assert.deepEqual(eventTypes, ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']);
});

test('isCardDismissed detects YouTube dismissal markers inside a card', () => {
  const dismissedMarker = {} as Element;
  const card = {
    querySelector(selector: string) {
      return selector.includes('ytd-dismissed-data-renderer') ? dismissedMarker : null;
    },
  } as unknown as Element;

  assert.equal(isCardDismissed(card), true);
});

test('isCardDismissed returns false when a card has no dismissal markers', () => {
  const card = {
    querySelector() {
      return null;
    },
  } as unknown as Element;

  assert.equal(isCardDismissed(card), false);
});

test('findUndoButton finds a visible native undo button by text', () => {
  const share = {
    textContent: 'Share',
    offsetParent: {},
    getAttribute() {
      return null;
    },
    getBoundingClientRect() {
      return { width: 48, height: 32 };
    },
  } as unknown as Element;
  const undo = {
    textContent: 'Undo',
    offsetParent: {},
    getAttribute() {
      return null;
    },
    getBoundingClientRect() {
      return { width: 48, height: 32 };
    },
  } as unknown as Element;
  const container = {
    querySelectorAll(selector: string) {
      return selector.includes('button') ? [share, undo] : [];
    },
  } as unknown as Element;

  assert.equal(findUndoButton(container), undo);
});

test('findUndoButton returns a nested clickable target for renderer wrappers', () => {
  const nestedButton = {
    textContent: 'Undo',
    offsetParent: {},
    getAttribute() {
      return null;
    },
    getBoundingClientRect() {
      return { width: 48, height: 32 };
    },
  } as unknown as Element;
  const wrapper = {
    tagName: 'YTD-BUTTON-RENDERER',
    textContent: 'Undo',
    offsetParent: {},
    getAttribute() {
      return null;
    },
    getBoundingClientRect() {
      return { width: 48, height: 32 };
    },
    querySelector(selector: string) {
      return selector.includes('button') ? nestedButton : null;
    },
  } as unknown as Element;
  const container = {
    querySelectorAll(selector: string) {
      return selector.includes('button') ? [wrapper] : [];
    },
  } as unknown as Element;

  assert.equal(findUndoButton(container), nestedButton);
});

test('findUndoButton ignores extension undo buttons and returns YouTube native undo', () => {
  const extensionButton = {
    textContent: '',
    offsetParent: {},
    classList: {
      contains(className: string) {
        return className === 'yt-hover-actions-button';
      },
    },
    getAttribute(name: string) {
      return name === 'aria-label' ? 'Undo' : null;
    },
    getBoundingClientRect() {
      return { width: 36, height: 36 };
    },
  } as unknown as Element;
  const nativeUndo = {
    textContent: 'Undo',
    offsetParent: {},
    classList: {
      contains() {
        return false;
      },
    },
    getAttribute() {
      return null;
    },
    getBoundingClientRect() {
      return { width: 48, height: 32 };
    },
  } as unknown as Element;
  const container = {
    querySelectorAll(selector: string) {
      return selector.includes('button') ? [extensionButton, nativeUndo] : [];
    },
  } as unknown as Element;

  assert.equal(findUndoButton(container), nativeUndo);
});
