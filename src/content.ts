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

    const startTime = Date.now();
    while (utils.isCardDismissed(card) && Date.now() - startTime < 3000) {
      await utils.wait(100);
    }
    await utils.wait(150);

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

    if (
      nativeUndoButton &&
      !utils.isExtensionActionButton(nativeUndoButton) &&
      utils.textMatchesUndo(nativeUndoButton)
    ) {
      isNativeUndo = true;
      targetCard = nativeUndoButton.closest('.yt-hover-actions-card') as HTMLElement;
    } else {
      // Fallback/Diagnostic: If we didn't match the selector, check if we clicked inside a dismissed card
      // and the clicked element's text itself matches "Undo".
      const dismissedCard = event.target.closest(
        '.yt-hover-actions-card.yt-hover-actions-dismissed',
      ) as HTMLElement;
      if (
        dismissedCard &&
        !utils.isExtensionActionButton(event.target) &&
        utils.textMatchesUndo(event.target)
      ) {
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
        buttonUi.setOverlayPending(overlay, 'undo');
        (async () => {
          const startTime = Date.now();
          while (utils.isCardDismissed(targetCard) && Date.now() - startTime < 3000) {
            await utils.wait(100);
          }
          await utils.wait(150);

          overlay.dataset.status = 'idle';
          delete overlay.dataset.clickTime;
          targetCard.classList.remove('yt-hover-actions-dismissed');
          overlay.classList.remove('yt-hover-actions-hidden');
          const buttons = buttonUi.getOverlayButtons(overlay);
          buttonUi.clearOverlayPending(overlay);
          buttons.forEach((btn) => buttonUi.setButtonState(btn, buttonUi.BUTTON_STATES.IDLE));
        })();
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
    if (!isHideShorts) return;

    const path = window.location.pathname;
    const isShortsRoute = path === '/shorts' || path === '/shorts/' || path.startsWith('/shorts/');
    if (!isShortsRoute) return;

    document.querySelectorAll('video').forEach((v) => {
      try {
        v.pause();
      } catch {
        // ignore error
      }
    });

    const parts = path.split('/').filter(Boolean);
    const videoId = parts.length > 1 && parts[0] === 'shorts' ? parts[1] : null;

    if (videoId) {
      window.location.replace(`/watch?v=${encodeURIComponent(videoId)}`);
    } else {
      window.location.replace('/');
    }
  }

  function isShortsChip(chip: Element): boolean {
    const text = chip.textContent?.trim();
    if (text === 'Shorts') {
      return true;
    }

    const rawChip = chip as unknown as Record<string, unknown>;
    const checkUrl = (url: unknown) => typeof url === 'string' && url.includes('shorts');
    const checkBrowseId = (id: unknown) =>
      typeof id === 'string' && (id === 'FEshorts' || id.toLowerCase().includes('shorts'));

    const getNestedValue = (obj: unknown, path: string[]): unknown => {
      let current = obj;
      for (const key of path) {
        if (current && typeof current === 'object') {
          current = (current as Record<string, unknown>)[key];
        } else {
          return undefined;
        }
      }
      return current;
    };

    const directEndpoint = rawChip.navigationEndpoint;
    if (checkUrl(getNestedValue(directEndpoint, ['commandMetadata', 'webCommandMetadata', 'url'])))
      return true;
    if (checkBrowseId(getNestedValue(directEndpoint, ['browseEndpoint', 'browseId']))) return true;

    const data = rawChip.elementData || rawChip.data || rawChip.chip;
    if (data) {
      const dataEndpoint = (data as Record<string, unknown>).navigationEndpoint;
      if (checkUrl(getNestedValue(dataEndpoint, ['commandMetadata', 'webCommandMetadata', 'url'])))
        return true;
      if (checkBrowseId(getNestedValue(dataEndpoint, ['browseEndpoint', 'browseId']))) return true;

      const cr =
        (data as Record<string, unknown>).chipRenderer ||
        (data as Record<string, unknown>).chipRender;
      if (cr) {
        const crEndpoint = (cr as Record<string, unknown>).navigationEndpoint;
        if (checkUrl(getNestedValue(crEndpoint, ['commandMetadata', 'webCommandMetadata', 'url'])))
          return true;
        if (checkBrowseId(getNestedValue(crEndpoint, ['browseEndpoint', 'browseId']))) return true;
      }
    }
    return false;
  }

  const pendingChips = new Set<Element>();
  let isPollingPending = false;

  function hasMetadata(chip: Element): boolean {
    const rawChip = chip as unknown as Record<string, unknown>;
    if (rawChip.navigationEndpoint) return true;
    const data = (rawChip.elementData || rawChip.data || rawChip.chip) as
      | Record<string, unknown>
      | undefined;
    if (data) {
      if (data.navigationEndpoint) return true;
      const cr = (data.chipRenderer || data.chipRender) as Record<string, unknown> | undefined;
      if (cr?.navigationEndpoint) return true;
    }
    return false;
  }

  function checkPendingChips() {
    const isHideShorts = document.documentElement.getAttribute('data-hide-shorts') === 'true';

    pendingChips.forEach((chip) => {
      if (isShortsChip(chip)) {
        (chip as HTMLElement).style.display = isHideShorts ? 'none' : '';
        pendingChips.delete(chip);
      } else if (hasMetadata(chip)) {
        pendingChips.delete(chip);
      }
    });

    if (pendingChips.size > 0) {
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(checkPendingChips);
      } else {
        setTimeout(checkPendingChips, 16);
      }
    } else {
      isPollingPending = false;
    }
  }

  function hideShortsChips() {
    const isHideShorts = document.documentElement.getAttribute('data-hide-shorts') === 'true';
    document.querySelectorAll('yt-chip-cloud-chip-renderer').forEach((chip) => {
      if (isShortsChip(chip)) {
        (chip as HTMLElement).style.display = isHideShorts ? 'none' : '';
      } else if (!hasMetadata(chip)) {
        pendingChips.add(chip);
        if (!isPollingPending) {
          isPollingPending = true;
          if (typeof requestAnimationFrame !== 'undefined') {
            requestAnimationFrame(checkPendingChips);
          } else {
            setTimeout(checkPendingChips, 16);
          }
        }
      } else {
        (chip as HTMLElement).style.display = '';
      }
    });
  }

  function hideShortsTabs() {
    const isHideShorts = document.documentElement.getAttribute('data-hide-shorts') === 'true';

    document.querySelectorAll('yt-tab-shape').forEach((tab) => {
      const rawTab = tab as unknown as Record<string, any>;
      const checkUrl = (url: unknown) =>
        typeof url === 'string' && (url.includes('/shorts') || url.endsWith('/shorts'));

      let isShorts = false;

      const getNestedValue = (obj: any, path: string[]): any => {
        let current = obj;
        for (const key of path) {
          if (current && typeof current === 'object') {
            current = current[key];
          } else {
            return undefined;
          }
        }
        return current;
      };

      const directEndpoint = rawTab.navigationEndpoint || rawTab.endpoint;
      if (directEndpoint) {
        const url = getNestedValue(directEndpoint, [
          'commandMetadata',
          'webCommandMetadata',
          'url',
        ]);
        if (checkUrl(url)) isShorts = true;
      }

      const data = rawTab.elementData || rawTab.data || rawTab.tab;
      if (data) {
        const dataEndpoint = data.navigationEndpoint || data.endpoint;
        if (dataEndpoint) {
          const url = getNestedValue(dataEndpoint, [
            'commandMetadata',
            'webCommandMetadata',
            'url',
          ]);
          if (checkUrl(url)) isShorts = true;
        }
      }

      const tabTitle = tab.getAttribute('tab-title');
      if (tabTitle === 'Shorts') {
        isShorts = true;
      }

      if (isShorts) {
        (tab as HTMLElement).style.display = isHideShorts ? 'none' : '';
      } else {
        (tab as HTMLElement).style.display = '';
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
    hideShortsTabs();
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
    hideShortsTabs();
  }, SCAN_INTERVAL_MS);

  checkShortsRedirect();
  hideShortsChips();
  hideShortsTabs();
  document.addEventListener('yt-navigate-start', checkShortsRedirect);
  document.addEventListener('yt-navigate-finish', checkShortsRedirect);
  window.addEventListener('popstate', checkShortsRedirect);
  scanNewCards();
})();
