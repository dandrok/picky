import './content.css';
import * as utils from './content-utils';
import * as buttonUi from './button-ui';
import * as youtubeActions from './youtube-actions';

(function initYouTubeHoverActions() {
  const win = window as unknown as { __ytHoverActionsLoaded?: boolean };
  if (win.__ytHoverActionsLoaded) return;
  win.__ytHoverActionsLoaded = true;

  const UNENHANCED_CARD_SELECTOR = utils.SELECTORS.CARDS.map(
    (s) => `${s}:not([data-yt-hover-enhanced="true"])`,
  ).join(',');

  const ACTION_SETTLE_DELAY_MS = 800;
  const UNDO_SETTLE_DELAY_MS = 600;
  const ERROR_RESET_DELAY_MS = 1500;
  const SCAN_INTERVAL_MS = 2000;
  let isMenuActionInProgress = false;

  function debounce<T extends (...args: never[]) => void>(func: T, wait: number) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    return function executedFunction(...args: Parameters<T>) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function shouldSkipCard(card: HTMLElement) {
    return (
      card.querySelector('.yt-hover-actions-overlay') ||
      card.parentElement?.closest('.yt-hover-actions-card')
    );
  }

  function ensurePositioned(card: HTMLElement) {
    if (getComputedStyle(card).position === 'static') {
      card.style.position = 'relative';
    }
  }

  function enhanceCard(card: Element) {
    const htmlCard = card as HTMLElement;
    if (shouldSkipCard(htmlCard)) return;

    ensurePositioned(htmlCard);
    htmlCard.dataset.ytHoverEnhanced = 'true';
    htmlCard.classList.add('yt-hover-actions-card');
    htmlCard.appendChild(buttonUi.createOverlay(document));
    syncCardState(htmlCard);
  }

  function syncCardState(card: Element) {
    const htmlCard = card as HTMLElement;
    const overlay = htmlCard.querySelector('.yt-hover-actions-overlay') as HTMLElement;
    if (!overlay) return;

    if (overlay.dataset.pendingAction) {
      return;
    }

    const status = overlay.dataset.status || 'idle';
    const isDismissed = utils.isCardDismissed(htmlCard);

    if (isDismissed) {
      overlay.dataset.status = 'dismissed';
      htmlCard.classList.add('yt-hover-actions-dismissed');
      overlay.classList.add('yt-hover-actions-hidden');

      const buttons = buttonUi.getOverlayButtons(overlay);
      buttonUi.clearOverlayPending(overlay);
      buttons.forEach((button) => buttonUi.setButtonState(button, buttonUi.BUTTON_STATES.SUCCESS));
      return;
    }

    if (status === 'dismissed') {
      overlay.dataset.status = 'idle';
      htmlCard.classList.remove('yt-hover-actions-dismissed');
      overlay.classList.remove('yt-hover-actions-hidden');

      const buttons = buttonUi.getOverlayButtons(overlay);
      buttonUi.clearOverlayPending(overlay);
      buttons.forEach((button) => buttonUi.setButtonState(button, buttonUi.BUTTON_STATES.IDLE));
      return;
    }

    if (status === 'clicked') {
      const clickTime = parseInt(overlay.dataset.clickTime || '0', 10);
      if (Date.now() - clickTime < 5000) {
        overlay.classList.add('yt-hover-actions-hidden');
        return;
      }
    }

    // Reset to idle
    overlay.dataset.status = 'idle';
    delete overlay.dataset.clickTime;
    htmlCard.classList.remove('yt-hover-actions-dismissed');
    overlay.classList.remove('yt-hover-actions-hidden');

    const buttons = buttonUi.getOverlayButtons(overlay);
    buttonUi.clearOverlayPending(overlay);
    buttons.forEach((button) => buttonUi.setButtonState(button, buttonUi.BUTTON_STATES.IDLE));
  }

  function showTransientError(button: HTMLElement, card: HTMLElement) {
    const overlay = button.closest('.yt-hover-actions-overlay') as HTMLElement;

    button.classList.add('yt-hover-actions-button-error');
    button.dataset.working = 'false';
    button.style.opacity = '';
    buttonUi.clearOverlayPending(overlay);

    setTimeout(() => {
      button.classList.remove('yt-hover-actions-button-error');
      syncCardState(card);
    }, ERROR_RESET_DELAY_MS);
  }

  async function handleUndoClick(button: HTMLElement, card: HTMLElement, overlay: HTMLElement) {
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

  async function handleActionClick(button: HTMLElement, card: HTMLElement, overlay: HTMLElement) {
    const action = button.dataset.action as utils.ActionType;
    overlay.classList.add('yt-hover-actions-hidden');
    overlay.dataset.status = 'clicked';
    overlay.dataset.clickTime = Date.now().toString();
    buttonUi.setOverlayPending(overlay, action);
    buttonUi.setButtonState(button, buttonUi.BUTTON_STATES.WORKING);

    isMenuActionInProgress = true;
    let success = false;
    try {
      success = await youtubeActions.performAction(card, action, document);
    } catch {
      // ignore
    } finally {
      isMenuActionInProgress = false;
    }

    if (!success) {
      overlay.classList.remove('yt-hover-actions-hidden');
      delete overlay.dataset.status;
      delete overlay.dataset.clickTime;
      showTransientError(button, card);
      return;
    }

    await utils.wait(ACTION_SETTLE_DELAY_MS);
    buttonUi.clearOverlayPending(overlay);
    syncCardState(card);
  }

  async function handleButtonClick(event: Event) {
    if (!(event.target instanceof Element)) return;

    // Find the closest native button-like element that matches YouTube's Undo button criteria
    const nativeUndoButton = event.target.closest(
      'button, [role="button"], tp-yt-paper-button, ytd-button-renderer, yt-button-view-model',
    );

    let isNativeUndo = false;
    let targetCard: HTMLElement | null = null;

    if (nativeUndoButton && utils.textMatchesUndo(nativeUndoButton)) {
      isNativeUndo = true;
      targetCard = nativeUndoButton.closest('.yt-hover-actions-card') as HTMLElement;
    } else {
      // Fallback/Diagnostic: If we didn't match the selector, check if we clicked inside a dismissed card
      // and the clicked element's text itself matches "Undo".
      const dismissedCard = event.target.closest(
        '.yt-hover-actions-card.yt-hover-actions-dismissed',
      ) as HTMLElement;
      if (dismissedCard && utils.textMatchesUndo(event.target)) {
        console.warn(
          '[YouTube Hover Actions] Possible DOM structure change detected. ' +
            'Native Undo clicked but not matched by button selector.',
          event.target,
        );
        isNativeUndo = true;
        targetCard = dismissedCard;
      }
    }

    if (isNativeUndo && targetCard) {
      const overlay = targetCard.querySelector('.yt-hover-actions-overlay') as HTMLElement;
      if (overlay) {
        overlay.dataset.status = 'idle';
        delete overlay.dataset.clickTime;
        targetCard.classList.remove('yt-hover-actions-dismissed');
        overlay.classList.remove('yt-hover-actions-hidden');
        const buttons = buttonUi.getOverlayButtons(overlay);
        buttonUi.clearOverlayPending(overlay);
        buttons.forEach((btn) => buttonUi.setButtonState(btn, buttonUi.BUTTON_STATES.IDLE));
      }
      return;
    }

    const button = event.target.closest('.yt-hover-actions-button') as HTMLElement;
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();

    const overlay = button.closest('.yt-hover-actions-overlay') as HTMLElement;
    const card = button.closest('.yt-hover-actions-card') as HTMLElement;
    if (!card || !overlay) return;

    if (buttonUi.isButtonWorking(button) || buttonUi.isOverlayLocked(overlay)) {
      return;
    }

    if (buttonUi.isButtonSuccess(button)) {
      await handleUndoClick(button, card, overlay);
      return;
    }

    if (isMenuActionInProgress) {
      return;
    }

    await handleActionClick(button, card, overlay);
  }

  function checkShortsRedirect() {
    const isHideShorts = document.documentElement.getAttribute('data-hide-shorts') === 'true';
    if (isHideShorts && window.location.pathname.startsWith('/shorts')) {
      document.querySelectorAll('video').forEach((v) => {
        try {
          v.pause();
        } catch {
          // ignore error
        }
      });

      const parts = window.location.pathname.split('/');
      const shortsIdx = parts.indexOf('shorts');
      const videoId = shortsIdx !== -1 ? parts[shortsIdx + 1] : null;

      if (videoId && videoId.length > 2) {
        window.location.replace(`/watch?v=${videoId}`);
      } else {
        window.location.replace('/');
      }
    }
  }

  function hideShortsChips() {
    const isHideShorts = document.documentElement.getAttribute('data-hide-shorts') === 'true';
    document.querySelectorAll('yt-chip-cloud-chip-renderer').forEach((chip) => {
      const text = chip.textContent?.trim();
      if (text === 'Shorts') {
        (chip as HTMLElement).style.display = isHideShorts ? 'none' : '';
      }
    });
  }

  function scanNewCards() {
    document.querySelectorAll(UNENHANCED_CARD_SELECTOR).forEach(enhanceCard);
  }

  function syncAllCards() {
    document.querySelectorAll('.yt-hover-actions-card').forEach(syncCardState);
  }

  document.addEventListener('click', handleButtonClick, true);

  const debouncedScan = debounce(scanNewCards, 150);
  const observer = new MutationObserver((mutations) => {
    hideShortsChips();
    checkShortsRedirect();

    const hasChildChanges = mutations.some((m) => m.type === 'childList');
    if (hasChildChanges) {
      debouncedScan();
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-hide-shorts'],
  });

  setInterval(() => {
    checkShortsRedirect();
    scanNewCards();
    syncAllCards();
    hideShortsChips();
  }, SCAN_INTERVAL_MS);

  checkShortsRedirect();
  hideShortsChips();
  document.addEventListener('yt-navigate-start', checkShortsRedirect);
  document.addEventListener('yt-navigate-finish', checkShortsRedirect);
  window.addEventListener('popstate', checkShortsRedirect);
  scanNewCards();
})();
