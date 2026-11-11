# MatheMatiz

**A full-screen whiteboard for thinking in ink.**

MatheMatiz opens straight into the canvas: no landing page, no account, and no backend. Draw with a mouse, pen, or
finger, zoom in for fine handwriting, and export the board as a PNG. Everything runs locally in the browser.

## Run it

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Build and deploy

```bash
npm run build
```

The production site is written to `dist/`. Vite uses relative asset paths, so the folder works on any static host,
including:

- GitHub Pages project sites
- Netlify
- Vercel
- Cloudflare Pages
- A plain file server or CDN

Upload the contents of `dist/` (not the folder itself) to your host. No environment variables, API keys, or server code
are required.

To check the production build locally:

```bash
npm run preview
```

## The board

- **Pen**, **highlighter**, **eraser**, **line**, **arrow**, **rectangle**, **ellipse**, **text**, and **Hand** tools.
- Seven ink colours, adjustable stroke size, and plain / dotted / grid paper.
- Zoom from 20% to 400%, pan around the page, reset to 100%, or fit the drawing to the screen.
- Undo and redo, clear, and PNG export.
- Light and dark themes, keyboard shortcuts, and automatic local persistence.
- The board name, every element, and the current view are saved to `localStorage` as you work.

### Zoom and pan

| Action | How |
| --- | --- |
| Zoom in / out | `+` / `−` in the bottom bar, or the keyboard |
| Zoom around the pointer | `Ctrl` / `⌘` + scroll |
| Pan | Scroll, drag with the Hand tool, or middle-mouse drag |
| Reset to 100% | Click the percentage, or press `0` |
| Fit drawing to screen | The Fit button in the bottom bar, or press `F` |

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Pen | `P` |
| Highlighter | `H` |
| Eraser | `E` |
| Line | `L` |
| Arrow | `A` |
| Rectangle | `R` |
| Ellipse | `O` |
| Text | `T` |
| Hand | `V` |
| Zoom in / out | `+` / `−` |
| Reset zoom | `0` |
| Fit drawing | `F` |
| Undo | `Ctrl` / `⌘ Z` |
| Redo | `Ctrl` / `⌘ Shift Z` |
| Close dialog | `Esc` |

Single-key shortcuts are ignored while you are typing in a field.

## Privacy

Everything stays on this device. There are no network requests, no analytics, and no external APIs. The board is stored
only in your browser's `localStorage`, and PNG export happens locally.

## Stack

React, TypeScript, Vite, Canvas 2D, and lucide-react icons.

---

Built by [prakit](https://github.com/prakit).
