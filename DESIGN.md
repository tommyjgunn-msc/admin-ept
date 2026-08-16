# Futurimi graphics standards

> ⚠ **MIRRORED FILE.** An identical copy lives in `ept-portal/DESIGN.md`.
> Change both in the same sitting.

The student portal and the admin console are one product. This file is the
standard both halves are held to. It exists because the previous design drifted
one arbitrary value at a time — `text-[12.5px]`, `mb-[26px]`, six corner radii,
four accent hues — and arbitrariness is the thing that makes an interface look
like nobody chose.

---

## Where this came from

Seven sources, none of them software:

| Source | What it gave us |
|---|---|
| [Vignelli & Noorda, *NYCTA Graphics Standards Manual*, 1970](https://standardsmanual.com/products/nycta-graphics-standards-manual-full-size-edition) | A fixed thing always appears in a fixed place. The exam status band never moves. |
| [Otl Aicher, Munich 1972 pictograms](https://www.smithsonianmag.com/innovation/this-graphic-artists-olympic-pictograms-changed-urban-design-forever-180978256/) | Every icon on one grid: 24×24, 1.5px, square caps, strokes only horizontal, vertical or 45°. |
| [Edward Tufte, data-ink ratio](https://jtr13.github.io/cc19/tuftes-principles-of-data-ink.html) | Boxes and shadows are chartjunk. Rules instead of cards; tables instead of stat tiles. |
| [Kris Sowersby, *Financier* for the FT](https://klim.co.nz/blog/financier-design-information/) | This product is mostly figures. Tabular numerals everywhere, numbers right-aligned. |
| [GOV.UK Design System](https://design-system.service.gov.uk/) and the [Government Design Principles](https://www.gov.uk/guidance/government-design-principles) | "Accessible design is good design… if elegance must be sacrificed, so be it." Error summaries, visible focus, large targets. |
| [*Stress by Design?*, Mensch und Computer 2025](https://dl.acm.org/doi/10.1145/3743049.3748538) | 30% of students said interface design hurt their exam performance. Uncluttered visuals and prior familiarity reduce stress. |
| [Imigongo](https://en.wikipedia.org/wiki/Imigongo) — Rwandan relief painting, Gisaka, Eastern Province | The palette and the one ornament. Diamonds and zigzags on black, in red and earth colours. |

---

## Colour

One accent. Ochre for caution, green for confirmation, and nothing else.

| Token | Value | Use |
|---|---|---|
| `ftm-night` | `#14181B` | Page ground |
| `ftm-card` | `#1B2024` | Raised surface |
| `ftm-up` | `#232A2F` | Header strip, hover ground |
| `ftm-bar` | `#181D21` | Top bar |
| `ftm-paper` | `#F4F1EC` | Light ground. **Never `#FFFFFF`.** |
| `ftm-ink` | `#F4F1EC` | Text on dark |
| `ftm-mut` / `ftm-dim` | `#A2ACB2` / `#8A959B` | Secondary and tertiary text on dark |
| `ftm-crimson` | `#C5132D` | The accent |
| `ftm-crimsondeep` | `#97071E` | Hover and pressed |
| `ftm-ochre` | `#C8A96B` | Caution only |
| `ftm-green` | `#58A47C` | Confirmation only |
| `ftm-line` / `ftm-line2` | 14% / 30% ink | Hairlines |

**The contrast rule that matters.** Crimson on the dark ground measures 2.8:1.
It is a **fill** on dark — a crimson button with white text is 6.0:1 and fine —
and it is **text** only on paper, where it measures 5.4:1. Accent *text* on the
dark ground is ochre (7.5:1). If you find yourself writing `text-ftm-crimson`
on a dark surface, you want `text-ftm-ochre`.

**Removed:** `ftm-indigo` (`#8CA3F0`) put the wordmark in purple-on-black, and
the neon `#E0273F` with its `shadow-redglow` was the single loudest thing in the
product. Both are gone; do not reintroduce a second accent hue.

## Measurements

Enforced in `tailwind.config`, not at call sites, so they cannot drift back:

- **Spacing** — multiples of 4px only.
- **Radius** — 2px. Every alias (`rounded-md`, `rounded-lg`, `rounded-xl`, …)
  resolves to 2px. `rounded-full` survives for the button spinners only.
- **Shadows** — none. Every shadow utility resolves to `none`. Depth is a
  hairline plus a surface step.
- **Transitions** — `transition-all` no longer includes `transform` or
  `box-shadow`, so a stray `hover:` cannot reintroduce a lift or a glow.
  120ms, and `prefers-reduced-motion` is honoured globally.
- **Type** — 11 / 12 / 13 / 15 / 17 / 21 / 27. Nothing between.
- **Measure** — `max-w-measure` (68ch) for anything read as prose, including
  exam passages. `max-w-shell` (1120px) is the one page width.

## Components

- **Status is never colour alone.** `.ftm-status` prints a square swatch before
  the word, and the word stands on its own. No pills, no tinted backgrounds.
- **Facts are ruled, not carded.** `.ftm-facts` — label left, value right, one
  hairline between. This replaced every row of stat tiles.
- **Tables are tables.** `.ftm-table` — `border-collapse: separate` (required
  for sticky headers to keep their borders), real `<thead>`, `scope` on every
  header, `.num` for right-aligned tabular figures, `.end` for a right-aligned
  non-numeric header. `.ftm-table-sticky` for long tables only.
- **Alerts follow GOV.UK.** A 6px left rule in the signal colour, a bold
  heading, plain body. No icon medallion, no tinted panel. Errors on a form go
  in a summary at the top that moves focus to the field that failed.
- **Loading states are the shape of what is coming.** `.ftm-skeleton`, laid out
  like the real content. Spinners survive inside buttons only.

## The ornament

`FuturimiRegister` — a band of crimson diamonds after imigongo, drawn in CSS.
It marks the **top edge of a page and nothing else**. Never a background fill,
never a divider, never repeated down a page.

`tone` names the page it sits on, not the band: on a dark page it takes a paper
ground, on paper it takes an ink one. The band must contrast with the page or it
reads as fringe.

It replaced a rotating three.js particle globe on the login screen and a
rotating low-poly campus in the admin bar. Both were decoration that carried no
information and held a live WebGL context; the `three` dependency went with them.

## The exam screen specifically

This is the surface the anxiety research applies to. It gets stricter rules:

- One status band, fixed, carrying three facts: section, position, time left.
- Nothing animates. The timer does not pulse; urgency is a word and a rule.
- No app navigation, no greeting, no sign-out link.
- The pre-test instructions screen is built from the same parts as the live
  screen, so reading it rehearses the exam rather than describing it.
- Passages at 17px on a 68ch measure. Options are real radios at 20px.

## Copy

Sentence case. Second person. No exclamation marks, no congratulation. Say what
happened and what to do next. An error names the problem and the fix. A control
says exactly what it will do, and the confirmation uses the same verb.

Em dashes are out of interface copy — they were one of the tells and they read
as machine-written in short strings. Use a full stop or a comma.
