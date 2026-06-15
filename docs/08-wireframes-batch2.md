# Layered Walks — Wireframes (Phase 3, batch 2)

**Status:** Low-fidelity, annotated. Completes the screen inventory from `05` §3.
**Covers:** Completion/Reflect, Build-a-walk (inputs + preview), My Tours, and the creator
bookends **Compose** + **Publish** that surround the Field-mode Record screen.

Surface key: **Paper** = Plan/Reflect/Compose/Publish (desk & sofa). **Field** = Walk/Record
(out in the city). All screens below are **Paper** — the only Field screens are Player (`06`)
and Record (`07`).

---

## Resolved: the three open questions from batch 1

1. **How celebratory is Completion?** → **Earned, quiet, editorial.** One mark, a serif
   sentence, the facts. No confetti — restraint *is* the reward for this audience (tenet 6).
2. **Build-a-walk: show the seams or hide them?** → **Show them, honestly.** A generated walk
   names the tours its stops are drawn from. With 3 tours the seams are visible anyway;
   honesty beats fake magic (tenet 8). Frame as "we picked the best stops for your hour."
3. **My Tours grouping?** → **Two sections by readiness:** *On your phone* (downloaded,
   offline-capable) first; *In your library* (owned, not downloaded) below. Offline-first
   means the downloaded set must be legible with no signal (tenet 4).

---

## 1. Completion / Reflect  (Paper — fades up from Field as the walk ends)  🟠

Where retention + the north-star metric are won. The walk ends in Field; this Paper
"afterword" fades in — you've stepped back inside.
```
┌──────────────────────────────┐
│                                │
│            ✦                   │ ① one quiet mark — NOT a confetti burst
│                                │
│   You walked Limerick          │ ② the earned statement, serif display
│   through Economics.           │
│                                │
│   7 stops · 2.4 km · 1h 12m    │ ③ the facts, mono caption
│                                │
│   ── How was it? ──            │ ④ 3-axis tap rating (~5s) — feeds reviews +
│   Quality      ☆ ☆ ☆ ☆ ☆       │    the north star. Written note optional.
│   Accuracy     ☆ ☆ ☆ ☆ ☆       │
│   Enjoyment    ☆ ☆ ☆ ☆ ☆       │
│   ▭ Add a note (optional)       │
│   ▮ Submit rating               │
│                                │
│   ── Walk another lens ──       │ ⑤ the retention hook: same city, new lens
│   ┌────────────────────────┐    │    → seeds the NEXT completed paid tour
│   │ The same streets,       │    │
│   │ through Literature   →  │    │
│   └────────────────────────┘    │
│   · Back to Discover            │
└──────────────────────────────┘
```
- Fires `tour_completed` (north star). Rating writes `reviews` (purchaser-gated, already in schema).
- "Walk another lens" links to a tour/Build-a-walk pre-filtered to a *different* lens of Limerick.

---

## 2. Build-a-walk — inputs → preview  (Paper, secondary entry)  🟡

Step 1 lives in `app/build-walk.tsx` today (time + intensity). Add **lens multi-select** and
the **preview** step.
```
STEP 1 · inputs                      STEP 2 · route preview
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ Build a walk                   │   │ ←  Your 60-minute walk         │
│                                │   │ ▭▭▭ map · route line tinted by  │
│ How much time?                 │   │     lens · numbered pins ▭▭▭   │
│ 〔30〕〔60•〕〔90〕〔120〕        │   │ 5 stops · 2.1 km · ~58 min     │
│                                │   │                                │
│ Walking intensity              │   │ Drawn from:                ①   │
│ 〔easy〕〔moderate•〕〔hard〕    │   │  · Economic Transformation (4) │
│                                │   │  · The Georgian City (1)       │
│ Lenses (your focus)        ②   │   │ ── Stops ──                    │
│ 〔📈 Economics•〕〔🏛 History•〕 │   │ 1 Bank Place        〔preview〕  │
│ 〔🏗 Architecture〕〔📖 …〕      │   │ 2 🔒 Custom House  ·Economic Tr.│ ③
│                                │   │ 3 🔒 …                          │
│ ▮ Generate my walk             │   │ ▮ Unlock & start · €9      ④   │
│                                │   │ · Save to My Tours             │
└──────────────────────────────┘    └──────────────────────────────┘
```
① **Honest seams** — name the source tours (resolved Q2). ② lens rail reused, multi-select.
③ locked stops show *which* tour unlocks them. ④ one action: if any stop is paid, "Unlock &
start"; if all owned/free, "Start". (MVP: a generated walk usually maps to ~one tour — fine.)

