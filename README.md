# YouTube Hover Actions & Picky Settings (v1.1.0)

Chrome and Firefox extension that adds hover-based quick actions to YouTube video cards and provides a control panel to clean up your feed (including hiding YouTube Shorts).

## Features

* **Quick Video Dismissal**: Hover over any YouTube video card to instantly access `Not interested` and `Don't recommend channel` buttons without opening the native three-dot menu.
* **Hide YouTube Shorts**: Toggleable filter to remove Shorts sidebar guides, mini guides, feed shelves, search results, and category filter chips across all localized YouTube UIs. Also automatically redirects direct `/shorts/` page views to the standard `/watch?v=` player formats.
* **Privacy & Access**: Built with a self-contained settings popup that avoids external network calls, uses system fonts, and ensures full keyboard navigation accessibility.

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
3. Load the extension in your browser:
   * **Chrome/Chromium:** Open `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and select the built `dist/chrome` directory.
   * **Firefox:** Open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on...**, and select the built `dist/firefox/manifest.json`.
4. Open or refresh `https://www.youtube.com`.

## Development

The project is written in TypeScript and bundles assets via `tsup` targeting standard ES Modules.

### Scripts

* `npm run build` — Compiles TS, bundles assets, and outputs build targets to `dist/chrome` and `dist/firefox`.
* `npm run pack` — Runs build and packages targets into `releases/` (generating a `.zip` for Chrome and a `.xpi` for Firefox).
* `npm run pack:chrome` — Compiles and zips the Chrome target into `releases/`.
* `npm run pack:firefox` — Compiles and packages the Firefox target into `releases/`.
* `npm run check` — Runs all validations: static type checking, ESLint rules, formatting checks, and unit tests.
* `npm run typecheck` — Runs static type checking.
* `npm test` — Runs unit tests.
* `npm run lint` — Checks code style using ESLint.
* `npm run format` — Formats files with Prettier.

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
10. Click the extension icon in the toolbar, toggle **Hide YouTube Shorts**, and confirm the Shorts guide item, home shelf, and chip filters vanish instantly.
11. Navigate directly to a `/shorts/VIDEO_ID` URL and verify it immediately redirects to `/watch?v=VIDEO_ID`.

## Technical & Architectural Notes

* **World Isolation & Communication**: 
  The extension uses two content scripts to bypass page restrictions and protect extension permissions:
  * `content-isolated.ts` (runs in the `ISOLATED` world): Has access to `chrome.storage.local`. It loads settings and applies them as `data-*` attributes on the `<html>` (`document.documentElement`) node.
  * `content.ts` (runs in the `MAIN` page world): Observes changes to these DOM attributes and runs polymer page enhancement, element-removal, and video navigation redirects.
* **SVG Path Icon Recognition**: Uses locale-independent path matching to hide sidebar links instantly, guaranteeing compatibility with all user language configurations.
* **Asynchronous Element Matching**: Uses requestAnimationFrame queues to identify polymer-backed items (like filter chips) as soon as their internal binding properties are populated by the YouTube client app.
