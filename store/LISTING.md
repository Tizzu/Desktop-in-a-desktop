# Chrome Web Store listing (to paste into the developer dashboard)

Upload `.output/desktop-in-a-desktop-<version>-chrome.zip`, built with `npm run zip:store` (no `key` in the manifest).

## Store listing

**Name:** Desktop in a Desktop

**Summary (max 132 chars):** A free-form desk of widgets for your new tab: notes, timers, trackers and more. Everything stays on your computer.

**Category:** Productivity  **Language:** English (add Italian below)

**Description:**

Turn your new tab into a desk you arrange yourself.

Drag tools from the drawer bar at the top and drop them anywhere: 50 widgets in six categories.

• Notes – sticky notes (with drawing), markdown notebook, to-do, blackboard, goal of the day, journal, flashcards, board
• Time – clock, timer, Pomodoro, stopwatch, calendar, world clock, countdown, reminders with notifications, agenda
• Numbers – calculator, converter, counter, expenses, piggy bank, split the bill, water
• Wellbeing – habits, breathing, eye break, mood, gratitude, sleep, plant
• Links & images – quick links, search, image, palette, label, frame, container
• Fun – dice, bubbles, 2048, memory, tic-tac-toe, wheel of fortune, rain, fireplace

Make it yours
• Several spaces, like tabs, each with its own set
• Snap tools together by their edges and move them as one
• Containers hold other tools and can be closed to a single bar
• Throw things around with momentum, optional playful tilt
• Five colour themes (or follow your system accent), English and Italian
• Export and import everything as a file or as a copy-paste text

Private by design: no account, no cloud, no analytics, no network access. Your data lives in your browser profile only. Free and open source (MIT): https://github.com/Tizzu/Desktop-in-a-desktop

**Descrizione (italiano):**

Trasforma la nuova scheda in una scrivania che disponi come vuoi. Trascina gli strumenti dalla barra in alto: 50 widget in sei categorie (note, tempo, numeri, benessere, link e immagini, svago). Più spazi come schede, widget che si agganciano e si muovono insieme, contenitori che si chiudono, temi, esportazione e importazione di tutto come file o testo da incollare. Nessun account, nessun cloud, nessuna analisi: i dati restano sul tuo computer. Software libero (MIT).

## Privacy tab

**Single purpose:** Replace the new tab page with a customisable desk of widgets (notes, timers, trackers, etc.).

**Permission justifications**
- `storage`: saves the user's spaces, widgets and settings locally, and the chosen language for notifications.
- `alarms`: schedules timers and reminders so they ring even if the new tab page is closed.
- `notifications`: shows the notification when a timer or reminder goes off.
- `search`: the search widget runs the user's query with the browser's default search engine.

**Host permissions:** none. **Remote code:** no (all code is in the package). 

**Data usage:** does not collect or transmit any user data. Certify the three limited-use statements (no selling, no unrelated use, no creditworthiness use).

**Privacy policy URL:** https://github.com/Tizzu/Desktop-in-a-desktop/blob/main/PRIVACY.md

## Assets

- Store icon 128×128: `store/icon-128.png` (same as the package icon, `public/icon/128.png`).
- Marquee promo tile 1400×560: `store/promo-marquee-1400x560.jpg`.
- Screenshots 1280×800: `store/screenshots/`.
- Small promo tile 440×280: `store/promo-small-440x280.jpg`.

## Notes

- The Store assigns its own extension ID, so a Store install does not share data with a build loaded from GitHub or from source (different ID). Use Settings → Export / Import to move data between them.
- After the first upload, new versions: bump `version`, `npm run zip:store`, upload the zip as a new package.