---

## 3. My Tours — offline-first, two sections  (Paper)  🟡
```
┌──────────────────────────────┐
│ My Tours                       │
│                                │
│ ── On your phone ──        ①   │ ① downloaded = offline-capable. FIRST.
│ ┌────────────────────────┐     │
│ │ ▭ Economic Transformation│    │
│ │ ✓ on your phone · 3 of 7 │ →  │ ② resume; progress from tour_progress
│ └────────────────────────┘     │
│                                │
│ ── In your library ──      ③   │ ③ owned, not yet downloaded
│ ┌────────────────────────┐     │
│ │ ▭ The Georgian City      │    │
│ │ ⬇ download · 84 MB       │ →  │ ④ size shown; needs connectivity
│ └────────────────────────┘     │
│                                │
│ (offline → this section dims:  │ ⑤ honest offline state, never an error
│  "connect to download")        │   banner (tenet 4)
└──────────────────────────────┘
```
- Reads the **local cache first** (`expo-sqlite`), reconciles with `purchases` when online.
- A downloaded tour must render fully here with the radio off.

---

## 4. Creator · Compose  (Paper — the desk bookend before/after Record)  🟢
```
┌──────────────────────────────┐
│ ←  New tour            Draft ● │
│ ▭ cover image (optional)       │
│                                │
│ Title       [_______________]  │
│ City        Limerick ▾         │
│ Lenses      〔📈〕〔🏛〕  + add   │ ① tour-level lens tags (tour_themes)
│ Price       € [ 9 ].[00]        │
│ Difficulty  〔easy〕〔mod•〕〔hard〕│
│                                │
│ ── Stops (3) ──    ＋ Record stop│ ② the bridge to FIELD: opens Record mode,
│ ⠿ 1  Bank Place     5:40   👁   │    which walks back here with a new stop
│ ⠿ 2  Custom House   4:10        │ ③ drag-reorder (⠿) · 👁 = mark preview
│ ⠿ 3  Treaty Stone   3:25   👁   │
│                                │
│ ▮ Submit for review            │ ④ draft → in_review (admin publishes)
└──────────────────────────────┘
```
> The loop: **Compose** (set up the tour) → tap *Record stop* → **Field Record** (walk &
> narrate, GPS-stamped) → back to Compose with the stop added. Repeat. This is the two-sided
> heart made operational.

---

## 5. Creator · Publish / review a take  (Paper)  🟢

Refine a recorded stop before submitting. One screen per stop, reached from Compose.
```
┌──────────────────────────────┐
│ ←  Review: Custom House        │
│ 〔━━━━●──────〕 4:10   ▶︎        │ ① play back the take
│ ▾ Transcript (auto-draft, edit)│ ② optional; auto-draft now, ASR later (V2)
│                                │
│ Lenses   〔Economics〕〔Georgian〕│ ③ stop-level theme/period tags (stop_themes)
│ Dwell ~  [120] s               │ ④ tunes the route engine's time budgeting
│ Radius   [35] m                │ ⑤ geofence trigger size
│ ▭ Photos (2)  ＋                │
│                                │
│ · Re-record      👁 Set preview │ ⑥ re-enter Field Record · free-taster toggle
│ ▮ Save                         │
└──────────────────────────────┘
```

---

## Inventory now complete

| Screen | Surface | Wireframed |
|---|---|---|
| Player (Walk) | Field | `06` §1 |
| Discover | Paper | `06` §2 |
| Tour detail | Paper | `06` §3 |
| Record (create) | Field | `07` §7 |
| Completion / Reflect | Paper | `08` §1 |
| Build-a-walk + preview | Paper | `08` §2 |
| My Tours | Paper | `08` §3 |
| Creator Compose | Paper | `08` §4 |
| Creator Publish | Paper | `08` §5 |
| Checkout / Download states | Paper | mostly Stripe sheet — spec, not wireframe |

Next design phase would be **Phase 5 (interaction detail)** — the geofence/arrival
transition, offline & error states, and the Record capture→upload micro-flow — but those are
better written against working code than as static frames.
