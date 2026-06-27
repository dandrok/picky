/* eslint-disable @typescript-eslint/no-explicit-any */
import test from 'node:test';
import assert from 'node:assert/strict';

// Mock global chrome
const mockStorage: Record<string, any> = { hideShorts: false, hoverActions: true };
const chromeMock = {
  storage: {
    local: {
      get(defaults: Record<string, any>, callback: (items: Record<string, any>) => void) {
        callback({ ...defaults, ...mockStorage });
      },
      set(values: Record<string, any>, callback?: () => void) {
        for (const key in values) {
          mockStorage[key] = values[key];
        }
        if (callback) callback();
      },
    },
  },
};
(global as any).chrome = chromeMock as any;

// Mock global document
const mockElements: Record<string, any> = {
  hideShortsToggle: {
    checked: false,
    addEventListener(event: string, callback: () => void) {
      assert.equal(event, 'change');
      (this as any).onChange = callback;
    },
  },
  hoverActionsToggle: {
    checked: true,
    addEventListener(event: string, callback: () => void) {
      assert.equal(event, 'change');
      (this as any).onChange = callback;
    },
  },
};

(global as any).document = {
  addEventListener(event: string, callback: () => void) {
    if (event === 'DOMContentLoaded') {
      setTimeout(callback, 0);
    }
  },
  getElementById(id: string) {
    return mockElements[id] || null;
  },
} as any;

test('popup.ts loads and saves settings', async () => {
  await import('../src/popup.js');

  // Wait for DOMContentLoaded trigger
  await new Promise((resolve) => setTimeout(resolve, 10));

  const hideShortsToggle = mockElements.hideShortsToggle;
  const hoverActionsToggle = mockElements.hoverActionsToggle;

  // Check initial load
  assert.equal(hideShortsToggle.checked, false);
  assert.equal(hoverActionsToggle.checked, true);

  // Simulate toggle hideShorts to true
  hideShortsToggle.checked = true;
  hideShortsToggle.onChange();

  // Verify stored in storage
  assert.equal(mockStorage.hideShorts, true);

  // Simulate toggle hoverActions to false
  hoverActionsToggle.checked = false;
  hoverActionsToggle.onChange();

  // Verify stored in storage
  assert.equal(mockStorage.hoverActions, false);
});
