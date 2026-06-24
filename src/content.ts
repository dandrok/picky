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

    const buttons = buttonUi.getOverlayButtons(overlay);

    if (utils.isCardDismissed(htmlCard)) {
      htmlCard.classList.add('yt-hover-actions-dismissed');
      buttonUi.clearOverlayPending(overlay);
      buttons.forEach((button) => buttonUi.setButtonState(button, buttonUi.BUTTON_STATES.SUCCESS));
      return;
    }

    htmlCard.classList.remove('yt-hover-actions-dismissed');

    if (overlay.dataset.pendingAction) {
      return;
    }

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
    buttonUi.setOverlayPending(overlay, action);
    buttonUi.setButtonState(button, buttonUi.BUTTON_STATES.WORKING);

    if (!(await youtubeActions.performAction(card, action, document))) {
      showTransientError(button, card);
      return;
    }

    await utils.wait(ACTION_SETTLE_DELAY_MS);
    buttonUi.clearOverlayPending(overlay);
    syncCardState(card);
  }

  async function handleButtonClick(event: Event) {
    if (!(event.target instanceof Element)) return;

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

    await handleActionClick(button, card, overlay);
  }

  function scanNewCards() {
    document.querySelectorAll(UNENHANCED_CARD_SELECTOR).forEach(enhanceCard);
  }

  function syncAllCards() {
    document.querySelectorAll('.yt-hover-actions-card').forEach(syncCardState);
  }

  document.addEventListener('click', handleButtonClick, true);

  const debouncedScan = debounce(scanNewCards, 150);
  const observer = new MutationObserver(debouncedScan);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  setInterval(() => {
    scanNewCards();
    syncAllCards();
  }, SCAN_INTERVAL_MS);

  scanNewCards();
})();
