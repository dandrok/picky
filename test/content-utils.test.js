const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ACTIONS,
  normalizeMenuText,
  getActionLabel,
  getMenuItemEndpoint,
  findMenuItemByAction,
  isOverflowButton,
  isVisibleElement,
  dispatchNativeClick,
  setActionButtonCommand,
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

test('getMenuItemEndpoint returns service endpoint data', () => {
  const endpoint = { feedbackEndpoint: { feedbackToken: 'abc' } };
  const item = { data: { serviceEndpoint: endpoint } };

  assert.equal(getMenuItemEndpoint(item), endpoint);
});

test('getMenuItemEndpoint falls back to navigation endpoint data', () => {
  const endpoint = { signInEndpoint: {} };
  const item = { data: { navigationEndpoint: endpoint } };

  assert.equal(getMenuItemEndpoint(item), endpoint);
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

test('dispatchNativeClick prefers the native click method', () => {
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

  assert.equal(dispatchNativeClick(element, (type) => ({ type })), true);
  assert.deepEqual(eventTypes, []);
  assert.equal(clickCallCount, 1);
});

test('dispatchNativeClick dispatches a click event when click method is unavailable', () => {
  const eventTypes = [];
  const element = {
    dispatchEvent(event) {
      eventTypes.push(event.type);
      return true;
    },
  };

  assert.equal(dispatchNativeClick(element, (type) => ({ type })), true);
  assert.deepEqual(eventTypes, ['click']);
});

test('setActionButtonCommand keeps unavailable action buttons clickable', () => {
  const attributes = {};
  const button = {
    dataset: {},
    disabled: true,
    setAttribute(name, value) {
      attributes[name] = value;
    },
  };

  setActionButtonCommand(button, null);

  assert.equal(button.disabled, false);
  assert.equal(button.dataset.ytHoverReady, 'false');
  assert.equal(attributes['aria-disabled'], 'true');
  assert.equal(button.__ytHoverCommand, null);
});

test('setActionButtonCommand stores ready native commands without disabling the button', () => {
  const command = { endpoint: {}, resolveCommand() {} };
  const attributes = {};
  const button = {
    dataset: {},
    disabled: true,
    setAttribute(name, value) {
      attributes[name] = value;
    },
  };

  setActionButtonCommand(button, command);

  assert.equal(button.disabled, false);
  assert.equal(button.dataset.ytHoverReady, 'true');
  assert.equal(attributes['aria-disabled'], 'false');
  assert.equal(button.__ytHoverCommand, command);
});
