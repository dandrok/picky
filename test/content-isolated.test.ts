/* eslint-disable @typescript-eslint/no-explicit-any */
import test, { before } from 'node:test';
import assert from 'node:assert/strict';

// Mock global chrome
const mockStorage: Record<string, any> = { hideShorts: true, hoverActions: false };
const listeners: Array<(changes: Record<string, any>, namespace: string) => void> = [];

const chromeMock = {
  storage: {
    local: {
      get(defaults: Record<string, any>, callback: (items: Record<string, any>) => void) {
        const result = { ...defaults };
        for (const key in defaults) {
          if (mockStorage[key] !== undefined) {
            result[key] = mockStorage[key];
          }
        }
        callback(result);
      },
      set(values: Record<string, any>, callback?: () => void) {
        for (const key in values) {
          mockStorage[key] = values[key];
        }
        if (callback) callback();
      },
    },
    onChanged: {
      addListener(listener: any) {
        listeners.push(listener);
      },
    },
  },
};

(global as any).chrome = chromeMock as any;

// Mock global document
const mockAttributes = new Map<string, string>();
const docElementMock = {
  setAttribute(name: string, value: string) {
    mockAttributes.set(name, value);
  },
  removeAttribute(name: string) {
    mockAttributes.delete(name);
  },
  getAttribute(name: string) {
    return mockAttributes.get(name) || null;
  },
};

(global as any).document = {
  documentElement: docElementMock,
} as any;

before(async () => {
  // Import the file to execute the code once before any tests run
  await import('../src/content-isolated');
});

test('content-isolated sets initial attributes from chrome storage', () => {
  // Verify that attributes are set correctly based on mockStorage initial state
  // hideShorts is true => should set 'data-hide-shorts'
  assert.equal(docElementMock.getAttribute('data-hide-shorts'), 'true');

  // hoverActions is false => should set 'data-disable-hover-actions'
  assert.equal(docElementMock.getAttribute('data-disable-hover-actions'), 'true');
});

test('content-isolated reacts to chrome storage changes', async () => {
  // Trigger a change listener to turn off hideShorts and turn on hoverActions
  const changeListener = listeners[0];
  assert.ok(changeListener);

  changeListener(
    {
      hideShorts: { oldValue: true, newValue: false },
      hoverActions: { oldValue: false, newValue: true },
    },
    'local',
  );

  // Check attributes are updated/removed
  assert.equal(docElementMock.getAttribute('data-hide-shorts'), null);
  assert.equal(docElementMock.getAttribute('data-disable-hover-actions'), null);
});
