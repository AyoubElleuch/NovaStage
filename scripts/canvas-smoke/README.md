# Canvas browser smoke test

Run from the repository root:

```sh
node scripts/test-canvas-browser.mjs
```

The script uses the installed Playwright Chromium browser. If Chromium is missing,
install it with `npx playwright install chromium` before running the smoke test.

The harness mounts the real `ProjectCanvasClient` in a local Vite server. Supabase,
notifications, audio and Next's link wrapper use fixture adapters; every API request
uses an in-memory model, and non-local network requests are blocked. It requires no
account or environment variables and never changes a real project.

It checks desktop and mobile layout, fit clearance, checkpoint search and jump,
node drag persistence, inline rename, zoom and fit controls, radar dragging and
shortcut isolation, shortcut-dialog focus and mobile keyboard scrolling, and
touch pinch starting across the background and a node. Screenshots and a JSON
summary are written to the ignored `.tmp/canvas-smoke/` directory.

Vite does not compile Next's `style jsx` marker in the edge layer, so React may log
a harmless non-boolean `jsx` attribute warning in this isolated harness.
