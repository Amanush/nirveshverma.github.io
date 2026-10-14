# GK Turbo

A local-first, JSON-driven presentation app for teaching and for recording GK, Science and competitive-exam revision videos. You give Claude a topic ("Narmada River"), it writes one JSON file, and the app plays it one slide at a time with Next / Previous / arrow keys. It supports English, Hindi and Hinglish, 16:9 and 9:16 from the same file, quiz timers with answer reveal, an editable interface, a temporary whiteboard, images and narration.

No build step. No database. No account.

## Run on Windows

1. Install Python from https://www.python.org/downloads/ (tick **Add python.exe to PATH**).
2. Double-click **`start.bat`** in this folder. It opens http://localhost:8000.
   Or in a terminal: `python -m http.server 8000` then open http://localhost:8000.
3. Keep the black window open while you use the app. Close it to stop.

Opening `index.html` by double-click does **not** work: browsers block loading the JSON files that way.

## Daily workflow

1. Ask Claude for a topic with the prompt in **`TOPIC_PROMPT.md`** (it uses `topics/_template.json`).
2. **Import JSON** (sidebar) or add the file to `topics/index.json`.
3. **✎ Edit** to adjust text, add images or narration. **Save changes** keeps it in your browser.
4. **Export JSON** when you want the file on disk, and **Save images & audio…** to put added media into `assets/`.
5. **▶ Present** to record.

## Folder layout

```
index.html  start.bat  README.md  TOPIC_PROMPT.md
css/style.css
js/   store.js  edit.js  images.js  audio.js  player.js  quiz.js  decks.js  whiteboard.js  lang.js  app.js
topics/   _template.json  index.json  narmada.json  narmada.hinglish.json
banks/    manifest.json  science.json  hindi.json  english.json  reasoning.json  computer.json  maths.json
assets/   narmada-sketch.svg  audio/
```

Question banks (`banks/`) are played through the sidebar: pick a bank, a topic tag and a count. Banks that have only a question and answer get 3 **machine-generated wrong options** from other answers with the same tag; check them before recording.

## Keyboard

| Key | Action |
|---|---|
| → / Space / PageDown | Next step, then next slide |
| ← / PageUp | Back |
| Home (configurable) | First slide |
| S | Start / pause quiz timer |
| P / Esc | Presentation mode on / off |
| W | Open, hide or show the whiteboard |
| N / M | Narration play-pause / mute |
| Shift+R | Reset presentation |

Keys are ignored while you are typing in a box.

## Saving: how it works (read this)

A web page cannot silently overwrite files on your computer, and a GitHub Pages site cannot rewrite its own files. So:

- **Save changes** stores your topic and up to 20 snapshots in the browser (IndexedDB). It survives refresh. Undo/redo and Reset to saved work as expected.
- **Export JSON / Download backup** give you real files. This is how content leaves the browser.
- **Restore backup** brings back an earlier snapshot.
- Added **images and audio** are stored in the browser and referenced in the JSON by a relative path such as `assets/narmada-river-s4-xxxx.png`. **Save images & audio…** writes them into your project's `assets/` folder (Chrome/Edge: you pick the folder; other browsers download the files and you move them yourself). The JSON never contains Base64 images.
- Clearing browser data deletes unsaved work and unsaved media. Export first.

## What needs what

| Feature | Needs |
|---|---|
| Everything basic | A local server (`start.bat`) or GitHub Pages |
| Hindi font (Noto Sans Devanagari), Poppins | Internet for Google Fonts, otherwise system fonts are used |
| Fetch image from URL | Internet, and the site must allow downloads (CORS). If blocked you get an error, an "open in new tab" link, a paste option and, if it still displays, "Use linked URL" (needs internet while presenting) |
| Paste / drop / upload image | Nothing extra. Clipboard button needs browser permission; Ctrl+V always works |
| Save media into `assets/` folder | Chrome or Edge (File System Access API). Otherwise files download |
| Record narration | A microphone and browser permission. Optional: you can upload an audio file instead |
| Fullscreen presentation | Browser permission (the mode still works without it) |
| GitHub Pages | Static files only. New topics must be committed and listed in `topics/index.json`. Saving to GitHub from the page is **not** supported; use Export and commit the files |

## Whiteboard

The ✎ button beside the exam tag (or **W**) opens a floating text and pen board. It is draggable and resizable. **◐** hides it instantly and keeps your content; **✕** closes and discards it. It is kept only in memory: never in the JSON, IndexedDB or localStorage, and gone on refresh.

## GitHub Pages

Push this folder to a repository, enable Pages for the branch. `.nojekyll` is included. Everything uses relative paths.

## Tested

Automated browser tests (headless Chromium) cover: editing only the target slide, save and refresh, export/import/backup/restore, hidden answers staying out of the page until revealed, collapsible panels, whiteboard behaviour and non-persistence, both aspect ratios across all six question banks with no clipped content, image add (URL, upload, paste, drop) with failure fallbacks, crop/resize/move, narration upload and recording, and presentation mode.

**Not tested:** Firefox and Safari, OBS capture, phones/touch, real fullscreen behaviour on your machine, Google Fonts loading, and audio you can actually hear. Do a short test recording first.

## Known limitations

- Boxes move with arrow buttons, not by dragging.
- Very long question text is auto-shrunk (down to about 55% of normal); edit or shorten it if it gets too small.
- Auto-generated options for answer-only banks can be weak.
- Source Maths data has 26 questions with duplicate options.
- Safe-margin guides for Shorts/Reels are approximate, not official platform values.
