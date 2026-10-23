# SynnergyNexus × Carry Bespoke Leather Studio

A real-time 3D simulation-based product configurator and workshop manufacturing studio for bespoke leather goods, created for **Carry** (`carrytote.in`). The platform unites Three.js WebGL 3D rendering with procedural leather PBR materials, authentic Carry product families, live itemized manufacturing cost calculations, budget optimization with alternative recommendations, an artisan workshop build sheet generator, and portable design code sharing.

## Run locally

```sh
npm install
npm run dev:all   # Starts both Express Backend (port 3001) & Vite 3D Studio (port 5173)
```

Or run services independently:
- `npm run server`: Launches the Node.js / Express REST API on port 3001
- `npm run dev`: Launches Vite Frontend on port 5173 (with `/api` proxy)
- `npm run build`: Validates production bundle (TypeScript & Vite)
- `npm run lint`: Runs Oxlint code inspection
- `npm test`: Runs Vitest test suite

## Role-Based Authentication & Access Control

- **Dedicated Login Experience (`src/auth/LoginPage.tsx`)**:
  - Differentiates between **Bespoke Patron** (Customer) and **Atelier Master** (Admin / Craftsman).
  - Built-in **1-Click Instant Demo Credentials**:
    - **Admin**: *Master Craftsman Rajesh K.* (`admin@atelier.in` / role: `admin`)
    - **Customer**: *Ananya Sharma* (`patron@luxury.in` / role: `customer`)
  - Full support for standard email/password authentication and "Continue as Guest" browsing.
  - **Protected Admin Routes & Modals**: Unauthenticated or customer visitors attempting to access the Atelier Operations Hub (`/#admin`) are automatically prompted with a role-gated sign-in modal.
  - Profile badge and session switcher conveniently located in the studio header.

## Supabase Database Integration (`supabase/` & `src/supabase.ts`)

- **Cloud PostgreSQL Schema (`supabase/schema.sql`)**:
  - `profiles`: User roles (`customer` | `admin`), full names, phone numbers.
  - `bespoke_quotes`: Full custom orders with configuration JSON, pricing, artisan assignment, and order lifecycle states.
  - `inventory`: Real-time hide stock (sq. ft.), hardware kits, min-threshold alerts.
  - `saved_designs`: Cloud synchronized patron portfolios and portable snapshot codes.
  - Comprehensive Row Level Security (RLS) policies for customer isolation and admin management.
- **Resilient Multi-Tier Persistence (`src/api.ts`)**:
  - Tier 1: Live Supabase database if `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are provided in `.env`.
  - Tier 2: Dedicated local Node/Express backend (`http://localhost:3001/api`).
  - Tier 3: Browser local storage failover for offline reliability.

## Vercel Deployment & Serverless Integration

- **SPA Rewrites & Edge Security (`vercel.json`)**: Configured with single-page application routing (`/(.*) -> /index.html`), API rewrites, and caching/security headers (`X-Content-Type-Options`, `X-Frame-Options`).
- **Serverless API Endpoints (`api/`)**:
  - `/api/health`: Instant edge uptime monitor.
  - `/api/quotes`: Serverless quote submission and order creation endpoint.

## Included Workflow & Features

- **Dedicated Atelier Operations & Admin Portal**:
  - Independent operations hub (`/#admin` or top navigation button) completely separated from customer 3D studio
  - **Bespoke Orders & Custom Quotes Queue**: Filterable live queue with client details, real-time status tracking (`New Request` → `Cutting Bench` → `Stitching` → `QC Passed` → `Ready for Dispatch`), craftsman assignment, and printable traveler cards
  - **Raw Leather Hide Stock**: Square footage tracking per hide (*Heritage Calf*, *Pebble Grain*, *Saddle Hide*, *Saffiano*, *Nappa*), visual min-threshold meters, and stock/rate update forms
  - **Hardware & Component Stock**: Kit inventory for Brass, Silver, Black, Rose, Copper, thread spools, edge lacquer
  - **Studio Analytics & Financials**: Pipeline value (₹), average order value (AOV), silhouette shares, and conversion metrics
- **Complete Node.js / Express Backend Server (`server/`)**:
  - RESTful endpoints for Quotes (`/api/quotes`), Material Inventory (`/api/inventory`), Cloud Designs (`/api/designs`), and Lifestyle Recommendations (`/api/recommendations`)
  - Persistent JSON flat-file storage under `server/data/` with automatic client offline fallback
- **Smart Style & Harmony Recommendation Engine**:
  - Real-time **Color Harmony Analyzer** computing undertone affinity (0–100%) and advising on complementary threads, hardware, and edge paint
  - **Lifestyle Recommender**: Tailors configurations to client use-cases (*Daily Office*, *Travel & Trips*, *Formal / Evening*, *All-Weather Tough*) and budget constraints with 1-click styling application
