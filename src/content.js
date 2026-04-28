(function initYouTubeHoverActions() {
  const utils = window.YTHoverActionsUtils;
  if (!utils) {
    console.error('[YTHover] Utils not found!');
    return;
  }
  if (window.__ytHoverActionsLoaded) return;
  window.__ytHoverActionsLoaded = true;

  console.log('[YTHover] Extension starting (Safe DOM mode)...');

  const CARD_SELECTORS = [
    'ytd-rich-item-renderer', 'ytd-video-renderer', 'ytd-grid-video-renderer',
    'ytd-compact-video-renderer', 'ytd-playlist-video-renderer', 'ytd-reel-item-renderer',
    'yt-lockup-view-model', 'ytm-video-with-context-renderer', 'ytd-rich-grid-media'
  ];
  const CARD_SELECTOR = CARD_SELECTORS.join(',');

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'yt-hover-actions-overlay';

    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'yt-hover-actions-native-actions';

    const niBtn = document.createElement('button');
    niBtn.className = 'yt-hover-actions-button';
    niBtn.type = 'button';
    niBtn.dataset.action = 'not-interested';
    niBtn.textContent = 'Not interested';

    const drcBtn = document.createElement('button');
    drcBtn.className = 'yt-hover-actions-button';
    drcBtn.type = 'button';
    drcBtn.dataset.action = 'dont-recommend-channel';
    drcBtn.textContent = "Don't recommend";

    actionsContainer.appendChild(niBtn);
    actionsContainer.appendChild(drcBtn);
    overlay.appendChild(actionsContainer);

    return overlay;
  }

  function enhance(card) {
    if (card.dataset.ytHoverEnhanced === 'true' || card.querySelector('.yt-hover-actions-overlay')) {
      return;
    }
    
    // Some YouTube cards need specific positioning
    const style = getComputedStyle(card);
    if (style.position === 'static') {
      card.style.position = 'relative';
    }
    
    card.dataset.ytHoverEnhanced = 'true';
    card.classList.add('yt-hover-actions-card');
    card.appendChild(createOverlay());
  }

  async function performAction(card, actionLabel) {
    const overflow = Array.from(card.querySelectorAll('button'))
      .find(utils.isOverflowButton);
    
    if (!overflow) {
      console.warn('[YTHover] No overflow button found on card', card);
      // Try to find ANY button that might be a menu button if the standard check fails
      const fallbackBtn = card.querySelector('button[aria-label*="menu"], yt-icon-button button');
      if (fallbackBtn) {
        fallbackBtn.click();
      } else {
        return;
      }
    } else {
      overflow.click();
    }
    
    // 2. Wait for Menu and Find Item
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 50));
      // Look for any menu item that might contain our text
      const items = Array.from(document.querySelectorAll('ytd-menu-service-item-renderer, yt-list-item-view-model, tp-yt-paper-item, [role="menuitem"], .ytm-menu-item, .ytListItemViewModelHost'));
      const target = items.find(el => {
        const text = (el.textContent || '').toLowerCase();
        return text.includes(actionLabel.toLowerCase());
      });
      
      if (target) {
        console.log('[YTHover] Found target menu item:', target.textContent.trim());
        // 3. Click it!
        utils.dispatchNativeClick(target);
        return true;
      }
    }
    console.error('[YTHover] Could not find menu item for:', actionLabel);
    return false;
  }

  // Handle clicks on our custom buttons
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.yt-hover-actions-button');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const card = btn.closest('.yt-hover-actions-card');
    if (!card) return;

    if (btn.dataset.working === 'true') return;
    btn.dataset.working = 'true';

    const originalText = btn.textContent;
    console.log('[YTHover] Action triggered:', originalText);
    btn.style.opacity = '0.5';
    btn.textContent = '...';
    
    const actionLabel = btn.dataset.action === 'not-interested' ? 'Not interested' : "Don't recommend channel";
    const success = await performAction(card, actionLabel);
    
    btn.textContent = success ? 'Done!' : 'Failed';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.opacity = '1';
      btn.dataset.working = 'false';
    }, 1000);
  }, true);

  // Initial scan and observer
  const runScan = () => {
    const cards = document.querySelectorAll(CARD_SELECTOR);
    for (let i = 0; i < cards.length; i++) {
      enhance(cards[i]);
    }
  };

  const observer = new MutationObserver(() => runScan());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  
  // Extra safety: interval scan
  setInterval(runScan, 2000);
  runScan();

  console.log('[YTHover] Extension ready and observing.');
})();
