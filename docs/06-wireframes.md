# Layered Walks — Wireframes (Phase 3, batch 1)

**Status:** Low-fidelity, annotated. Structure & priority only — NOT visual design (that's
Phase 4). Boxes show *hierarchy and behaviour*, not final type/colour/spacing.
**This batch:** the three highest-stakes screens — Player (Walk), Discover (hero), Tour
detail. Reflect, Build-a-walk, My Tours follow in batch 2.

Legend: `▮` primary action · `·` secondary · `〔 〕` audio · `▭` image/map · `①②` annotations.

---

## 1. Player — Walk mode (audio-first minimal)  🔴

The screen people actually walk with. Designed first, protected hardest. Two states:
**between stops** (collapsed, calm) and **at a stop** (audio playing).

### 1a. Between stops — the resting state
```
┌──────────────────────────────┐
│  ✕                    Limerick │ ①  thin top bar: close + tour name only
│        Economic Transformation │    (no menus, no clutter — tenet 6)
│                                │
│                                │
│         ◉  3 of 7 stops        │ ②  HUGE, glanceable progress. This is the
│                                │    whole screen's job between stops.
│      Next: Bank Place          │ ③  where you're headed, plain language
│      ~4 min walk · 250 m       │
│                                │
│   "Keep walking — I'll start    │ ④  reassurance copy: phone can go in pocket
│    when you arrive."            │    (tenet 1 — audio is the protagonist)
│                                │
│                                │
│  ┌──────────────────────────┐  │
│  │ ▭  map strip (glance)   ⤢ │  │ ⑤  COLLAPSED map: a glance, not a focus.
│  └──────────────────────────┘  │    Tap ⤢ to expand full-screen if lost.
│                                │
│   ⏸ Pause walk      ⏮ Replay   │ ⑥  thumb-zone controls. Big targets (tenet 2,7)
└──────────────────────────────┘
```
Notes:
- **No decisions required here.** It's an ambient state. (tenet 2)
- Works fully offline; geofences for all 7 stops armed locally. (tenet 4)
- Survives screen-lock & backgrounding — audio + geofence continue; lock-screen shows
  now-playing controls.
- Battery: geofence transitions, not a location poll.

### 1b. At a stop — audio playing
```
┌──────────────────────────────┐
│  ✕                    Limerick │
│                                │
│  ▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭ │ ①  ONE image, full-bleed. Look up from
│  ▭   Bank Place, 1860s      ▭ │    phone to the real thing, glance back.
│  ▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭ │
│                                │
│  STOP 3 · Economics · Georgian │ ②  lens + period tags = "why this stop"
│  Bank Place                    │    (tenet 8 — show the expertise)
│                                │
│  〔━━━━━━━●─────────〕 2:14 / 5:40│ ③  audio scrubber — the primary content
│                                │
│     ⏮        ⏯ ⏸        ⏭      │ ④  transport controls, large, centred
│                                │
│  ▾ Read transcript             │ ⑤  optional text (accessibility + noisy
│  ▾ See on map                  │    streets). Collapsed by default (tenet 6).
└──────────────────────────────┘
```
Notes:
- Auto-played on geofence arrival; **replayable**, **pausable** — never auto-advances past
  a stop the user is still standing at.
- Transcript & map are *pull*, not push — hidden until asked (tenet 1, 6).
- Missed geofence fallback: a quiet "I'm here →" affordance appears in 1a if GPS drifts.

---

## 2. Discover — curated hero, sliced by lens  🔴

