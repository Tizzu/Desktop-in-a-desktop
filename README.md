# Desktop in a Desktop

A (shamelessly vibe-coded) Chromium browser extension (Chrome, Brave, Edge…) that replaces the “New Tab” page with a free-form desk: several **spaces** (like tabs), a **drawer bar** at the top holding your tools, and widgets you drag wherever you like. Positions and contents are saved automatically.

Everything stays **on your computer**: no account, no cloud, no network access, no analytics.

## What's inside

50 widgets in six categories:

- **Notes** – sticky note (with drawing), notebook (markdown), to-do, blackboard, goal of the day, journal, flashcards, board
- **Time** – clock, timer, Pomodoro, stopwatch, calendar, world clock, countdown, reminders with notifications, intervals, agenda
- **Numbers** – calculator, converter, counter, expenses, piggy bank, split the bill, progress, water
- **Wellbeing** – habits, breathing, eye break, mood, gratitude, sleep, day streak, plant
- **Links & images** – quick links, search, image, palette, label, frame, container
- **Fun** – dice, bubbles, sounds, 2048, memory, tic-tac-toe, wheel of fortune, rain, fireplace

Quality-of-life touches:

- **Sticky widgets** – bring one widget's edge close to another's and they snap together; from then on they move as one (grab any title bar). Hover the join to reveal a broken-chain button that detaches them. Hold <kbd>Alt</kbd> while dragging to avoid snapping.
- **Container** – a widget that holds other widgets: drop them on it (or drag a tool from the drawer onto it), move the container and they follow, drag them out whenever you like. The ▾ in its bar closes it to a single bar, hiding what's inside; ▸ opens it again exactly as it was. Removing a container puts its widgets back on the desk.
- **Resizing the window** – positions are measured from the centre of the page (where the optional search bar sits), so widgets keep their place relative to it. If the window gets too small, widgets are pushed back into view instead of making the page scroll, and return where they were when it grows again.
- **Backup** – Settings → *Export data* saves everything (all spaces, widgets and settings) to a `.json` file; *Import data* restores it, replacing the current data. *Copy as text* / *Paste from text* do the same through a single line of text you can paste into a chat or an email, no file needed. Handy when moving between computers.

There also a multitude of options for making it more aligned with your idea of a personal workspace.

## Privacy and permissions

The extension only asks for: `storage` (to save your data), `alarms` and `notifications` (timers and reminders while the tab is closed), and `search` (the search bar uses your browser's default search engine). It never reads or changes any website. Data lives in IndexedDB, inside your browser profile.

> Data is not synced between computers and there is no sync feature (use Export/Import to move it): uninstalling the extension or clearing the browser's data deletes it.

See the [privacy policy](PRIVACY.md). The extension collects and transmits no user data (Limited Use of the Chrome Web Store User Data Policy: nothing is sold, shared or used for advertising).

## Install (from source)

Requires Node.js 20+.

```sh
npm install
npm run build        # produces .output/chrome-mv3
```

Then open `chrome://extensions` (or `brave://extensions`), turn on “Developer mode”, choose “Load unpacked” and select `.output/chrome-mv3`.

For development with auto-reload run `npm run dev`. To build a zip you can distribute run `npm run zip`. The package for the Chrome Web Store is `npm run zip:store` (same build without the fixed extension key, since the Store assigns the ID); see [store/LISTING.md](store/LISTING.md) for the listing text and permission justifications.

## Tests

```sh
npm run compile      # type check
npm test             # unit tests (Vitest)
npm run test:e2e     # end-to-end tests in a real browser (Playwright)
```

The e2e tests load the built extension in a real Chromium-based browser. The browser is picked from the ones installed (see `playwright.config.ts`); to choose one, set `E2E_BROWSER=/path/to/browser`.

## Continuous integration and releases

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests: type check, unit tests, build, end-to-end tests, and it keeps the built zip as a workflow artifact.

To publish a release, bump `version` in `package.json`, commit, then push a matching tag:

```sh
git tag v0.2.0 && git push --tags
```

`.github/workflows/release.yml` checks that the tag matches `package.json`, runs the checks and attaches the zip to a new GitHub release.

## Project layout

- `entrypoints/` – the new-tab page and the service worker (notifications)
- `src/core/` – data model, storage, tab sync, physics, themes, translations
- `src/components/` – canvas, drawers, tabs, settings
- `src/widgets/` – one file per widget (registered with `registerWidget`), plus pure logic with its tests
- `e2e/` – browser tests

### Adding a widget

Create `src/widgets/name.tsx`, call `registerWidget({...})` and import it in `src/widgets/index.ts`. Write user-facing text in English through `t('…')` (from `useT()`), and add the Italian translation to `src/core/i18n.it.ts`; a unit test fails if a text has no translation.

### Adding a language

Add it to `LANGUAGES` in `src/core/i18n.ts`, create a table like `src/core/i18n.it.ts`, and register it in `tables`. Missing entries fall back to English.

## License

MIT – see [LICENSE](LICENSE).
