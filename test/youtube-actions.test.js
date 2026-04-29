const test = require('node:test');
const assert = require('node:assert/strict');

const {
  findOverflowButton,
} = require('../src/youtube-actions');

test('findOverflowButton returns the first YouTube overflow button in a card', () => {
  const normalButton = {
    getAttribute(name) {
      return name === 'aria-label' ? 'Search' : null;
    },
    matches(selector) {
      return selector === 'button';
    },
  };
  const overflowButton = {
    getAttribute(name) {
      return name === 'aria-label' ? 'Action menu' : null;
    },
    matches(selector) {
      return selector === 'button';
    },
  };
  const card = {
    querySelectorAll(selector) {
      return selector === 'button' ? [normalButton, overflowButton] : [];
    },
  };

  assert.equal(findOverflowButton(card), overflowButton);
});

test('findOverflowButton returns null when a card has no overflow button', () => {
  const card = {
    querySelectorAll() {
      return [];
    },
  };

  assert.equal(findOverflowButton(card), null);
});
