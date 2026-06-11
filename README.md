# CathHub

**Catheter Compatibility Tool for Interventional Neuroradiology (INR)**

A fast, beautiful, offline-capable PWA that helps neurointerventionalists and cath lab teams quickly determine which microcatheters, DACs, and thrombectomy catheters will fit inside a given access/guide catheter — and see the clearance.

**Live:** [https://www.cathhub.com/](https://www.cathhub.com/)

Built by [ConnectRx](https://connectrx.com.au).

## Why CathHub?

In the neuro angio suite, seconds matter. Instead of hunting through PDFs and spec sheets:

- Pick 1–3 inner devices in **Fast Check** → instantly see every access catheter ranked by clearance.
- Use **Detail View** for a specific access + inner(s) with beautiful cross-section lumen visualization.
- Browse the full **Reference** of devices with searchable tables.

All calculations are local. Data is based on publicly available manufacturer specifications.

## Features

- **Fast Check** — Select up to three inner catheters (microcatheters, DACs, aspiration/thrombectomy). See green/amber/red compatibility across all access systems, grouped by French size + combined OD.
- **Lumen Cross-Section Viz** — Accurate-to-scale SVG showing access ID vs inner OD(s) with color-coded clearance.
- **Detail Specs** — Full OD/ID, French, length, notes for chosen devices.
- **Reference Tables** — All devices in one place, dynamically rendered.
- **PWA** — Installable, works offline (service worker cache).
- **Mobile-first** — Thumb-friendly selects, clear visual feedback.

## Upcoming / Recent Improvements

- Shareable deep links (copy a URL that restores exact selections)
- Saved "My Stacks" (local favorites for common setups)
- Add Custom Device (test new or hospital-specific catheters locally)
- One-click Copy Report for case documentation
- Global device search in Reference
- Keyboard shortcuts for power users

## Data & Accuracy

Data is sourced from manufacturer IFUs and product literature. **Always verify with the current Instructions for Use (IFU) before clinical use.**

CathHub is a decision-support aid, not a substitute for clinical judgment or official labeling.

If you spot an error or have updated specs for a new device, please open an issue or PR with the source.

## Running Locally

```bash
# Any static server works
npx serve .
# or
python3 -m http.server 8080
```

Open http://localhost:8080

## Project Structure

```
index.html   — App shell + tabs
styles.css   — All styling (modern dark medical theme)
app.js       — All logic, rendering, compatibility math
data.js      — Device database (access, balloon guide, micro, DAC, thrombectomy)
sw.js        — Service worker for offline/PWA
manifest.json
```

## Contributing Devices

The easiest way:

1. Edit `data.js`
2. Add or correct an object in the appropriate array (see existing shape)
3. Important fields:
   - `name`, `company`
   - For access/balloon: `fr`, `odMm`/`shaftOdMm`, `idMm`/`shaftOdMm`
   - For inners: `proxOdMm`, `distOdMm` (optional), `idMm`
   - `lengthCm` (number or array), `notes`, `idInch` optional

Keep numbers in mm. Test the Fast Check + Detail views.

PRs welcome.

## Tech

- Pure vanilla JS + CSS (no build step)
- Designed for instant load and reliability in clinical environments
- Vercel static hosting + GitHub

## Disclaimer

ConnectRx and the authors accept no responsibility for errors or omissions. Clinical use is at your own risk. Always cross-check with current device documentation.

## License

Internal / clinical tool. Feel free to fork for your institution with attribution.

---

Made for the people who do the work in the angio suite. Feedback welcome via connectrx.com.au.
