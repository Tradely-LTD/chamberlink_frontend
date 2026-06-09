---
name: stitch-design
description: >-
  Analyze a Stitch project and synthesize a semantic design system into a
  DESIGN.md file that serves as the source of truth for prompting Stitch to
  generate new, on-brand screens. Use this whenever the user mentions Stitch,
  asks to capture/document a design system, wants a DESIGN.md, needs new screens
  to match an existing design language, or asks to extract colors/typography/
  component styles from a designed screen. Trigger on phrases like "document our
  Stitch design", "make a DESIGN.md", "I want new screens to match our look",
  "pull the design tokens from this screen", even if they don't say the file name.
allowed-tools:
  - "stitch*:*"
  - "Read"
  - "Write"
  - "web_fetch"
---

# Stitch DESIGN.md Skill

You are an expert Design Systems Lead. Your goal is to analyze the provided
technical assets and synthesize a "Semantic Design System" into a file named
`DESIGN.md`.

## Why this exists

`DESIGN.md` becomes the source of truth for prompting Stitch to generate new
screens that match the existing design language. Stitch interprets design through
*visual descriptions* backed by specific color values — so the job is to
translate technical CSS/Tailwind into evocative, precise natural language
(descriptive name **plus** exact hex), not to dump raw class names.

## Prerequisites

- Access to the Stitch MCP Server
- A Stitch project with at least one designed screen
- The Stitch Effective Prompting Guide: https://stitch.withgoogle.com/docs/learn/prompting/

## Retrieval workflow (Stitch MCP)

1. **Find the namespace** — run `list_tools` to get the Stitch MCP prefix (e.g.
   `mcp_stitch:`); use it for all calls below.
2. **Project lookup** (if no Project ID) — `[prefix]:list_projects` with
   `filter: "view=owned"`; identify by title/URL; extract the ID from `name`
   (e.g. `projects/13534454087919359824`).
3. **Screen lookup** (if no Screen ID) — `[prefix]:list_screens` with the numeric
   `projectId`; pick the target screen; extract its ID from `name`.
4. **Metadata fetch** — `[prefix]:get_screen` with numeric `projectId` +
   `screenId`. Returns `screenshot.downloadUrl`, `htmlCode.downloadUrl`,
   `width`/`height`/`deviceType`, and `designTheme`.
5. **Asset download** — `web_fetch` the HTML from `htmlCode.downloadUrl` (and
   optionally the screenshot); parse for Tailwind classes, custom CSS, component
   patterns.
6. **Project metadata** — `[prefix]:get_project` with the full `name`
   (`projects/{id}`) for `designTheme` (color mode, fonts, roundness, custom
   colors) and project-level guidelines.

## Analysis & synthesis

1. **Identity** — capture Project Title and Project ID.
2. **Atmosphere** — from the screenshot + HTML, describe the mood in evocative
   adjectives ("Airy", "Dense", "Minimalist", "Utilitarian").
3. **Color palette** — for each key color give a descriptive name + exact hex +
   functional role (e.g. "Deep Muted Teal-Navy (#294056) — primary actions").
4. **Geometry & shape** — translate radii: `rounded-full` → "Pill-shaped",
   `rounded-lg` → "Subtly rounded", `rounded-none` → "Sharp, squared-off".
5. **Depth & elevation** — describe shadow presence/quality ("Flat",
   "Whisper-soft diffused", "Heavy high-contrast").

## Output format (DESIGN.md)

```markdown
# Design System: [Project Title]
**Project ID:** [Insert Project ID Here]

## 1. Visual Theme & Atmosphere
(Mood, density, aesthetic philosophy.)

## 2. Color Palette & Roles
(Descriptive Name + Hex Code + Functional Role.)

## 3. Typography Rules
(Font family, weight usage headers vs body, letter-spacing character.)

## 4. Component Stylings
* **Buttons:** (Shape, color assignment, behavior.)
* **Cards/Containers:** (Roundness, background, shadow depth.)
* **Inputs/Forms:** (Stroke style, background.)

## 5. Layout Principles
(Whitespace strategy, margins, grid alignment.)
```

## Best practices

- **Be descriptive + precise:** "Ocean-deep Cerulean (#0077B6)", never just
  "blue" and never just a hex with no name.
- **Be functional:** always say what each element is *for*.
- **Be consistent:** reuse the same terminology throughout.
- Start big-picture (overall aesthetic), then drill into patterns and hierarchy.

## Common pitfalls

- ❌ Raw jargon without translation ("rounded-xl" instead of "generously rounded")
- ❌ Hex codes with no descriptive name, or names with no hex
- ❌ Omitting the functional role of an element
- ❌ Vague atmosphere; ignoring subtle shadows/spacing
