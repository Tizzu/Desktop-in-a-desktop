# Desktop in a Desktop

A Chromium browser extension (Chrome, Brave, Edge…) that replaces the “New Tab” page with a free-form desk: several **spaces** (like tabs), a **drawer bar** at the top holding your tools, and widgets you drag wherever you like. Positions and contents are saved automatically.

Everything stays **on your computer**: no account, no cloud, no network access, no analytics.

## What's inside

49 widgets in six categories:

- **Notes** – sticky note (with drawing), notebook (markdown), to-do, blackboard, goal of the day, journal, flashcards, board
- **Time** – clock, timer, Pomodoro, stopwatch, calendar, world clock, countdown, reminders with notifications, intervals, agenda
- **Numbers** – calculator, converter, counter, expenses, piggy bank, split the bill, progress, water
- **Wellbeing** – habits, breathing, eye break, mood, gratitude, sleep, day streak, plant
- **Links & images** – quick links, search, image, palette, label, frame
- **Fun** – dice, bubbles, sounds, 2048, memory, tic-tac-toe, wheel of fortune, rain, fireplace

You can fidget with the widgets by throwing them around, a slight random tilt (optional), drawers by category (optional), an optional fixed search bar in the centre, and you can personalise it with six colour themes.

## Privacy and permissions

The extension only asks for: `storage` (to save your data), `alarms` and `notifications` (timers and reminders while the tab is closed), and `search` (the search bar uses your browser's default search engine). It never reads or changes any website. Data lives in IndexedDB, inside your browser profile.

> Data is not synced between computers and there is **no export/import yet**: uninstalling the extension or clearing the browser's data deletes it.

## Install (from source)

Requires Node.js 20+.

```sh
npm install
npm run build        # produces .output/chrome-mv3
```

Then open `chrome://extensions` (or `brave://extensions`), turn on “Developer mode”, choose “Load unpacked” and select `.output/chrome-mv3`.

For development with auto-reload run `npm run dev`. To build a zip you can distribute run `npm run zip`.

## Tests

```sh
npm run compile      # type check
npm test             # unit tests (Vitest)
npm run test:e2e     # end-to-end tests in a real browser (Playwright)
```

The e2e tests load the built extension in a real Chromium-based browser. The browser is picked from the ones installed (see `playwright.config.ts`); to choose one, set `E2E_BROWSER=/path/to/browser`.

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
