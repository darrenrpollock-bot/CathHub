# CathHub — Triaxial (Nested) Configuration Session Notes
**Date:** 2026-06-14  
**Session focus:** Adding support for triaxial (one inner catheter inside another) vs. parallel/side-by-side inner catheter configurations in the Detail View, plus post-implementation deployment troubleshooting.

---

## Original Request
The user shared a screenshot of the Detail View showing two inner catheters (Excelsior XT-27 OD 0.96 mm + another at 1.52 mm) inside a Benchmark 071 (ID 1.80 mm) rendered **side-by-side** in the cross-section visualization.

In many real clinical scenarios (especially DAC + micro or dual micro stacks), the second catheter runs **inside** the first inner catheter (triaxial/coaxial setup). The current rendering and clearance math always treated multiple inners as parallel (summed ODs), which produced misleading or impossible compatibility results for common nested use cases.

Request: Add a simple toggle/button to switch between "side by side (parallel)" and "triaxial (nested)" modes, with the app updating the visualization and calculations accordingly.

---

## Implementation Summary

### Files Changed
- **index.html** — Added the configuration toggle UI directly after the "2nd Inner Catheter (optional)" select in the `#tab-detail` section.
- **styles.css** — Added styling for `.triax-wrap`, `.triax-toggle` (segmented control), `.triax-btn`, and `.triax-hint`.
- **app.js** — Core logic changes:
  - New helper functions: `getDetailTriaxialMode()` and `setDetailTriaxialMode()`.
  - `renderLumenViz(access, micro, micro2 = null, triaxial = false)` — added full concentric/nested SVG rendering branch when `triaxial === true`.
  - `updateDetailView()` — reads toggle state, shows/hides the control, computes separate clearances (access uses only outer inner OD in triaxial; reports inner-lumen clearance separately), passes flag to viz, updates banner + subtitle text.
  - `syncURLState()` / `applyURLState()` — persist/restore `?triax=1` param for shareable links.
  - Saved stacks (`saveStack` + loading logic in `renderSavedStacks`) — store and restore `triaxial: true` on full stacks.
  - `generateReportText()` — includes "Configuration: Triaxial (nested)" or "Side by side (parallel)" in copied reports.
  - Event wiring for the toggle buttons + integration with existing select change handlers.
- **sw.js** (post-implementation) — Bumped `CACHE_NAME` from `'cathhub-v7'` to `'cathhub-v8'` to ensure the new assets (especially app.js + styles.css) propagate reliably to clients with existing service worker caches.

### UX Behavior
- Toggle only visible when both inner catheters are selected in Detail View.
- Defaults to "Side by side" (preserves all existing behavior and links).
- Switching immediately re-renders the cross-section, legend, and compatibility banner.
- Triaxial mode:
  - Draws concentric circles (access → outer-inner lumen → inner-most catheter centered inside).
  - Access clearance = `access.idMm - outerInner.proxOdMm`.
  - Reports inner-lumen fit (`outerInner.idMm - innerMost.proxOdMm`) in the banner subtitle.
- Share links, saved stacks, and "Copy report" all carry the chosen configuration.

### Key Clinical Example (from screenshot)
- Benchmark 071 (ID 1.80 mm) + RED 43-style (OD 1.52 / ID 1.09) + Excelsior XT-27 (OD 0.96)
- Parallel: combined clearance ≈ **-0.68 mm** (heavily red/incompatible — visually misleading).
- Triaxial: access clearance **+0.28 mm** (green) + inner lumen **+0.13 mm** (good).

This matches real-world usage where the 1.52 mm device sits inside the access and the 0.96 mm runs inside the 1.52 mm device.

---

## Deployment & Visibility Issue (Post-Implementation)

After implementation and the user's commit/push (`4edd3f6 feat: add triaxial/parallel toggle...`), the live site (cathhub.com) did not immediately reflect the changes even though the code was on GitHub and the branch was up-to-date.

### Root Causes Identified
1. **Vercel deployment** — Static site with no `vercel.json` or `.github/workflows`. Pushes to the `darrenrpollock-bot/neurolumen` remote (note the bot account) do not automatically trigger production deploys in all cases. Manual "Redeploy" from the specific commit was required.
2. **Service Worker caching (primary blocker for repeat visitors)**:
   - `sw.js` uses cache-first strategy for `/app.js`, `/styles.css`, `/index.html`, etc.
   - `CACHE_NAME = 'cathhub-v7'` had never been bumped for this feature.
   - The activate handler only purges old caches when the cache name string changes.
   - Installed PWAs and returning browsers would continue serving the old bundled assets even after a successful server deploy.
   - Navigation requests are network-first (good), but asset requests are not.

### Resolution Steps Taken
- Confirmed via `git show 4edd3f6` that the full implementation (HTML toggle, concentric viz branch, state management, etc.) was present in the pushed commit.
- Bumped `CACHE_NAME` to `'cathhub-v8'` in `sw.js` (with explanatory comment). This ensures that on the next activation, old `'cathhub-v7'` caches are cleaned and the new assets are used.
- Provided the user with precise debugging steps:
  - DevTools → Application → Service Workers → Unregister.
  - Hard reload (Cmd/Ctrl + Shift + R).
  - Fresh Incognito window.
  - For installed PWAs: remove and re-install after server update.
- Advised checking Vercel dashboard for the specific commit and triggering a production redeploy.

The user later confirmed: "works perfectly, thanks".

---

## Reference Locations (Current Codebase)

- Toggle markup: `index.html` (search for `detail-triax-wrap`)
- Toggle styles: `styles.css` (search for `.triax-toggle`)
- Core logic:
  - `app.js` → `renderLumenViz` (triaxial branch)
  - `app.js` → `updateDetailView` (state, clearances, banner)
  - `app.js` → `getDetailTriaxialMode` / `setDetailTriaxialMode`
  - `app.js` → `syncURLState` / `applyURLState` (triax param)
  - `app.js` → Saved stack handling (search for `triaxial`)
- Service worker cache: `sw.js` (CACHE_NAME)

---

## Future Polish Ideas (Not Implemented)
- Small "T" badge or indicator on saved stack chips when `triaxial: true`.
- Tooltip / help text explaining when to choose each mode.
- Optional auto-suggestion logic (if inner2 OD > outer inner ID in parallel but fits nested → highlight triaxial).
- Footer version string or "last updated" that includes feature notes.
- Consider exposing triaxial flag in Fast Check (currently out of scope — Fast Check still assumes parallel summed ODs).

---

## Commands Used During Session (for reference)
```bash
git status
git log --oneline -10
git show 4edd3f6 --stat
node --check app.js   # syntax validation
# (plus manual math simulation of clearance for the screenshot numbers)
```

---

**Session captured for future reference.**  
This file can be referenced when revisiting the triaxial feature, explaining the implementation to others, or debugging similar PWA + Vercel + Service Worker update issues.

Last updated: 2026-06-14 (during the implementation + troubleshooting session).