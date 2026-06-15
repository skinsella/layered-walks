# Layered Walks — Visual & Brand Language (Phase 4)

**Status:** The look. Translates *editorial / authoritative* into concrete tokens, and
defines the **Field Mode** shared by Walk (consume) and Record (create).
**Implemented in:** `src/theme/colors.ts`, `src/theme/typography.ts` (tokens land as code).

---

## 1. The idea in one line

> A field guide that reads like a good magazine and works like a tour guide's earpiece.

Paper, ink, and a single lantern-amber accent. Serious serif headlines over clean sans text.
Full-bleed period photography. Restraint everywhere — the city is the spectacle, the UI is the
margin notes.

---

## 2. Two surfaces

The app physically lives in two places, so it has two surface systems. Same brand, inverted.

### PAPER — Plan & Reflect (reading, browsing, deciding)
Warm off-white, never stark. Editorial whitespace. Ink text. This is the "magazine."

| Token | Hex | Use |
|---|---|---|
| `bg` | `#FAF7F1` | warm paper base |
| `surface` | `#FFFFFF` | raised cards |
| `surfaceAlt` | `#F3EEE4` | subtle fills, chips |
| `border` | `#E6DFD2` | hairlines (1px, used sparingly) |
| `text` | `#1B1712` | warm ink — primary |
| `textMuted` | `#6E6557` | secondary ink |
| `primary` | `#B0742A` | lantern ochre — the one accent |
| `primaryText` | `#FFFFFF` | on accent |

### FIELD — Walk & Record (out in the city, eyes-up)
Warm near-black for OLED battery + glance contrast + a clear "different world" signal
(tenet 3). Paper-white type, brighter amber. **Both the listener and the recorder live here.**

| Token | Hex | Use |
|---|---|---|
| `field.bg` | `#14110C` | warm ink base |
| `field.surface` | `#1E1A13` | cards, map strip |
| `field.border` | `#332C20` | dividers |
| `field.text` | `#F5F0E6` | paper-white |
| `field.textMuted` | `#A89D88` | secondary |
| `field.accent` | `#E0A458` | lantern amber (brighter on dark) |
| `field.accentText` | `#1A1206` | on amber |
| `field.recording` | `#D8534A` | the REC state — creator only |

> Continuity: `field.accent` is the original scaffold amber. The brand's amber survives; the
> paper surface is what's new.

---

## 3. The seven lenses (the signature colours)

Each lens gets one **museum-muted** hue — sophisticated, not candy (tenet 6). These colour the
lens chips, the stop tags, and the route line. Keys match the `themes.slug` seed values.

| Lens | Hex | Note |
|---|---|---|
| History `history` | `#8C7A5B` | stone / sepia |
| Economics `economics` | `#2F6E66` | verdigris |
| Architecture `architecture` | `#4A5A78` | slate blue |
| Politics `politics` | `#8A3B3B` | oxblood |
| Food `food` | `#B5642E` | paprika |
| Literature `literature` | `#3E3A6E` | ink indigo |
| Hidden Gems `hidden-gems` | `#5E6B3A` | moss |

---

## 4. Typography

The editorial pairing carries the whole "authoritative" feel. Display serif = the
intellectual voice; sans = the quiet workhorse.

- **Display — Fraunces** (variable serif, modern-editorial, a little characterful).
  Tour titles, section heroes, the wordmark voice. Alternatives if licensing/perf bites:
  Newsreader, Spectral, Source Serif.
- **Text/UI — Inter.** Body, controls, metadata. Free, superb at small sizes on device.
- **Mono — Space Mono.** Only in Record mode: live coordinates, take timecodes (it *should*
  read as instrumentation).

**Scale** (see `typography.ts` for exact tokens):
`hero` 34/38 serif · `title` 24/28 serif · `section` 13 sans caps tracked · `body` 16/24 sans ·
`caption` 13/18 sans. **Field mode oversizes**: `fieldStat` 40/44 serif, `fieldLabel` 18/24 sans.

**Rules:** serif for *names and ideas*, sans for *facts and actions*. Never serif a button.
One display weight, one or two text weights — restraint.

---

## 5. The "lens" motif

The brand's central metaphor — *seeing one city through different lenses* — needs a visual
form, used consistently:

