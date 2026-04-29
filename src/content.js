(function initYouTubeHoverActions() {
  const utils = window.YTHoverActionsUtils;
  const buttonUi = window.YTHoverButtonUi;
  const youtubeActions = window.YTHoverYouTubeActions;

  if (!utils || !buttonUi || !youtubeActions) {
    console.error('[YTHover] Required modules not found');
    return;
  }

  if (window.__ytHoverActionsLoaded) return;
  window.__ytHoverActionsLoaded = true;

  const CARD_SELECTORS = [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-compact-video-renderer',
    'ytd-playlist-video-renderer',
    'ytd-reel-item-renderer',
    'yt-lockup-view-model',
    'ytm-video-with-context-renderer',
    'ytd-rich-grid-media',
  ];
  const CARD_SELECTOR = CARD_SELECTORS.join(',');

  const ACTION_SETTLE_DELAY_MS = 800;
  const UNDO_SETTLE_DELAY_MS = 600;
  const ERROR_RESET_DELAY_MS = 1500;
  const SCAN_INTERVAL_MS = 2000;

  function shouldSkipCard(card) {
    return (
      card.dataset.ytHoverEnhanced === 'true' ||
      card.querySelector('.yt-hover-actions-overlay') ||
      card.parentElement?.closest('.yt-hover-actions-card')
    );
  }

  function ensurePositioned(card) {
    if (getComputedStyle(card).position === 'static') {
      card.style.position = 'relative';
    }
  }

  function enhanceCard(card) {
    if (shouldSkipCard(card)) return;

    ensurePositioned(card);
    card.dataset.ytHoverEnhanced = 'true';
    card.classList.add('yt-hover-actions-card');
    card.appendChild(buttonUi.createOverlay(document));
  }

  function syncCardState(card) {
    const overlay = card.querySelector('.yt-hover-actions-overlay');
    if (!overlay) return;

    const buttons = buttonUi.getOverlayButtons(overlay);

    if (utils.isCardDismissed(card)) {
      card.classList.add('yt-hover-actions-dismissed');
      buttonUi.clearOverlayPending(overlay);
      buttons.forEach((button) => buttonUi.setButtonState(button, buttonUi.BUTTON_STATES.SUCCESS));
      return;
    }

    card.classList.remove('yt-hover-actions-dismissed');

    if (overlay.dataset.pendingAction) {
      return;
    }

    buttonUi.clearOverlayPending(overlay);
    buttons.forEach((button) => buttonUi.setButtonState(button, buttonUi.BUTTON_STATES.IDLE));
  }

  function showTransientError(button, card) {
    const overlay = button.closest('.yt-hover-actions-overlay');

    button.classList.add('yt-hover-actions-button-error');
    button.dataset.working = 'false';
    button.style.opacity = '';
    buttonUi.clearOverlayPending(overlay);

    setTimeout(() => {
      button.classList.remove('yt-hover-actions-button-error');
      syncCardState(card);
    }, ERROR_RESET_DELAY_MS);
  }

  async function handleUndoClick(button, card, overlay) {
    buttonUi.setOverlayPending(overlay, 'undo');
    buttonUi.setButtonState(button, buttonUi.BUTTON_STATES.UNDO_WORKING);

    if (!(await youtubeActions.performUndo(card))) {
      showTransientError(button, card);
      return;
    }

    await utils.wait(UNDO_SETTLE_DELAY_MS);
    buttonUi.clearOverlayPending(overlay);
    syncCardState(card);
  }

  async function handleActionClick(button, card, overlay) {
    buttonUi.setOverlayPending(overlay, button.dataset.action);
    buttonUi.setButtonState(button, buttonUi.BUTTON_STATES.WORKING);

    if (!(await youtubeActions.performAction(card, button.dataset.action, document))) {
      showTransientError(button, card);
      return;
    }

    await utils.wait(ACTION_SETTLE_DELAY_MS);
    buttonUi.clearOverlayPending(overlay);
    syncCardState(card);
  }

  async function handleButtonClick(event) {
    if (!(event.target instanceof Element)) return;

    const button = event.target.closest('.yt-hover-actions-button');
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();

    const overlay = button.closest('.yt-hover-actions-overlay');
    const card = button.closest('.yt-hover-actions-card');
    if (!card || !overlay) return;

    if (button.dataset.working === 'true' || overlay.dataset.locked === 'true') {
      return;
    }

    if (button.dataset.state === buttonUi.BUTTON_STATES.SUCCESS) {
      await handleUndoClick(button, card, overlay);
      return;
    }

    await handleActionClick(button, card, overlay);
  }

  function scanCards() {
    document.querySelectorAll(CARD_SELECTOR).forEach(enhanceCard);
    document.querySelectorAll('.yt-hover-actions-card').forEach(syncCardState);
  }

  document.addEventListener('click', handleButtonClick, true);

  const observer = new MutationObserver(scanCards);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  setInterval(scanCards, SCAN_INTERVAL_MS);
  scanCards();
})();
