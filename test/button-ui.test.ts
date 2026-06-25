import test from 'node:test';
import assert from 'node:assert/strict';

import { ACTIONS } from '../src/content-utils';
import { BUTTON_STATES, getButtonIconPath, getButtonLabel } from '../src/button-ui';

test('getButtonLabel describes normal action buttons', () => {
  assert.equal(getButtonLabel(ACTIONS.NOT_INTERESTED, BUTTON_STATES.IDLE), 'Not interested');
  assert.equal(
    getButtonLabel(ACTIONS.DONT_RECOMMEND_CHANNEL, BUTTON_STATES.IDLE),
    "Don't recommend channel",
  );
});

test('getButtonLabel describes success buttons as undo controls', () => {
  assert.equal(getButtonLabel(ACTIONS.NOT_INTERESTED, BUTTON_STATES.SUCCESS), 'Undo');
  assert.equal(getButtonLabel(ACTIONS.DONT_RECOMMEND_CHANNEL, BUTTON_STATES.UNDO_WORKING), 'Undo');
});

test('getButtonIconPath uses the success icon for undo states', () => {
  assert.equal(
    getButtonIconPath(ACTIONS.NOT_INTERESTED, BUTTON_STATES.SUCCESS),
    getButtonIconPath(ACTIONS.DONT_RECOMMEND_CHANNEL, BUTTON_STATES.UNDO_WORKING),
  );
  assert.notEqual(
    getButtonIconPath(ACTIONS.NOT_INTERESTED, BUTTON_STATES.IDLE),
    getButtonIconPath(ACTIONS.NOT_INTERESTED, BUTTON_STATES.SUCCESS),
  );
});
