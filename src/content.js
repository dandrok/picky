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

  const ICON_PATHS = {
    NOT_INTERESTED: 'M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31c-1.35 1.06-3.05 1.69-4.9 1.69zm6.31-4.9L7.1 5.69C8.45 4.63 10.15 4 12 4c4.41 0 8 3.59 8 8 0 1.85-.63 3.55-1.69 4.9z',
    DONT_RECOMMEND: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7z',
    SUCCESS: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'
  };

  function createIcon(pathData) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    svg.appendChild(path);
    return svg;
  }

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'yt-hover-actions-overlay';

    const niBtn = document.createElement('button');
    niBtn.className = 'yt-hover-actions-button';
    niBtn.type = 'button';
    niBtn.dataset.action = 'not-interested';
    niBtn.title = 'Not interested';
    niBtn.appendChild(createIcon(ICON_PATHS.NOT_INTERESTED));

    const drcBtn = document.createElement('button');
    drcBtn.className = 'yt-hover-actions-button';
    drcBtn.type = 'button';
    drcBtn.dataset.action = 'dont-recommend-channel';
    drcBtn.title = "Don't recommend channel";
    drcBtn.appendChild(createIcon(ICON_PATHS.DONT_RECOMMEND));

    overlay.appendChild(niBtn);
    overlay.appendChild(drcBtn);

    return overlay;
  }

  function enhance(card) {
    if (card.dataset.ytHoverEnhanced === 'true' || card.querySelector('.yt-hover-actions-overlay')) {
      return;
    }
    
    // Simple nesting check: if a parent is already enhanced, skip this child
    if (card.parentElement?.closest('.yt-hover-actions-card')) {
      return;
    }
    
    // Ensure the container is ready for absolute children
    const style = getComputedStyle(card);
    if (style.position === 'static') {
      card.style.position = 'relative';
    }
    
    card.dataset.ytHoverEnhanced = 'true';
    card.classList.add('yt-hover-actions-card');
    card.appendChild(createOverlay());
    console.log('[YTHover] Enhanced card:', card.tagName);
  }

  async function performAction(card, actionLabel) {
    const overflow = Array.from(card.querySelectorAll('button'))
      .find(utils.isOverflowButton);
    
    if (!overflow) {
      console.warn('[YTHover] No overflow button found on card', card);
      const fallbackBtn = card.querySelector('button[aria-label*="menu"], yt-icon-button button');
      if (fallbackBtn) {
        fallbackBtn.click();
      } else {
        return;
      }
    } else {
      overflow.click();
    }
    
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 50));
      const items = Array.from(document.querySelectorAll('ytd-menu-service-item-renderer, yt-list-item-view-model, tp-yt-paper-item, [role="menuitem"], .ytm-menu-item, .ytListItemViewModelHost'));
      const target = items.find(el => {
        const text = (el.textContent || '').toLowerCase();
        return text.includes(actionLabel.toLowerCase());
      });
      
      if (target) {
        utils.dispatchNativeClick(target);
        return true;
      }
    }
    return false;
  }

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.yt-hover-actions-button');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const card = btn.closest('.yt-hover-actions-card');
    if (!card) return;

    if (btn.dataset.working === 'true') return;
    btn.dataset.working = 'true';

    const originalIcon = btn.querySelector('svg');
    btn.style.opacity = '0.5';
    
    const actionLabel = btn.dataset.action === 'not-interested' ? 'Not interested' : "Don't recommend channel";
    const success = await performAction(card, actionLabel);
    
    if (success) {
      if (originalIcon) originalIcon.remove();
      btn.appendChild(createIcon(ICON_PATHS.SUCCESS));
      btn.classList.add('yt-hover-actions-button-success');
    } else {
      btn.classList.add('yt-hover-actions-button-error');
    }

    setTimeout(() => {
      btn.innerHTML = ''; // Safely clear and restore
      btn.appendChild(originalIcon || createIcon(btn.dataset.action === 'not-interested' ? ICON_PATHS.NOT_INTERESTED : ICON_PATHS.DONT_RECOMMEND));
      btn.classList.remove('yt-hover-actions-button-success', 'yt-hover-actions-button-error');
      btn.style.opacity = '';
      btn.dataset.working = 'false';
    }, 1500);
  }, true);

  const runScan = () => {
    const cards = document.querySelectorAll(CARD_SELECTOR);
    for (let i = 0; i < cards.length; i++) {
      enhance(cards[i]);
    }

    const enhanced = document.querySelectorAll('.yt-hover-actions-card');
    for (let i = 0; i < enhanced.length; i++) {
      const card = enhanced[i];
      const dismissed = card.querySelector('ytd-dismissed-data-renderer, .yt-dismissed-data-renderer, ytd-dismissal-follow-up-renderer, [is-dismissed]');
      if (dismissed) {
        card.classList.add('yt-hover-actions-dismissed');
      } else {
        card.classList.remove('yt-hover-actions-dismissed');
      }
    }
  };

  const observer = new MutationObserver(() => runScan());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  
  setInterval(runScan, 2000);
  runScan();
})();