- **Interactive 3D WebGL Studio**: Rotate, pan, and zoom around genuine 3D leather models using orbit pointer controls, wheel/pinch zoom, auto-turn turntable mode, and preset camera angles (`Perspective`, `Front`, `Side`, `Back`, `Top`).
- **Streamlined 5-Step Guided Customization Experience**:
  - Balanced 2-column studio layout eliminating vertical scroll friction (sticky 3D stage on the left, step tabs on the right)
  - Guided step workflow: `01 Hide & Color` → `02 Hardware & Craft` → `03 Size & Fit` → `04 Monogram` → `05 Spec & Quote`
  - 1-click **Curated Artisan Styles**: *Classic Heritage*, *Espresso Noir*, *Royal Oxblood*, and *Forest & Nickel*
  - 1-click **Size Presets**: *Compact*, *Standard*, and *Roomy* dimension presets with fine-tuning sliders
  - **Quick Shade Switcher**: Instant circular color swatches positioned under the 3D stage for rapid shade previewing
- **Carry Commercial Product Families**:
  - Everyday Tote Bag (Barsati & Core Tote series, dual rolled handles, brass rivets)
  - Sculptor Handbag (Curved architectural profile, front flap, turnlock clasp, crossbody strap)
  - Bifold & Snap Wallet (Dual-fold shell, contrast divider, snap fastener tab)
  - Essential Cardholder (Stepped card slots, center contrast pocket, edge paint)
  - Tech & Passport Sleeve (Padded envelope silhouette, collar stud closure)
  - Nomad Toiletry Kit (Dopp box construction, brass top zipper track, grab handle)
  - Origami Sunglass Cover (Sculpted wrap case, nose bridge support, snap button)
- **Procedural PBR Leather Materials & Finishes**:
  - Full-Grain Heritage Calf (Semi-aniline vegetable-tanned, smooth / pull-up)
  - Pebble Grain Calf (Cobblestone textured embossing)
  - Saddle Hide (Heavy oil-rich veg-tan)
  - Saffiano (Cross-hatch pressed wax finish)
  - Smooth Italian Nappa (Buttery soft aniline touch)
- **Bespoke Personalization & Monogram Studio**:
  - Live 3D foil decal projected directly onto the product surface
  - Foils: 24K Gold Foil, Silver Foil, Rose Gold Foil, Blind Heat Deboss, Raised Emboss, Laser Engraved
  - Lettering: Calligraphy Script (*Pinyon Script*), Timeless Serif (*Newsreader*), Modern Sans (*Instrument Sans*)
  - Configurable placement (Center / Corner) and scale (S, M, L)
- **Live Manufacturing Cost Engine & Budget Solver**:
  - Real-time transparent cost breakdown: Net leather area in sq. ft., hide rate, hardware kit, artisan bench hours, and personalization
  - Target budget tracker in INR with instant *"Within budget"* / *"Over budget"* evaluation
  - Automatic Smart Budget Alternative finder: Recommends closest valid configurations that meet the target budget with a 1-click **"Preview Alternative"** and **"Restore Original"** flow
- **Workshop Specification Build Sheet**:
  - Comprehensive technical build sheet in DM Mono with dimensions, tolerances, bill of materials, color codes, edge lacquer formulas, and pre-production checklist
  - 1-click **"Copy Workshop Spec"** and **"Download Spec (.txt)"**
  - Portable **Base64 Design Code**: Export and import exact 3D configurations across browsers and devices
- **Dual Studio View**: Toggle effortlessly between **3D Interactive Studio** and **2D Technical Artisan Blueprint**
- **AI Design Assistant**: Natural language parsing for leather, hardware, silhouettes, monograms, and budgets
- **Live Market Price Intelligence**: Source-linked supplier observation workspace with unit and currency normalization

## Texture source

The leather grain in the SVG study and Heritage Calf sample swatch uses the 1K albedo map for [Brown Leather by Rob Tuytel on Poly Haven](https://polyhaven.com/a/brown_leather). Poly Haven publishes its assets under [CC0](https://polyhaven.com/license); the texture is bundled locally at `public/textures/brown_leather_albedo_1k.jpg` so the demo does not depend on a live asset CDN.

## Important limitations

This is a working product model, not a production commerce or manufacturing system. Catalog limits, leather grades, material costs, labor assumptions, and visuals are demonstration data only. The estimate is not a supplier quote; the SVG is not dimensionally accurate; sample rule validation is not workshop approval.

No leather price is seeded in the app. The configurator shows “Quote required” until an exact, verified supplier product and approved procurement cost can be securely mapped to the chosen material. Market averages are observational comparisons, not procurement costs, and are never used as a stand-in. The supplier market workspace calculates from user-entered observations only; an empty workspace correctly shows no market average.

No supplier API/feed, scheduled server-side connector, database, authenticated admin dashboard, secure shared storage, image interpretation or generation, inventory, live quote submission, payment, or lead-time service is connected. Source refresh does not fetch any pages. Manually verify that each source permits collection and record the exact source URL, displayed value, unit, stock status and time. Market observations, exchange rates and saved design versions are stored only in this browser's local storage and are not shared or suitable for confidential production use. Portable links contain a versioned configuration snapshot, not a server-backed saved record; monogram text and freeform customer notes are excluded. Quote form data is not transmitted or retained. Reference images remain in browser memory for the current session. Do not enter sensitive customer information into this demo.

Before production use, replace the sample catalog and constraints with approved workshop data, connect authenticated server-side services, add secure persistence and access control, review uploads, and verify calculations and manufacturing specifications with qualified staff.
