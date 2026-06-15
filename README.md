# Layered Walks

A creator-powered, GPS-enabled walking-tour platform that lets people experience cities
through multiple intellectual lenses. MVP launch city: **Limerick**.

> Planning docs live in [`docs/`](docs/): the
> [database schema](docs/01-database-schema.md),
> [architecture & API](docs/02-architecture.md), and
> [MVP build plan](docs/03-build-plan.md). Read those first — this repo is the scaffold
> that implements them.

---

## ⚠️ Before you `npm install` — this folder is in OneDrive

`node_modules` is tens of thousands of files. Letting OneDrive sync it will hammer your
disk and CPU and can corrupt installs. **Strongly recommended:** move this project out of
the synced OneDrive path before installing, e.g.

```bash
mv "~/Library/CloudStorage/OneDrive-UniversityofLimerick/Claude/TravelApp" ~/dev/layered-walks
```

If you must keep it here, exclude `node_modules/` from OneDrive sync. `.gitignore` already
keeps it out of git.

---

## Stack

| Layer | Choice |
|---|---|
| App | React Native via **Expo** (SDK 52) + **Expo Router** (file-based) |
| Backend | **Supabase** — Postgres 15 + **PostGIS**, Auth, Storage, Edge Functions |
| Payments | **Stripe Connect** (Express, destination charges) |
| Maps | **Mapbox** (`@rnmapbox/maps`, offline regions, Matrix/Directions) |
| Audio / GPS | `expo-av`, `expo-location` (geofencing) |
| Offline | `expo-sqlite` + `expo-file-system` |
| Analytics | PostHog |

## Setup

```bash
# 1. Install deps (see OneDrive warning above first)
npm install
npx expo install --fix          # reconcile native dep versions to the SDK

# 2. Client env
cp .env.example .env            # fill EXPO_PUBLIC_* values

# 3. Local backend (needs Docker + Supabase CLI via npx)
npx supabase start              # boots Postgres+PostGIS, applies migrations + seed
npm run db:types                # regenerate src/types/database.ts from the live schema

# 4. Edge functions (separate secrets file)
#    create supabase/.env with STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, etc.
npm run fn:serve

# 5. Run the app
npm start                       # then press i / a, or scan with Expo Go (dev build needed
                                # for Mapbox + Stripe native modules)
```

> Native modules (`@rnmapbox/maps`, `@stripe/stripe-react-native`) require an **EAS dev
> build**, not plain Expo Go. `npx eas build --profile development`.

## Project structure

```
app/                       Expo Router routes (screens)
  _layout.tsx              root stack + auth gate
  (auth)/sign-in.tsx       email auth (Google/Apple TODO sprint 1)
  (tabs)/                  Discover · My Tours · Profile
  tour/[id].tsx            tour detail + buy
  build-walk.tsx           the layered route-engine flow
  player/[tourId].tsx      GPS-triggered audio player
src/
  lib/                     supabase client, env
  features/                auth · catalog · route-engine · payments  (offline TODO)
  theme/                   colors
  types/database.ts        generated Supabase types (placeholder until db:types)
supabase/
  migrations/0001..0009    schema, functions/triggers, RLS  (mirrors docs/01)
  functions/               routes-generate · checkout · stripe-webhook ·
                           downloads-manifest · creators-onboard
  seed.sql                 Limerick + 7 theme lenses + periods
docs/                      PRD-derived planning package
```

## Status

This is **scaffold-level**. The schema + RLS are complete and migration-ready; screens and
Edge Functions are wired skeletons with `TODO(sprint N)` markers pointing at
[`docs/03-build-plan.md`](docs/03-build-plan.md). Nothing here is production-tested.

Known scaffold gaps to close first:
- `assets/icon.png` + splash are referenced in `app.json` but not included — add real assets.
- City id is hard-coded as a placeholder in `app/(tabs)/index.tsx` and `build-walk.tsx` —
  read it from the `cities` table.
- Screens are visually real but behaviourally stubbed — no live audio/GPS/recording or real
  tour data yet (Sprints 4–6). Player & Record use a dev toggle to preview their states.

> **Verified 2026-06-15** against a clean Expo SDK 52 install: `tsc --noEmit` ✓, `eslint` ✓
> (0 errors), `expo install --check` ✓ (deps aligned). Deno Edge Functions under
> `supabase/functions/` are excluded from the app `tsconfig` and checked by the Supabase CLI.
> Discover, the audio-first Player (both states), and the Record screen were also **rendered
> live** via Expo Web and visually confirmed against the editorial design.

### Troubleshooting (found during the live render)
- **`Unable to resolve module @opentelemetry/api`** when bundling: `@supabase/supabase-js`
  imports it optionally and Metro resolves it statically. It's now a direct dependency — keep it.
- **`Cannot find module 'ajv/dist/compile/codegen'`** (web/Metro start): an `ajv` v6/v8
  hoisting clash from `--legacy-peer-deps`. Fix: `npm i ajv@^8`. A clean install via
  `npx expo install` usually avoids it.
