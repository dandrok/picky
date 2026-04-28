# YouTube Hover Actions

Chrome/Chromium extension that shows `Not interested` and `Don't recommend channel` directly on YouTube video cards when you hover them.

## Install Locally

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this project folder.
5. Open or refresh `https://www.youtube.com`.

## Manual Verification

1. Open the YouTube Home page.
2. Hover a video card that has a three-dot menu.
3. Confirm the gray blurred overlay appears.
4. Click `Not interested`.
5. Confirm YouTube behaves the same as selecting `Not interested` from the native three-dot menu.
6. Refresh YouTube, hover another card, and click `Don't recommend channel`.
7. Confirm YouTube behaves the same as selecting `Don't recommend channel` from the native three-dot menu.
8. Repeat on Search results or another page where video cards have a three-dot menu.

## Notes

The extension reuses YouTube's native menu actions instead of calling private APIs. If YouTube changes menu labels or DOM structure, `src/content-utils.js` and `src/content.js` are the places to update.

Some cards may not expose both actions. In those cases, clicking the overlay action closes the native menu without changing the card.

## Test

```bash
npm test
```
