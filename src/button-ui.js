(function initButtonUi(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./content-utils'));
  } else {
    root.YTHoverButtonUi = factory(root.YTHoverActionsUtils);
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function createButtonUi(utils) {
  const ICON_PATHS = {
    NOT_INTERESTED: 'M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31c-1.35 1.06-3.05 1.69-4.9 1.69zm6.31-4.9L7.1 5.69C8.45 4.63 10.15 4 12 4c4.41 0 8 3.59 8 8 0 1.85-.63 3.55-1.69 4.9z',
    DONT_RECOMMEND: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7z',
    SUCCESS: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  };

  const BUTTON_STATES = {
    IDLE: 'idle',
    WORKING: 'working',
    SUCCESS: 'success',
    UNDO_WORKING: 'undo-working',
  };

  const ACTION_CONFIG = {
    [utils.ACTIONS.NOT_INTERESTED]: {
      icon: ICON_PATHS.NOT_INTERESTED,
      label: utils.getActionLabel(utils.ACTIONS.NOT_INTERESTED),
    },
    [utils.ACTIONS.DONT_RECOMMEND_CHANNEL]: {
      icon: ICON_PATHS.DONT_RECOMMEND,
      label: utils.getActionLabel(utils.ACTIONS.DONT_RECOMMEND_CHANNEL),
    },
  };

  function getButtonConfig(action) {
    return ACTION_CONFIG[action] || ACTION_CONFIG[utils.ACTIONS.NOT_INTERESTED];
  }

  function isUndoState(state) {
    return state === BUTTON_STATES.SUCCESS || state === BUTTON_STATES.UNDO_WORKING;
  }

  function isWorkingState(state) {
    return state === BUTTON_STATES.WORKING || state === BUTTON_STATES.UNDO_WORKING;
  }

  function getButtonIconPath(action, state) {
    return isUndoState(state) ? ICON_PATHS.SUCCESS : getButtonConfig(action).icon;
  }

  function getButtonLabel(action, state) {
    if (isUndoState(state)) return 'Undo';
    if (state === BUTTON_STATES.WORKING) return `${getButtonConfig(action).label} in progress`;
    return getButtonConfig(action).label;
  }

  function createIcon(doc, pathData) {
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');

    const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    svg.appendChild(path);
    return svg;
  }

  function getButtonDocument(button) {
    return button.ownerDocument || (typeof document !== 'undefined' ? document : null);
  }

  function setButtonState(button, state) {
    if (
      button.dataset.state === state &&
      !button.classList.contains('yt-hover-actions-button-error') &&
      button.querySelector('svg')
    ) {
      return;
    }

    const doc = getButtonDocument(button);
    const isWorking = isWorkingState(state);
    const isSuccess = isUndoState(state);
    const label = getButtonLabel(button.dataset.action, state);

    button.textContent = '';
    button.appendChild(createIcon(doc, getButtonIconPath(button.dataset.action, state)));
    button.classList.toggle('yt-hover-actions-button-success', isSuccess);
    button.classList.remove('yt-hover-actions-button-error');
    button.dataset.state = state;
    button.dataset.working = isWorking ? 'true' : 'false';
    button.style.opacity = isWorking ? '0.5' : '';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-busy', isWorking ? 'true' : 'false');
    button.setAttribute('aria-disabled', isWorking ? 'true' : 'false');
  }

  function createActionButton(doc, action) {
    const button = doc.createElement('button');
    button.className = 'yt-hover-actions-button';
    button.type = 'button';
    button.dataset.action = action;
    setButtonState(button, BUTTON_STATES.IDLE);
    return button;
  }

  function createOverlay(doc) {
    const overlay = doc.createElement('div');
    overlay.className = 'yt-hover-actions-overlay';
    overlay.appendChild(createActionButton(doc, utils.ACTIONS.NOT_INTERESTED));
    overlay.appendChild(createActionButton(doc, utils.ACTIONS.DONT_RECOMMEND_CHANNEL));
    return overlay;
  }

  function setOverlayLocked(overlay, locked) {
    if (!overlay) return;
    if (locked) {
      overlay.dataset.locked = 'true';
    } else {
      delete overlay.dataset.locked;
    }
  }

  function setOverlayPending(overlay, pendingAction) {
    if (!overlay) return;
    overlay.dataset.pendingAction = pendingAction;
    setOverlayLocked(overlay, true);
  }

  function clearOverlayPending(overlay) {
    if (!overlay) return;
    delete overlay.dataset.pendingAction;
    setOverlayLocked(overlay, false);
  }

  function getOverlayButtons(overlay) {
    return Array.from(overlay.querySelectorAll('.yt-hover-actions-button'));
  }

  return {
    BUTTON_STATES,
    createOverlay,
    getButtonIconPath,
    getButtonLabel,
    getOverlayButtons,
    setButtonState,
    setOverlayPending,
    clearOverlayPending,
  };
});
