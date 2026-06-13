# CathHub Data Update Instructions

**Purpose**: Keep the catheter database and quick stacks accurate and up-to-date. These instructions are written for AI agents (photo → structured data → Git commit).

**Golden Rules** (follow these every time):
- Only use numbers that appear on the packaging, box, or official IFU photo.
- Never invent or "average" dimensions.
- Prefer proximal OD for inner catheters (micro/DAC/thrombectomy) unless the device is clearly tapered and the photo shows distal.
- Always verify device names exactly as printed (including "Kit", "DAC", model numbers).
- When a new device is added, consider whether it should be marked `verified: true` (only if the manufacturer/photo confirms current specs).
- Featured stacks are for real clinical usefulness or sponsored new product launches. Do not feature random combinations.

## 1. Updating or Adding Devices (`data.js`)

Devices live in the `data` object with these top-level arrays:
- `accessCatheters`
- `thrombectomyCatheters`
- `dacCatheters`
- `balloonGuideCatheters`
- `microCatheters`

### Common fields
- `name`: Exact name from packaging (e.g. "AXS Catalyst 5", "RED 72 Kit")
- `company`: Manufacturer (e.g. "Stryker", "Penumbra", "MicroVention")
- `proxOdMm`: Proximal outer diameter in mm (most important for inner catheters)
- `distOdMm`: Distal outer diameter if visibly different on the photo
- `idMm`: Inner diameter (lumen) in mm
- `fr`: French size if printed (e.g. "6F", "5F")
- `lengthCm`: Length in cm (number or array if multiple options)
- `idInch`: Inner diameter in inches (optional, if printed)
- `notes`: Any important notes visible on packaging (e.g. "Kit includes Tenzing")
- `verified`: Set to `true` only when you are confident the specs on the photo match the current released product (use for manufacturer-confirmed or high-confidence updates). This shows a small "✓ Verified" badge in the UI.

### How to add a new device from a photo
1. Identify which array it belongs to (micro, DAC, thrombectomy, access, balloon guide).
2. Create a new object with the fields above.
3. Use the most precise numbers visible. Convert inches to mm only if no mm value is shown (1 inch = 25.4 mm). Prefer direct mm values.
4. Add `verified: true` if the photo is from official current packaging and the sponsor/rep has implicitly confirmed it.
5. Insert the object in a logical place (alphabetical by name is fine).

**Example from photo**:
If the box shows:
- "Phenom 21"
- "Medtronic"
- Proximal OD 0.86 mm
- Distal OD 0.76 mm
- ID 0.53 mm / 0.021"
- Length 160 cm

You would add:
```js
{ name: "Phenom 21", company: "Medtronic", proxOdMm: 0.86, distOdMm: 0.76, idMm: 0.53, idInch: 0.021, lengthCm: 160, verified: true }
```

## 2. Updating Quick Stacks / Featured Stacks (`presets.json`)

The Quick stacks (the buttons under "Quick stacks:" in Fast Check) are defined in `presets.json`. This is the primary place for "featured" new product promotions.

### File structure
`presets.json` is an array of objects. Each object must have:
- `key`: Unique lowercase kebab-case identifier (used for data attributes)
- `devices`: Array of exact device `name` strings that exist in `data.js` (1–3 items). Order matters — first device goes in slot 1, etc.
- `label`: Human readable name shown on the button (e.g. "Headway DUO + Phenom 17")

Optional fields for sponsorship / new launches:
- `featured`: `true` if this should be visually highlighted as a new/featured stack
- `featuredLabel`: Short text shown next to the label (e.g. "New", "Launch", "Stryker")
- `sponsor`: Company name (used for internal tracking / future UI)
- `description`: Short clinical note (visible in code, helps the agent and future maintainers)
- `notes`: Any internal notes about why this combo was chosen

### How to set or change a featured stack from a photo / launch
1. Decide on 2–3 devices that make clinical sense together (combined proximal OD should be reasonable for at least some access catheters in the database).
2. Choose or create a new `key`.
3. Set `featured: true` and a `featuredLabel` (usually "New" for launches).
4. Optionally add `sponsor` and good `description`.
5. Only one preset should normally have `featured: true` at a time (the UI will still render multiple, but only one should be promoted).
6. The agent should also consider adding the new device to `data.js` with `verified: true` if the photo justifies it.

**Good example for a new launch**:
```json
{
  "key": "new-catalyst-phantom",
  "devices": ["AXS Catalyst 5", "Phenom 21"],
  "label": "AXS Catalyst 5 + Phenom 21",
  "featured": true,
  "featuredLabel": "New",
  "sponsor": "Stryker",
  "description": "Popular DAC + micro stack for the newly launched Catalyst 5 variant."
}
```

**Bad practices to avoid**:
- Using two very large devices (combined OD > 2.8 mm) as a "stack" — they almost never fit as inners.
- Featuring a combo that has no realistic clearance in any access catheter in the database.
- Making up device names that don't exactly match `data.js`.

## 3. General Workflow When Receiving a Photo via Telegram

1. Carefully read all text and numbers on the photo(s).
2. If it's a new device → add to the correct array in `data.js` (with `verified` if appropriate).
3. If the instruction mentions "featured", "new launch", "sponsor", or "highlight this combo" → update or add an entry in `presets.json` with `featured: true`.
4. After edits, the commit message should be descriptive (e.g. "Add Phenom 27 + mark as verified; set new Stryker featured stack").
5. Only commit if the numbers are directly supported by the photo.

## 4. Verification & Quality

- After updating, mentally (or literally) calculate combined OD for any new stack: `sum of proxOdMm`.
- Check against a few access catheters (e.g. Neuron 070 ID 1.78, BMX96 ID 2.44). The stack should produce at least one "green" or "amber" result in realistic use.
- If the photo is blurry or numbers conflict, ask for clarification instead of guessing.

## 5. Files You Are Allowed to Edit

- `data.js` (device data)
- `presets.json` (quick stacks + featured)
- `data-instructions.md` (only if you are improving these instructions)

Do **not** edit `app.js`, `index.html`, or `styles.css` unless the instruction explicitly asks for a code change.

## 6. Example Agent Prompt (for reference)

When the human sends a photo + instruction, the ideal internal prompt for the agent should include:
"Follow data-instructions.md exactly. The photo shows packaging for [device name]. [specific instruction, e.g. 'Add this device and make a new featured stack with it and Phenom 21']. Output only the minimal diffs or the exact new JSON objects."

This structured approach makes cheaper models (and future agents) far more reliable than loose "just update the app" instructions.

---

Keep this file in the repo root so the agent (and any human) can always refer to the latest rules.