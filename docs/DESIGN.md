# Design system

Cortex Arcade is styled as a **drill book**: sheets of graph paper on a desk, marked by a teacher's red pen.
Dark mode is a classroom chalkboard. The red pen is the only loud element and is used only for marking:
scores, the brain age, best scores and the streak.

## Colour roles

| Token | Paper (light) | Chalkboard (dark) | Role |
|---|---|---|---|
| `--desk` | `#cdd4de` | `#0b0f0d` | Page ground. Never holds body text in a subject colour. |
| `--sheet` | `#ffffff` | `#1d2925` | Anything you read or work on: drill, contents, worksheets, the game stage. |
| `--edge` | `#a3aebc` | `#3d4f47` | 1px border on every sheet and control, so parts separate from the desk. |
| `--grid` | `#e3e9f1` | `#24332e` | Graph-paper lines (`.graph`). |
| `--ink` | `#14171c` | `#eef2ec` | Text and primary buttons. |
| `--ink-soft` | `#4c5461` | `#a9b7af` | Secondary text. |
| `--rule` | `#cfd6df` | `#36463f` | Row dividers inside a sheet. |
| `--pen` | `#cc1f2a` | `#ff6f63` | Marking only (also `--bad`). |
| `--good` | `#1d7a3b` | `#6fd38c` | Correct-answer feedback in games. |

Subject colours are set per element as `--c-l` (paper) and `--c-d` (chalkboard). CSS resolves them to
`--c`, and to `--c-ink` for text drawn on a `--c` fill (white on paper, desk colour on the chalkboard).

| Subject | Paper | Chalkboard |
|---|---|---|
| Calculation | `#1e4bd7` | `#8fb0ff` |
| Memory | `#b0186f` | `#ff8ac6` |
| Attention | `#0b7a6e` | `#4fd1be` |
| Speed | `#b54a00` | `#ffad5c` |
| Spatial | `#3a7d12` | `#9bdb6a` |
| Logic & Language | `#3e4e66` | `#b7c6db` |

The subject hues come from the "Charcoal and primaries" and "Candy chapters" game palettes in the Taste
skill library. Violet is avoided on purpose.

## Contrast (WCAG 2.x)

| Pair | Paper | Chalkboard |
|---|---|---|
| ink on sheet | 17.96 | 13.28 |
| ink-soft on sheet | 7.64 | 7.22 |
| pen on sheet | 5.53 | 5.52 |
| every subject colour on sheet | ≥ 5.09 | ≥ 6.95 |
| `--c-ink` on every subject fill | ≥ 5.09 | ≥ 8.66 |

All text pairs pass AA (4.5:1) and most pass AAA (7:1).

## Type

* **Atkinson Hyperlegible** (400, 700) for everything. Its slashed zero is intentional.
* **Kalam** (700) for the red pen only.

## Shape and interaction

* Radii come from `--r1` (4px) and `--r2` (8px).
* Every control and row is at least 44px tall.
* Hover darkens or fills a surface. Focus uses a 3px `:focus-visible` ring in the subject colour.
* The one orchestrated animation is the pen circling a score. It is skipped under reduced motion.
