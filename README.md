# Desktop in a Desktop

A (shamelessly vibe-coded) Chromium browser extension (Chrome, Brave, Edge…) that replaces the “New Tab” page with a free-form desk: several **spaces** (like tabs), a **drawer bar** at the top holding your tools, and widgets you drag wherever you like. Positions and contents are saved automatically.

Everything stays **on your computer**: no account, no cloud, no network access, no analytics.

## What's inside

50 widgets in seven categories:

- **Notes** – sticky note (with drawing), notebook (markdown with a formatting toolbar), to-do, blackboard, goal of the day, journal, flashcards, board, snippets (one-click copy)
- **Time** – clock, timer, focus timer (Pomodoro-style, with your own phase lengths and optional auto-start), stopwatch, calendar, world clock, countdown (with a “time left” view of the day, week, month and year), reminders with notifications, intervals, agenda (24 hours, half-hour slots)
- **Numbers** – calculator, converter, counter, expenses, piggy bank, split the bill, progress, water
- **Wellbeing** – habits, breathing, eye break, mood, gratitude, sleep, day streak, plant
- **Links & images** – quick links, search, image, palette
- **Layout** – label, container (widgets that only help organise the desk)
- **Fun** – dice and coin, bubbles, sounds, 2048, memory, tic-tac-toe, lucky wheel, rain, fireplace

Quality-of-life touches:

