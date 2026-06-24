import * as utils from './content-utils';

function getCurrentDocument(doc?: Document | null): Document | null {
  return doc || (typeof document !== 'undefined' ? document : null);
}

export function findOverflowButton(card: Element | null): Element | null {
  if (!card) return null;
  return Array.from(card.querySelectorAll('button')).find(utils.isOverflowButton) || null;
}

function findFallbackMenuButton(card: Element | null): Element | null {
  if (!card) return null;
  return card.querySelector('button[aria-label*="menu"], yt-icon-button button');
}

function closeOpenMenu(doc?: Document | null): void {
  const currentDocument = getCurrentDocument(doc);
  if (!currentDocument || typeof KeyboardEvent !== 'function') return;

  currentDocument.dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Escape',
    }),
  );
}

function getOpenMenuItems(doc?: Document | null): NodeListOf<Element> | never[] {
  const currentDocument = getCurrentDocument(doc);
  const selector = utils.SELECTORS.MENU_ITEMS;
  return currentDocument ? currentDocument.querySelectorAll(selector) : [];
}

async function openCardMenu(card: Element | null): Promise<boolean> {
  const overflow = findOverflowButton(card);
  const menuButton = overflow || findFallbackMenuButton(card);
  return Boolean(menuButton && utils.dispatchNativeClick(menuButton));
}

export async function performAction(
  card: Element | null,
  action: utils.ActionType,
  doc?: Document | null,
): Promise<boolean> {
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

export async function performUndo(card: Element | null): Promise<boolean> {
  const undoButton = utils.findUndoButton(card);
  if (!undoButton) return false;
  return utils.dispatchNativeClick(undoButton);
}
