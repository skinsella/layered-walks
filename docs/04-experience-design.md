# Layered Walks — Experience Design (foundations)

**Status:** Living design doc. This file holds the *durable* decisions (tenets, the
three-mode model, the process). Screen-level wireframes and the visual system land in
later sections as we work down the process below.

---

## 0. The process we're following

| Phase | Output | Gates on |
|---|---|---|
| **0. Tenets** (this doc) | Design principles + the Plan/Walk/Reflect model | — |
| **1. Information architecture** | Navigation model, screen map, what's a tab vs a flow | Hero-experience decision |
| **2. Core flows** | First-run, discover→buy→download, build-a-walk, walk-the-tour, complete→rate, creator-build | IA |
| **3. Wireframes** | Low-fi annotated layouts for the ~12 key screens | Flows |
| **4. Visual & brand language** | Colour, type, the "lens" motif, iconography, motion | Brand-tone decision |
| **5. Interaction detail** | Audio player, geofence transitions, offline & error states | Wireframes + visual |
| **6. Design system** | Component inventory mapped onto the Expo scaffold | All above |

We won't do these strictly linearly — Walk-mode wireframes (Phase 3) deserve to jump the
queue because they're the highest-risk surface.

---

## 1. Design tenets

Derived from the PRD's product principles (§6), sharpened into rules we can hold a screen
against.

1. **Audio is the protagonist; the screen is the supporting actor.** If a feature needs the
   eyes more than the ears during a walk, it's probably wrong. The default walking state is
   *phone in pocket, voice in ears.*
2. **Eyes up, not down.** Design the Walk experience for someone moving through real streets:
   glanceable in <2 seconds, one-handed, large tap targets, legible in direct sunlight,
   safe to ignore. We are competing with the city itself for attention — and the city should win.
3. **Three apps in one.** Plan, Walk, Reflect have radically different information density.
   Never let Plan's richness leak into Walk's calm. (See §2.)
4. **Offline is a state of confidence, not degradation.** A downloaded tour should feel
   *more* solid, not like a stripped-down fallback. "Downloaded" is a first-class, celebrated
   state — never an apologetic "you're offline" banner.
5. **Lenses are the navigation metaphor.** Themes aren't a filter buried in settings — they
   are *how you slice a city*. The core gesture of the product is choosing lenses. Make that
   gesture central, tactile, and visible.
6. **Editorial restraint over feature density.** The audience is curious and educated;
   credibility comes from typography, curation, and the quality of the writing — not from
   chrome, badges, or gamification. When in doubt, remove. Narrative over information overload.
7. **Friction only where money or trust lives.** Purchase and creator-publish *should* feel
   deliberate. Everything else — starting, pausing, replaying, saving — is one tap, no dialog.
8. **Trust is designed, not assumed.** Surface creator credentials, "why this stop matters,"
   accuracy signals, and source provenance. The product's promise is *authentic local
   expertise* — show the expertise, don't just claim it.
9. **Two-sided by design — the app is the studio *and* the venue.** Creators don't author at
   a desk; they **record in the field**, walking the route and narrating each stop in situ
   while the app captures the GPS. Creation and consumption are mirror images of the same
   walk, so every field affordance (geofencing, big controls, offline tolerance, eyes-up
   legibility) must serve *both* the recorder and the listener.

---

## 2. The Plan / Walk / Reflect model (the spine)

Everything in the app belongs to exactly one of three modes. They share data, not design.

### PLAN — *before the walk* (online, can be rich)
- **Job:** discover or compose a walk, decide, pay, download.
- **Mindset:** browsing on a sofa or a café; curious, comparing, deciding.
- **Density:** high is OK — covers, summaries, maps, sample audio, reviews, creator bios.
- **Surfaces:** Discover, Tour detail, Build-a-walk, Checkout, Download.
- **Success:** the user starts a walk *or* downloads one for later with confidence.

### WALK — *during the walk* (offline, radically minimal) ← **design this first**
- **Job:** get the right audio at the right place, hands-free, safely.
- **Mindset:** moving, looking around, half-attending to the phone, possibly poor signal.
- **Density:** near-zero. One stop at a time. Big now-playing. A map you can *glance* at.
  Auto-trigger on arrival; manual replay/pause within thumb reach.
