(function initYouTubeNativeActions(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./content-utils'));
  } else {
    root.YTHoverYouTubeActions = factory(root.YTHoverActionsUtils);
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function createYouTubeNativeActions(utils) {
  const MENU_ITEM_SELECTOR = [
    'ytd-menu-service-item-renderer',
    'yt-list-item-view-model',
    'tp-yt-paper-item',
    '[role="menuitem"]',
    '.ytm-menu-item',
    '.ytListItemViewModelHost',
  ].join(',');

  function getCurrentDocument(doc) {
    return doc || (typeof document !== 'undefined' ? document : null);
  }

  function findOverflowButton(card) {
    if (!card || typeof card.querySelectorAll !== 'function') return null;
    return Array.from(card.querySelectorAll('button')).find(utils.isOverflowButton) || null;
  }

  function findFallbackMenuButton(card) {
    if (!card || typeof card.querySelector !== 'function') return null;
    return card.querySelector('button[aria-label*="menu"], yt-icon-button button');
  }

  function closeOpenMenu(doc) {
    const currentDocument = getCurrentDocument(doc);
    if (!currentDocument || typeof KeyboardEvent !== 'function') return;

    currentDocument.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Escape',
    }));
  }

  function getOpenMenuItems(doc) {
    const currentDocument = getCurrentDocument(doc);
    return currentDocument ? currentDocument.querySelectorAll(MENU_ITEM_SELECTOR) : [];
  }

  async function openCardMenu(card) {
    const overflow = findOverflowButton(card);
    const menuButton = overflow || findFallbackMenuButton(card);
    return Boolean(menuButton && utils.dispatchNativeClick(menuButton));
  }

  async function performAction(card, action, doc) {
    const currentDocument = getCurrentDocument(doc);
    if (!currentDocument || !(await openCardMenu(card))) return false;

    for (let i = 0; i < 40; i++) {
      await utils.wait(50);
      const target = utils.findMenuItemByAction(getOpenMenuItems(currentDocument), action);

      if (target) {
        utils.dispatchNativeClick(target);
        return true;
      }
    }

    closeOpenMenu(currentDocument);
    return false;
  }

  async function performUndo(card) {
    const undoButton = utils.findUndoButton(card);
    if (!undoButton) return false;
    return utils.dispatchNativeClick(undoButton);
  }

  return {
    findOverflowButton,
    performAction,
    performUndo,
  };
});
