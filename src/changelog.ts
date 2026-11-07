/** Novità di ogni versione, dalla più recente. I testi sono in inglese e passano da `t()` (traduzioni in i18n.it.ts). */
export interface Release { version: string; items: string[] }

export const CHANGELOG: Release[] = [
  {
    version: '0.5.0',
    items: [
      'A new Settings window with categories',
      'Tilt is now a slider, and each space can set its own tilt and search bar from the ⚙ next to its name',
      'Tilt a widget by hand with the small tab at its bottom-left corner, or shuffle all the angles of a space',
      'Pin widgets to keep them in place and size, or lock the layout of a whole space (nothing moves, nothing gets added)',
      'Privacy mode: blur the whole page with one key or the eye button, with a notice in the centre or a discreet one in the corner, and optional automatic hiding',
      'The changelog shows only what is new since your last visit; older versions are one click away',
    ],
  },
  {
    version: '0.4.0',
    items: [
      'Changelog like this one after each update; reopen it from Settings, under About',
      'Focus timer is now customisable: minutes for each phase, number of sessions, and optional auto-start',
      'Calm bell sounds when timers end (can be turned off in Settings)',
      'Board cards can be dragged between columns and reordered',
      'Day streak: fixed "Days…" label, and you can start counting from any number',
      'A warning before removing a diary, tracker or counter that already holds entries',
      'Fix: widgets no longer overlap their title bar when they are very short',
    ],
  },
  {
    version: '0.3.0',
    items: [
      'A short guided tour on first run, replayable from Settings',
      'New Snippets widget: keep text you paste often and copy it with one click',
      'Countdown has a new "Time left" view: how much of the day, week, month and year has passed',
      'Notebook has a formatting toolbar; the agenda covers 24 hours in half-hour slots; dice have a coin',
      'Containers can be renamed, and Label and Container live in a new Layout category',
      'You can choose your own search shortcut in Settings',
      'Fixes: 2048 swipes, rain and fireplace resizing, tools in the slanted drawer',
      'Renamed Wheel of fortune to Lucky wheel and Pomodoro to Focus timer; the Frame widget is gone',
    ],
  },
  {
    version: '0.2.0',
    items: [
      'Widgets snap together by their edges and move as one',
      'Container widget that holds other widgets',
      'Positions are measured from the centre of the page, so resizing the window no longer needs scrolling',
      'Export and import everything as a file or as copy-paste text',
    ],
  },
];