The front door. Editorial, not a marketplace grid. The lens rail is the signature gesture.
```
┌──────────────────────────────┐
│  Limerick            ◐ profile │ ①  city as a quiet wordmark (one city @ MVP)
│                                │
│  ╭────────────────────────────╮│
│  │ ▮ Build a walk for the time ││ ②  generative entry — present but SECONDARY
│  │   you have                → ││    (hero = curated). One banner, not a tab.
│  ╰────────────────────────────╯│
│                                │
│  Lenses                         │ ③  THE gesture. Horizontal, tactile chips.
│  〔🏛 History〕〔📈 Economics〕▸ │    Selecting one re-slices everything below.
│  〔🏗 Architecture〕〔📖 …〕     │    (tenet 5)
│                                │
│  ── Featured in Limerick ──    │ ④  editorial section header, not "results"
│  ┌────────────────────────────┐│
│  │ ▭▭▭▭ cover                 ││ ⑤  TALL, editorial cards. One per row —
│  │ Economic Transformation    ││    magazine feel, not a dense store grid
│  │ Shannon · FDI · decline    ││    (tenet 6). Lens tags as kicker.
│  │ 75 min · moderate   ★4.8 €9││
│  └────────────────────────────┘│
│  ┌────────────────────────────┐│
│  │ ▭▭▭▭ cover                 ││
│  │ The Georgian City          ││
│  │ 60 min · easy       ★4.9 €7││
│  └────────────────────────────┘│
│                                │
│ ─────────────────────────────  │
│   ◎ Discover   ▣ My Tours  ◐   │ ⑥  3-tab bar
└──────────────────────────────┘
```
Notes:
- With 3 tours, **curation is the design** — a short, confident, editor-voiced list beats an
  infinite grid. As the catalog grows, sections multiply ("New," "By period," "Hidden").
- A selected lens filters cards *and* swaps the section voice ("Limerick through Economics").
- Cards lead with the *intellectual hook* (the sub-themes line), then logistics, then price.

---

## 3. Tour detail — editorial page  🟠

Sells through credibility, not hype (tenet 8). Reads like a feature article with a buy bar.
```
┌──────────────────────────────┐
│  ←                          ⌄ │
│  ▭▭▭▭▭▭▭▭ cover ▭▭▭▭▭▭▭▭▭▭▭▭ │
│  Economic Transformation       │ ①  title over image; serif display (Phase 4)
│  📈 Economics · 📈 since 1995   │    lens + period kicker
│                                │
│  75 min · 2.4 km · moderate    │ ②  logistics strip, scannable
│  ★ 4.8 (32)                    │
│                                │
│  By Dr — — —, economic         │ ③  CREATOR CREDENTIALS up high — the
│  historian, Univ. of Limerick →│    trust signal that justifies the price
│                                │
│  A walk through Shannon-era     │ ④  editorial summary — real writing, the
│  ambition, FDI, decline and the │    sample of quality that earns the sale
│  long recovery. ▾ more          │
│                                │
│  ── Stops (7) ──                │ ⑤  stop list; PREVIEW stops playable free
│  1 ● Bank Place        〔preview〕│    (RLS gate), rest show 🔒 until bought
│  2 🔒 Custom House              │
│  3 🔒 …                         │
│                                │
│  ── Reviews ──                  │ ⑥  social proof, brief
│  ★★★★★ "Genuinely changed how…" │
│                                │
│ ┌────────────────────────────┐ │
│ │ ▮  Buy · €9.00             │ │ ⑦  STICKY buy bar (or "Download" if owned).
│ └────────────────────────────┘ │    The only loud, deliberate action (tenet 7)
└──────────────────────────────┘
```
Notes:
- Pre-purchase, the screen is honest: a free **preview stop** you can actually play, the
  rest visibly locked. No dark patterns. (tenet 6, 8)
- Owned → the buy bar becomes **Download**, then **Start walk** when ready (Flow B states).
- Creator credentials link to a bio — expertise is the product (tenet 8).

---

## Open questions for batch 2

1. **Reflect/Completion** — how celebratory? A restrained editorial "you finished" vs a
   warmer reward moment. (Affects whether Reflect feels earned or perfunctory.)
2. **Build-a-walk preview** — show the *source tours* a generated route draws from, or hide
   the seams and present it as one seamless walk? (Honesty vs magic.)
3. **My Tours** — split "Downloaded" vs "Owned, not downloaded" as two sections, or one list
   with state badges?