- **Sticky widgets** – bring one widget's edge close to another's and they snap together; from then on they move as one (grab any title bar). Hover the join to reveal a broken-chain button that detaches them. Hold <kbd>Alt</kbd> while dragging to avoid snapping.
- **Container** – a widget that holds other widgets: drop them on it (or drag a tool from the drawer onto it), move the container and they follow, drag them out whenever you like. You can rename it (✎ or double-click the title) to label your containers, and the ▾ in its bar closes it to a single bar, hiding what's inside; ▸ opens it again exactly as it was. Removing a container puts its widgets back on the desk.
- **Resizing the window** – positions are measured from the centre of the page (where the optional search bar sits), so widgets keep their place relative to it. If the window gets too small, widgets are pushed back into view instead of making the page scroll, and return where they were when it grows again.
- **Calm timer sounds** – a soft bell when a timer ends (Settings → *Timer sounds* turns it off).
- **Changelog** – after an update a short "What's new" window opens once, showing what changed since your last visit (older versions are one click away). Reopen it from Settings → About.
- **Safe removal** – diaries, trackers and counters that already hold entries ask for confirmation before the × removes them.
- **Stuck widgets, refined** – resizing a widget keeps the ones attached to its right and bottom edges attached (they follow, with everything stuck to them, as long as they fit in the window; a side that becomes too short lets go). Stacked containers act like an accordion: opening one pushes the ones below it down, closing it pulls them back. Hold <kbd>Shift</kbd> while dragging a stuck widget to slide it along its edge, snapping to line up with its neighbour, without detaching it.
- **Focus timer reset** – the ↺ button starts over (sessions counted, phase, running timer), and every new day it starts over by itself (turn it off in the timer's ⚙), waiting for a running timer to stop.
- **Private spaces** – tick *Open this space in privacy mode* in a space's ⚙ menu and the page hides itself whenever you enter that space.
- **Reorder quick links** – drag a link by its ⋮⋮ grip to put it where you want (or focus the grip and use the arrow keys).
- **To-do tasks tied to progress** – hover a task and click 📈, confirm, and a Progress widget opens beside the list (stuck to it), titled with the task. The task's checkbox then follows that widget: it ticks itself when the progress reaches 100% and unticks if it drops. Closing the Progress widget turns the task back into a normal one.
- **Undo and redo** – Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y) undo and redo what you did to the desk: moving, resizing, adding, removing, duplicating, sticking, colouring, sending to another space. They leave alone what you typed inside widgets (while you are typing in a field, Ctrl+Z is the field's own). Removing a widget shows a "Widget removed · Undo" notice.
- **Recently removed** – the last 10 widgets you removed wait, with their content, in Settings → *Data* → *Recently removed*; *Restore* puts one back in the space you are looking at.
- **Widget menu** – the ⋯ in a widget's title bar: *Duplicate* (a container is copied with what's inside), a colour for the title bar, *Move to space* (to another space, in the same position) and *Select to move together*.
- **Move several widgets at once** – Ctrl+click (⌘+click) on the title bars of the widgets you want (or *Select to move together* in the ⋯ menu), then drag any of them by its title bar: the whole selection moves as a block, each widget bringing along the ones stuck to it. A pinned widget in the selection keeps everything still. Esc or a click on the empty desk clears the selection.
- **Command palette** – Ctrl+Shift+K (change it in Settings → Desk). Type to find a widget by its name or text in any space (it flashes when you get there), add a tool, switch space, create a space from a template, undo or redo.
- **Search bar with the palette inside** – the search bar (the one in the centre and the Search widget) still searches the web with Enter, but as you type it also lists what the command palette would find: widgets in any space, spaces, commands and tools to add. Use ↑/↓ to pick one (↓ on an empty bar lists the commands) and Enter to run it; Ctrl+Enter still opens the web search in a new tab.
- **Space shortcuts** – Alt+1…9 jump to the space in that position.
- **Space templates** – hover the ＋ next to the spaces: a small box offers *Blank* (the same as clicking ＋) and *From a template*, which lists the templates: *Study day*, *Planning*, *Wellbeing* and *Deep focus* come with the app, and you can **delete any of them** (✕; the default ones come back with Settings → Data → *Restore the default templates*) and **save the current space as a template** (its widgets with their sizes, places, containers and what is stuck together; optionally with what is written in them). Your templates are part of Export/Import, and the command palette lists them too.
- **Confirmations** – questions like "Remove this pinned widget?" are shown by the app itself, not by the browser: Esc or a click outside cancels, and for risky actions the focus starts on *Cancel*.
- **Quick tour** – on first run a short guided tour highlights the drawer, spaces and settings and explains moving, sticking and containers; replay it any time from Settings.
- **Search shortcut** – with the optional search bar in the centre, a key focuses it; the default is `\`, and you can pick another (even `Ctrl+K`) in Settings.
- **Settings window** – the ⚙ in the bottom bar opens a window with categories (appearance, desk, privacy, sounds, data, language, about; the About page also has the quick tour and the changelog).
- **Per-space options** – the ⚙ next to the active space's name sets that space's tilt and search bar (or follows the global settings), shuffles the widget angles, renames the space and can lock every widget in it.
- **Tilt** – a slider (0 = straight) instead of an on/off switch. Drag the small tab in a widget's bottom-left corner (the mirror of the resize tab) to tilt it by hand, within the same limits as the random angles.
- **Pin** – the 📌 in a widget's title bar fixes it in place and size (it won't move, resize or fly off, and others won't snap to it). A pinned widget in a snapped group keeps the whole group still, and removing it asks first. *Lock space layout* (in the space's ⚙ menu) does it for every widget and also stops new widgets being added.
- **Privacy mode** – one key (default `Ctrl+Shift+H`, configurable) or the eye button hides the whole page behind a transparent, heavily blurred veil. While hidden you get either a notice in the centre with a big button to bring the page back, or a discreet reminder of the shortcut and an eye button at the bottom right. It can also hide when you leave the tab or after a period of inactivity. It guards against glances, not against someone at your keyboard, and is not saved: reloading shows the page again.
- **Backup** – Settings → *Export data* saves everything (all spaces, widgets and settings) to a `.json` file; *Import data* restores it, replacing the current data. *Copy as text* / *Paste from text* do the same through a single line of text you can paste into a chat or an email, no file needed. Handy when moving between computers. A backup written by a newer version of the extension than yours (a different data format) is not imported: you get a friendly "visitor from the future" notice saying which versions are involved, nothing is changed, and the fix is to update the extension first.

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
