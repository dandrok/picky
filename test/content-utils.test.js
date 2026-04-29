const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ACTIONS,
  normalizeMenuText,
  getActionLabel,
  findMenuItemByAction,
  isOverflowButton,
  isVisibleElement,
  dispatchNativeClick,
  isCardDismissed,
  findUndoButton,
} = require('../src/content-utils');

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
  ];

  assert.equal(findMenuItemByAction(items, ACTIONS.DONT_RECOMMEND_CHANNEL), items[1]);
});

test('findMenuItemByAction returns menuitem host before nested rows', () => {
  const nestedTarget = { textContent: 'Not interested' };
  const item = {
    tagName: 'YTD-MENU-SERVICE-ITEM-RENDERER',
    textContent: 'Not interested',
    getAttribute(name) {
      return name === 'role' ? 'menuitem' : null;
    },
    querySelector(selector) {
      return selector.includes('tp-yt-paper-item') ? nestedTarget : null;
    },
  };

  assert.equal(findMenuItemByAction([item], ACTIONS.NOT_INTERESTED), item);
});

test('findMenuItemByAction returns nested target for non-menuitem wrappers', () => {
  const nestedTarget = { textContent: 'Not interested' };
  const item = {
    tagName: 'DIV',
    textContent: 'Not interested',
    getAttribute() {
      return null;
    },
    querySelector(selector) {
      return selector.includes('tp-yt-paper-item') ? nestedTarget : null;
    },
  };

  assert.equal(findMenuItemByAction([item], ACTIONS.NOT_INTERESTED), nestedTarget);
});

test('findMenuItemByAction matches target labels inside noisy menu text', () => {
  const item = { textContent: 'Not interested Tell us why' };

  assert.equal(findMenuItemByAction([item], ACTIONS.NOT_INTERESTED), item);
});

test('findMenuItemByAction returns null when the action is missing', () => {
  const items = [{ textContent: 'Share' }];

  assert.equal(findMenuItemByAction(items, ACTIONS.NOT_INTERESTED), null);
});

test('isOverflowButton accepts common YouTube overflow aria labels', () => {
  const button = {
    getAttribute(name) {
      return name === 'aria-label' ? 'Action menu' : null;
    },
    matches(selector) {
      return selector === 'button';
    },
  };

  assert.equal(isOverflowButton(button), true);
});

test('isOverflowButton rejects non-overflow labels', () => {
  const button = {
    getAttribute(name) {
      return name === 'aria-label' ? 'Search' : null;
    },
    matches(selector) {
      return selector === 'button';
    },
  };

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
  };

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
  };

  assert.equal(isVisibleElement(visibleElement), true);
});

test('dispatchNativeClick dispatches native-like events even when browser event constructors are unavailable', () => {
  const eventTypes = [];
  let clickCallCount = 0;
  const element = {
    dispatchEvent(event) {
      eventTypes.push(event.type);
      return true;
    },
    click() {
      clickCallCount += 1;
    },
  };

  assert.equal(dispatchNativeClick(element), true);
  assert.deepEqual(eventTypes, ['pointerdown', 'mousedown', 'pointerup', 'mouseup']);
  assert.equal(clickCallCount, 1);
});

test('dispatchNativeClick dispatches a full mouse sequence when click method is unavailable', () => {
  const eventTypes = [];
  const element = {
    dispatchEvent(event) {
      eventTypes.push(event.type);
      return true;
    },
  };

  assert.equal(dispatchNativeClick(element), true);
  assert.deepEqual(eventTypes, ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']);
});

test('isCardDismissed detects YouTube dismissal markers inside a card', () => {
  const dismissedMarker = {};
  const card = {
    querySelector(selector) {
      return selector.includes('ytd-dismissed-data-renderer') ? dismissedMarker : null;
    },
  };

  assert.equal(isCardDismissed(card), true);
});

test('isCardDismissed returns false when a card has no dismissal markers', () => {
  const card = {
    querySelector() {
      return null;
    },
  };

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
  };
  const undo = {
    textContent: 'Undo',
    offsetParent: {},
    getAttribute() {
      return null;
    },
    getBoundingClientRect() {
      return { width: 48, height: 32 };
    },
  };
  const container = {
    querySelectorAll(selector) {
      return selector.includes('button') ? [share, undo] : [];
    },
  };

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
  };
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
    querySelector(selector) {
      return selector.includes('button') ? nestedButton : null;
    },
  };
  const container = {
    querySelectorAll(selector) {
      return selector.includes('button') ? [wrapper] : [];
    },
  };

  assert.equal(findUndoButton(container), nestedButton);
});

test('findUndoButton ignores extension undo buttons and returns YouTube native undo', () => {
  const extensionButton = {
    textContent: '',
    offsetParent: {},
    classList: {
      contains(className) {
        return className === 'yt-hover-actions-button';
      },
    },
    getAttribute(name) {
      return name === 'aria-label' ? 'Undo' : null;
    },
    getBoundingClientRect() {
      return { width: 36, height: 36 };
    },
  };
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
  };
  const container = {
    querySelectorAll(selector) {
      return selector.includes('button') ? [extensionButton, nativeUndo] : [];
    },
  };

  assert.equal(findUndoButton(container), nativeUndo);
});
