import test from 'node:test';
import assert from 'node:assert/strict';

import { findOverflowButton } from '../src/youtube-actions';

test('findOverflowButton returns the first YouTube overflow button in a card', () => {
  const normalButton = {
    getAttribute(name: string) {
      return name === 'aria-label' ? 'Search' : null;
    },
    matches(selector: string) {
      return selector === 'button';
    },
  } as unknown as Element;
  const overflowButton = {
    getAttribute(name: string) {
      return name === 'aria-label' ? 'Action menu' : null;
    },
    matches(selector: string) {
      return selector === 'button';
    },
  } as unknown as Element;
  const card = {
    querySelectorAll(selector: string) {
      return selector === 'button' ? [normalButton, overflowButton] : [];
    },
  } as unknown as Element;

  assert.equal(findOverflowButton(card), overflowButton);
});

test('findOverflowButton returns null when a card has no overflow button', () => {
  const card = {
    querySelectorAll() {
      return [];
    },
  } as unknown as Element;

  assert.equal(findOverflowButton(card), null);
});
