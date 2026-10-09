---
name: Head-tracking prototype
description: Source-constrained cursor-controlled portrait experiment
colors:
  studio-grey: "#a0a5a5"
  charcoal: "#353b3c"
  selection-paper: "#f1f2f2"
  diagnostic-paper: "#f0f2f1"
  diagnostic-border: "#6f7878"
  diagnostic-muted: "#535d5d"
  grid-line: "#48545470"
  grid-ink: "#283535"
  grid-active: "#ffffff12"
typography:
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "12px"
    lineHeight: 1.5
    letterSpacing: "0.025em"
  diagnostic-body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "12px"
    lineHeight: 1.55
  diagnostic-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 600
spacing:
  instruction-gap: "28px"
  compact-instruction-gap: "24px"
  diagnostic-gap: "12px"
  control-gap: "8px"
components:
  instruction:
    textColor: "{colors.charcoal}"
    typography: "{typography.label}"
  reload:
    backgroundColor: "transparent"
    textColor: "{colors.charcoal}"
    padding: "0"
  diagnostics:
    backgroundColor: "{colors.diagnostic-paper}"
    textColor: "{colors.charcoal}"
    typography: "{typography.diagnostic-body}"
    padding: "18px 20px"
    width: "302px"
---

# Design System: Head-tracking prototype

## Overview

**Creative North Star: "Neutral studio portrait"**

This document records the implemented experiment, whose presentation is pinned by the brief. A single centered portrait occupies a quiet neutral grey viewport, with one small instruction. It establishes no portfolio identity or broader component library.

**Key Characteristics:**
- Full source composition, including hairstyle and shoulders.
- Flat grey surface, generous whitespace, minimal system typography.
- Viewer-relative interaction using recorded source poses.

## Colors

The palette supports the source's neutral studio setting; it has no decorative accent.

### Neutral
- **Studio grey:** viewport background.
- **Charcoal:** instruction, reload link, focus outline, checkbox accent, and selection background.
- **Selection paper:** selected text.
- **Diagnostic paper, border, and muted ink:** development panel surface, outline, and supporting labels.
- **Grid line, ink, and active wash:** optional development overlay only.

## Typography

All text uses the frontmatter's native system stack. The instruction is the only normal-production text hierarchy; no display or headline role exists. Diagnostics use their own body and title roles, with tabular numerals for live statistics. Buttons and inputs inherit the surrounding font.

## Layout

The experiment fills the viewport (100svh), centers its portrait and instruction as a vertical flex group, and prevents scrolling. Safe-area-aware vertical padding has a minimum of 24px; horizontal padding follows the safe-area insets.

Preserve the full 16:9 source composition. Portrait width is `min(100%, 1320px, calc((100svh - 140px) * 16 / 9))`; source images use containment. The instruction gap uses the frontmatter values, switching at a maximum viewport width of 640px. That breakpoint also changes diagnostic body size to 11px. Coarse pointers show “Touch and move”; other pointers show “Move your cursor”.

Diagnostics sit at the top left, inset by at least 16px with safe-area support. Their width is capped by viewport width minus 32px; height is capped by 100svh minus 32px and may scroll internally. They are available only in development with `?debug=1`.

## Elevation & Depth

All surfaces are flat, with no shadows. Diagnostics use a lighter surface and a thin border. Their overlay order is 3; the optional grid is 2. The portrait gains no decorative depth treatment.

## Shapes

The portrait keeps its source rectangle without rounded clipping. Diagnostic borders are 1px. The optional grid divides the viewport into equal thirds; its cursor indicator is an 8px circle. Interactive focus uses a 2px charcoal outline offset by 4px.

## Components

### Interactive portrait

A neutral source poster remains visible until the Canvas 2D frame cache is ready. The canvas then displays recorded frames only. Its accessible description identifies the subject and pointer-following gaze. Missing derived poses preserve the last valid portrait; failure to load the neutral pose reveals the reload instruction.

Normalize pointer coordinates across the viewport to −1…+1. The central third on each axis is neutral. Smooth coordinates with `1 - exp(-min(elapsed, 50) / 65)` and snap within 0.001; select real poses with directional gating and 0.002 spatial hysteresis. Never blend facial images. Center and opposite-direction transitions may be discrete because the source lacks those paths. Reduced motion selects poses without temporal smoothing.

Touch starts neutral, follows deliberate dragging, and returns to center on release. Pointer exit, cancellation, window blur, resize, and document hiding reset the target to center.

### Instruction and reload

A centered label provides the single interaction cue. Loading failure replaces it with “The portrait couldn’t load.” and an underlined “Reload” button. Reload has transparent background, no border or padding, and an underline offset of 3px. It uses the shared focus outline and reloads the page.

### Development diagnostics

A plain rectangular panel reports the active source filename, smoothing state, coordinates, and source frame information. Source filenames wrap within a maximum width of 170px. Native checkboxes toggle the grid and coordinate smoothing; their dimensions are 15px with an 8px label gap. Reduced motion disables smoothing. These are development tools, not production navigation or settings.

## Do's and Don'ts

### Do:
- **Do** preserve the full source composition and responsive 16:9 sizing.
- **Do** keep the normal experience centered, flat, and limited to its portrait and instruction.
- **Do** retain source expression changes and disclose discrete pose transitions honestly.

### Don't:
- **Don't** add portfolio sections, decorative visual assets, or generated portrait imagery to this experiment.
- **Don't** interpolate faces, crossfade poses, autoplay, or loop the source video.
- **Don't** promote development diagnostics into the production interface.
