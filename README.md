# YouTube Hover Actions (v1.0.1)

Chrome/Chromium extension that shows `Not interested` and `Don't recommend channel` directly on YouTube video cards when you hover them.

## Install From Chrome Web Store

Install the published extension from the Chrome Web Store:
https://chromewebstore.google.com/detail/youtube-hover-actions/jlljlpnhadllcnbajpmgcpjobmfekjhh

## Install Locally

1. Clone this repository.
2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```
3. Open `chrome://extensions/`.
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the built `dist` folder.
6. Open or refresh `https://www.youtube.com`.

## Development

The project is written in TypeScript and bundles assets via `tsup`.

### Scripts

- `npm run build` — Compiles TS, bundles assets, and outputs to the `dist` directory.
- `npm run typecheck` — Runs static type checking.
- `npm test` — Runs unit tests.
- `npm run lint` — Checks code style using ESLint.
- `npm run format` — Formats files with Prettier.

### CI/CD

A GitHub Actions pipeline (`.github/workflows/cl.yml`) automatically checks formatting, lints, builds, and runs unit tests on every push and pull request to the `main` branch.

## Manual Verification

1. Open the YouTube Home page.
2. Hover a video card that has a three-dot menu.
3. Confirm the gray blurred overlay appears.
4. Click `Not interested`.
5. Confirm YouTube behaves the same as selecting `Not interested` from the native three-dot menu, and the extension buttons switch to green `Undo` controls.
6. Click YouTube's native `Undo` button and confirm both extension buttons return to their normal icons.
7. Click `Don't recommend channel` on another card.
8. Confirm the green extension `Undo` button triggers YouTube's native undo and resets both extension buttons.
9. Use keyboard focus to tab to the extension buttons and confirm the overlay is visible and each button has a clear focus outline.
10. Repeat on Search results or another page where video cards have a three-dot menu.

## Technical Notes

The extension reuses YouTube's native menu actions instead of calling private APIs. If YouTube changes menu labels or DOM structure, update `src/content-utils.ts` and `src/content.ts`.

Some cards may not expose both actions. In those cases, clicking the overlay action closes the native menu without changing the card.