- **Surfaces:** the Player (map + now-playing + minimal controls), nothing else.
- **Hard constraints:** works fully offline; survives backgrounding + screen-lock;
  battery-aware (geofencing, not polling); legible outdoors; never demands a decision while moving.
- **Success:** the user finishes the walk having mostly *looked at the city, not the screen.*

### REFLECT — *after the walk* (online or deferred)
- **Job:** close the loop, capture the rating, invite the next walk.
- **Mindset:** finished, satisfied (or not), open to "what next."
- **Density:** medium. A completion moment worth earning; a fast 3-axis rating; a nudge:
  *"You walked Limerick through Economics. Walk it again through Literature?"*
- **Surfaces:** Completion, Rating/Review, "Next lens" suggestions.
- **Success:** rating captured (feeds the north-star + quality loop) and a *next* walk seeded.
  This mode is where retention and the north-star metric ("completed paid tours") are won.

> **Why this matters for the build:** the scaffold already separates the Player as a
> full-screen modal (`app/player/[tourId].tsx`) — that's the Walk mode getting its own
> visual world. Reflect currently has no home; it'll be a screen reached on completion, not a tab.

---

## 2b. The creator mirror: Compose / Record / Publish

Layered Walks is **two-sided**. The consumer's Plan → Walk → Reflect has a creator twin that
shares the same field world:

| Consumer | Creator | Shared world |
|---|---|---|
| **Plan** — discover/compose, buy, download | **Compose** — scaffold a tour: title, lenses, price, rough route | desk / sofa; rich |
| **Walk** — GPS *triggers* playback, stop by stop | **Record** — GPS *captures* each stop as you stand there; narrate live | **FIELD MODE** — in the city, eyes-up, audio-centric, offline-tolerant |
| **Reflect** — rate, next lens | **Publish** — review takes, set previews, submit for moderation | desk; deliberate |

**The key insight:** Walk and Record are the *same screen, inverted*. They share one visual
language (the Field Mode, defined in `07-visual-language.md`) and one set of field
affordances. Recording lives **in the app, not a web back-office** — that's what dissolves the
PRD's "high barriers to app creation" (§3): a historian just walks their tour and talks.

**Ripples to fold in** (tracked here so they're not lost; built in their own sprints):
- **Schema** (future migration `0011`): stops already carry `location` + `audio_path`; add
  `recorded_at`, `gps_accuracy_m`, and `audio_source ('recorded' | 'uploaded')`. Live capture
  writes stop rows straight into a draft tour.
- **Architecture:** a creator-audio capture→upload path — record locally (`expo-av`) → upload
  to a private, creator-owned Storage path → set `audio_path`. RLS: creators write only their
  own stops' assets; no public read.
- **IA / flows:** Flow F (creator) gains a **Record** sub-mode that reuses the Player's shell.
- **Build plan:** the creator portal (Sprint 6) is no longer "internal-only, least-polished" —
  Record mode is a *first-class field surface* and should be scheduled accordingly. (Update
  `03-build-plan.md` when we re-plan; flagged here.)

---

## 3. Design decisions (locked 2026-06-15)

1. **Hero experience = curated tours first.** The 3 flagship Limerick tours are the editorial
   hero; "build-a-walk" is a secondary delighter that grows as the catalog fills. Rationale:
   a generator needs a dense stop pool to feel magical, and 3 tours is thin soil at launch.
2. **Brand tone = editorial / authoritative.** Magazine/museum register: serious typography,
   restrained palette, credibility through curation and writing. Drives the Phase-4 visual
   system (and a revision of the scaffold's placeholder theme — see Phase 4).
3. **Walk-mode bias = audio-first minimal.** The Player defaults to a large now-playing card;
   the map is a glanceable strip the user expands on demand. Maximises "eyes up, phone in
   pocket." (We may still adopt the *adaptive* refinement later — map-forward between stops,
   audio-first on arrival — but the default and the MVP build target is audio-first.)

These three are consistent: curated + editorial + audio-first all favour restraint and depth.
They are now assumptions baked into Phases 1–3 below.
