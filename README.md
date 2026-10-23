# Atelier N°07 — Bespoke Leather Studio

A locally runnable React + TypeScript model of a bespoke leather configurator. The demo joins a small sample catalog, deterministic configuration rules, an SVG product study, a source-aware leather market observations workspace, and a browser-only design assistant into one workflow.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Use `npm run build`, `npm run lint`, and `npm test` to validate the project.

## Included workflow

- Configure a tote, laptop sleeve, or cardholder with sample leather, color, dimensions, hardware, personalization, and supported features.
- See the current choices reflected in a product-specific SVG preview.
- Validate dimensions, sample leather thickness, monogram length, and supported features. Invalid designs are not quote-ready; deterministic alternatives are generated from the same rules.
- Describe a design in the assistant. A small local phrase parser proposes catalog-backed changes; customers must review and apply the proposal.
- Add a JPEG, PNG, or WebP reference image (up to 5 MB) to the current browser session. The demo does not analyze or upload it.
- Create a share URL with a versioned configuration in the fragment. Monogram text and freeform notes are deliberately excluded from shared URLs.
- Review pricing availability and print a design brief for discussion with an artisan.
- Enter a target INR budget and select a priority. The interface reports affordability as undetermined until verified material procurement data and complete workshop costs are mapped; it never asserts that a design fits or recommends an unpriced substitute.
- Save browser-local immutable design versions, reopen a selected snapshot, and create a portable versioned share link with monogram text and freeform customer notes excluded.
- Review the current configuration as a specification card, including its design ID/version when saved, missing procurement data, and workshop-confirmed lead-time requirement.
- Browse short material notes and see which sample hide is selected.
- Review the initial supplier directory, record source-linked price observations and verified exchange rates, and calculate per-square-foot averages only from current, approved, in-stock and comparable listings.
- Inspect observation history, exclusions and supplier counts; separate retail and wholesale, deduplicate latest supplier/product observations, and retain manual correction evidence.

## Texture source

The leather grain in the SVG study and Heritage Calf sample swatch uses the 1K albedo map for [Brown Leather by Rob Tuytel on Poly Haven](https://polyhaven.com/a/brown_leather). Poly Haven publishes its assets under [CC0](https://polyhaven.com/license); the texture is bundled locally at `public/textures/brown_leather_albedo_1k.jpg` so the demo does not depend on a live asset CDN.

## Important limitations

This is a working product model, not a production commerce or manufacturing system. Catalog limits, leather grades, material costs, labor assumptions, and visuals are demonstration data only. The estimate is not a supplier quote; the SVG is not dimensionally accurate; sample rule validation is not workshop approval.

No leather price is seeded in the app. The configurator shows “Quote required” until an exact, verified supplier product and approved procurement cost can be securely mapped to the chosen material. Market averages are observational comparisons, not procurement costs, and are never used as a stand-in. The supplier market workspace calculates from user-entered observations only; an empty workspace correctly shows no market average.

No supplier API/feed, scheduled server-side connector, database, authenticated admin dashboard, secure shared storage, image interpretation or generation, inventory, live quote submission, payment, or lead-time service is connected. Source refresh does not fetch any pages. Manually verify that each source permits collection and record the exact source URL, displayed value, unit, stock status and time. Market observations, exchange rates and saved design versions are stored only in this browser's local storage and are not shared or suitable for confidential production use. Portable links contain a versioned configuration snapshot, not a server-backed saved record; monogram text and freeform customer notes are excluded. Quote form data is not transmitted or retained. Reference images remain in browser memory for the current session. Do not enter sensitive customer information into this demo.

Before production use, replace the sample catalog and constraints with approved workshop data, connect authenticated server-side services, add secure persistence and access control, review uploads, and verify calculations and manufacturing specifications with qualified staff.