- **Aperture mark.** The logo/wordmark is built from concentric lens rings (an aperture / optical
  lens). Selecting lenses "focuses" the same point through different tints.
- **Tinting, not labelling.** A selected lens *tints* the experience: the route line, the active
  stop pin, and the Discover section voice all take the lens hue. Multiple lenses → a stop shows
  small **stacked colour dots** (the literal "layers").
- **Overlap = depth.** Where two lenses both touch a stop, show their hues as two overlapping
  translucent circles (a 2-set Venn) — the product's whole thesis in one glyph.
- **Restraint:** lens colour is an *accent on paper/ink*, never a full background. The page stays
  editorial; the lens is the highlighter.

---

## 6. Imagery, maps, icons, motion

- **Photography:** full-bleed, documentary/period, slightly warm-graded to sit on paper. One
  strong image per stop beats a gallery (tenet 6). This is the visual reward for looking up.
- **Maps:** a custom muted Mapbox style — desaturated paper-toned base so the lens-tinted route
  line and stop pins are the only saturated thing. The map recedes; the walk reads.
- **Icons:** one thin-line family (Phosphor / Lucide, light weight) — quiet, consistent stroke,
  faintly classical. (MVP may keep the emoji lens glyphs from the seed; production swaps to
  custom thin-line lens marks.)
- **Motion:** editorial calm. **Crossfades over slides.** Stop *arrival* = a gentle fade-up of
  image + audio, not a bouncy reward. Record *capture* = one soft confirm pulse. The only
  living, pulsing element anywhere is the REC dot.

---

## 7. Field Mode — the two-sided heart

Walk and Record share this surface, type scale, and affordances. Below: the **Record** screen
as the deliberate mirror of the Player (`06-wireframes.md` §1). Same shell, inverted job.

### Record — the creator's field screen (mirror of the Player)
```
┌──────────────────────────────┐
│  ✕                 ● REC 0:42 │ ① status line: REC dot (field.recording) + take time (mono)
│        The Georgian City       │    the tour being recorded (field.text, serif)
│                                │
│          ◉  Stop 3            │ ② which stop you're capturing — mirrors "3 of 7"
│   52.6638, −8.6267   ±4 m      │ ③ LIVE gps + accuracy (mono) — auto-stamped, no pin-dropping
│   Custom House  (working)     │    editable working title
│                                │
│         ╭──────────╮           │
│         │    ●     │           │ ④ BIG record button — sits exactly where the listener's
│         ╰──────────╯           │    now-playing sits. Tap to start/stop.
│     〔 ▁▂▅▇▇▅▂▁ 〕 0:42         │ ⑤ live waveform + length (the "audio is protagonist" twin)
│                                │
│   · Retake        · Add photo  │ ⑥ secondary, thumb-zone — same position as Replay/Map
│  ┌────────────────────────────┐│
│  │ ▮  Save stop & walk on  →  ││ ⑦ commit; GPS re-arms to stamp the next stop on arrival
│  └────────────────────────────┘│
└──────────────────────────────┘
```
Symmetry table (why this is one design, not two):
| Element | Walk (listen) | Record (create) |
|---|---|---|
| Big central control | now-playing card | record button |
| GPS role | **triggers** audio | **stamps** the coordinate |
| Audio element | scrubber | live waveform |
| Progress | "3 of 7 stops" | "Stop 3 captured ✓" |
| Secondary actions | Replay · Map | Retake · Add photo |
| Primary action | (auto-advance on walk) | Save stop & walk on |

Both inherit: warm-ink Field surface, oversized field type, offline tolerance, lock/background
survival, geofencing-not-polling, sunlight legibility.

---

## 8. Applying to the scaffold

- **Done now:** `src/theme/colors.ts` rewritten to the Paper + Field + Lens tokens above;
  `src/theme/typography.ts` added with the Fraunces/Inter/Space-Mono scale.
- **Font loading:** `app/_layout.tsx` gains a `useFonts` gate (deps added to `package.json`:
  `expo-font`, `@expo-google-fonts/fraunces`, `/inter`, `/space-mono`). Verify exact weight
  export names after `npm install`.
- **Next (when we "make it real"):** adopt `field.*` in `player/[tourId].tsx`; build the lens
  rail on Discover with lens hues; switch Player + Record to the Field surface; commission the
  aperture wordmark + custom Mapbox style.
