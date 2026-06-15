# Layered Walks — Information Architecture & Core Flows

**Status:** Phase 1–2 output. Builds on `04-experience-design.md`.
**Locked assumptions:** hero = curated tours · tone = editorial/authoritative · Walk =
audio-first minimal.

---

## 1. Navigation model

Three tabs, no more (tenet 6 — editorial restraint). The Walk experience escapes the tab
chrome entirely into its own full-screen world (tenet 3). Reflect is a *moment*, not a tab —
it's reached on completion.

```
ROOT
├─ (auth)  Sign in / Sign up                         [pre-session only]
│
└─ (tabs)  ── persistent bottom bar ──
   │
   ├─ ◎ Discover            ← HERO. Curated tours, sliced by lens.
   │     ├─► Tour detail     (editorial page; preview stops; reviews)
   │     │     └─► Checkout ─► Download ─► "Ready to walk"
   │     └─► Build a walk     (secondary entry — generative engine)
   │           └─► Route preview ─► Save / Start
   │
   ├─ ▣ My Tours           ← Owned + downloaded. OFFLINE-FIRST.
   │     └─► Tour detail / "Start walk"
   │
   └─ ◐ Profile            ← Prefs (lenses, duration, intensity), account,
         └─► Become a creator   "become a creator" (internal-only at MVP).

FULL-SCREEN MODES  (cover the tab bar entirely)
   └─ ▶ Player (WALK)  ──►  ★ Completion (REFLECT)  ──►  Rating  ──►  "Next lens"
```

### Rules
- **Lenses are a persistent rail on Discover**, not a buried filter (tenet 5). Choosing a lens
  re-slices the curated set; it's the product's signature gesture.
- **Build-a-walk is one tap from Discover but visually secondary** — a banner/CTA, not a tab
  (hero = curated decision).
- **My Tours reads the local cache first** (tenet 4) — it must render with zero connectivity,
  showing downloaded tours as confidently-present, online ones as "tap to download."
- **The Player is launched, not navigated to.** Entering it is a deliberate "begin" action;
  leaving it returns you to where you were. It is the only place audio auto-plays.

### Maps to the scaffold
| IA node | File in repo |
|---|---|
| Discover | `app/(tabs)/index.tsx` |
| Build a walk | `app/build-walk.tsx` |
| My Tours | `app/(tabs)/library.tsx` |
| Profile | `app/(tabs)/profile.tsx` |
| Tour detail | `app/tour/[id].tsx` |
| Player (Walk) | `app/player/[tourId].tsx` (full-screen modal — already isolated) |
| Completion (Reflect) | **TODO** — new screen, reached from Player on 100% |

---

## 2. Core flows

Notation: `→` step · `◇` decision · `[state]` · *(tenet n)* reference.

### Flow A — First run (deliberately light)
Editorial restraint means we do **not** gate the app behind a long onboarding.
```
Launch (no session)
 → Sign in / Sign up (email; Google/Apple)            (tenet 7: friction only for trust)
 → [first session] One screen: "Which lenses interest you?" (optional, skippable)
 → Land on Discover, pre-filtered to chosen lenses (or all)
```
- No tutorial carousel. The product teaches itself through the lens rail + one curated row.
- City is fixed to Limerick at MVP (no city picker yet) — silent default.

### Flow B — Discover → Buy → Download  *(the hero path)*
```
Discover
 → tap a lens (e.g. "Economics")        re-slices curated tours        (tenet 5)
 → tap a tour card
 → Tour detail: summary, est. time/distance/difficulty, map preview,
   PREVIEW stops (free), creator credentials, reviews                  (tenet 8: show expertise)
 → ◇ owned already?
     ├─ yes → "Download" → [downloading] → [ready to walk] → Start
     └─ no  → "Buy €X" → Checkout (Stripe sheet)        (tenet 7: deliberate)
              → webhook grants content → "Download" → [ready] → Start
```
Key states: `preview` (pre-purchase, RLS shows only preview stops) · `owned` ·
`downloading` (progress + size) · `ready` (offline-complete, celebrated — tenet 4).

### Flow C — Build a walk  *(secondary / generative)*
```
Discover → "Build a walk for the time I have"
 → pick: time budget · intensity · lenses           (the 3 inputs; reuse the lens rail)
 → [composing…] calls routes-generate
 → Route preview: ordered stops on a map + total time/distance + which tours they're drawn from
 → ◇ contains paid stops?
     ├─ all owned/free → Start
     └─ some paid      → show which tour(s) to buy → Checkout → Start
 → (optional) Save this route to My Tours
```
> MVP honesty: with 3 tours, a generated walk will often map to ~one tour's stops. That's
> fine — frame it as "we picked the best stops for your 60 minutes," not as magic.

### Flow D — Walk the tour  *(THE core experience — offline, audio-first)*
```
Start (from My Tours / ready tour)
 → Player opens full-screen, map strip collapsed, big now-playing       (tenet 1, 3)
 → geofence armed for every stop (offline)                              (tenet 2)
 → walk… [approaching next stop] subtle cue
 → [arrived] audio AUTO-PLAYS; now-playing shows title + transcript toggle
 → controls within thumb reach: ⏯ pause · ⏮ replay · expand map         (tenet 7)
 → repeat per stop; progress persists locally (tour_progress)
 → ◇ last stop finished → Completion (Reflect)
```
Hard constraints (tenet 4 + 2): fully offline · survives lock/background · battery via
geofencing not polling · sunlight-legible · never demands a decision while moving.
Edge cases to design: GPS drift / missed geofence (manual "I'm here") · stops out of order ·
signal loss mid-walk (no-op, it's offline) · battery saver killing background location.

### Flow E — Complete → Rate → Next lens  *(Reflect — where retention is won)*
```
Completion screen: earned moment — "You walked Limerick through Economics."
 → quick 3-axis rating: Quality · Accuracy · Enjoyment (taps, ~5s)      (feeds north star)
 → optional written review
 → "Next lens" nudge: "Walk this city through Literature?" → Tour detail / Build-a-walk
 → fires tour_completed (north-star metric: completed paid tours)
```

### Flow F — Creator: build a tour  *(internal-only at MVP — design lightly)*
```
Profile → Become a creator → (Stripe Connect onboarding, deferred)
 → New tour: title, city, lenses, price, difficulty
 → Stop builder: drop pin on map → title, description, narration, audio upload,
   images, dwell time, theme/period tags                                 (mirrors schema §4)
 → Reorder stops · set preview stops
 → Submit for review (draft → in_review)
 → [admin publishes via internal tool] → published
```
> At launch you author the 3 flagship tours through this same tooling (dogfooding). The
> creator UI can be the *least* polished surface in MVP — it has one user (you).

---

## 3. Screen inventory (for Phase 3 wireframing)

Priority order = design risk, not nav order.

| # | Screen | Mode | Priority | Wireframed in `06` |
|---|---|---|---|---|
| 1 | **Player** (audio-first) | Walk | 🔴 highest | ✅ |
| 2 | **Discover** (curated + lens rail) | Plan | 🔴 hero | ✅ |
| 3 | **Tour detail** (editorial) | Plan | 🟠 | ✅ |
| 4 | **Completion / Reflect** | Reflect | 🟠 north-star | next |
| 5 | Build-a-walk inputs + route preview | Plan | 🟡 | next |
| 6 | My Tours (offline-first) | Plan | 🟡 | next |
| 7 | Checkout / Download states | Plan | 🟢 mostly Stripe | next |
| 8 | Creator stop-builder | (creator) | 🟢 internal | later |
