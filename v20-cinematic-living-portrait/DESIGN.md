---
name: V20 Cinematic Living Portrait
description: Neutral photographic studio with restrained living-video comparisons
colors:
  studio: "#b5b7b8"
  ink: "#303436"
  paper: "#f1f2f2"
  rule: "#7a7e80"
  photograph-mount: "#a2a4a6"
  atmosphere-light: "#d1d2d3"
  atmosphere-dark: "#9b9ea0"
typography:
  caption:
    fontFamily: 'Georgia, "Times New Roman", serif'
    fontSize: "24px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  caption-compact:
    fontFamily: 'Georgia, "Times New Roman", serif'
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "12px"
    lineHeight: 1.5
  development-note:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "11px"
spacing:
  composition-gap: "32px"
  compact-composition-gap: "26px"
  caption-gap: "10px"
  playback-gap: "14px"
  control-gap: "8px"
  compact-horizontal: "12px"
components:
  caption:
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
  playback-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "2px 0"
  evaluation-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "14px"
    width: "min(302px, calc(100vw - 32px))"
  return-neutral:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    padding: "6px 10px"
---

# Design System: V20 Cinematic Living Portrait

## Overview

**Creative North Star: "Neutral studio portrait"**

This is a narrow extension of the inherited neutral photographic studio. A complete rectangular photograph remains dominant on a silver-grey mount; the serif caption adds a quiet editorial note. It defines only the isolated V20 experiment, not a new portfolio identity.

The existing studio world is preserved through neutral color, generous negative space, restrained controls and an unaltered source frame. V20 deliberately changes recorded-pose selection into native living-video playback, with A as the default and B/C retained as evaluation variants.

**Key Characteristics:**
- Complete 16:9 source composition and opaque photographic pixels.
- Flat silver mount, charcoal text and a quiet serif caption.
- Default native video; bounded translation only in comparison variants.

## Colors

The palette has no decorative accent. Frontmatter records implemented CSS values; these are V20 values rather than aliases for the parent's earlier grey palette.

### Neutral
- **Studio silver:** the viewport and environment base.
- **Charcoal ink:** all text, native control accents, focus outlines and selection background.
- **Paper:** evaluation panel and selected-text foreground.
- **Rule grey:** development borders and scrollbar thumb.
- **Photograph mount:** the rectangle behind the full-frame poster/video.
- **Atmosphere light / dark:** only C's broad off-frame radial gradients.

**The Opaque Photograph Rule.** Atmosphere belongs outside the opaque video; it never changes the face pixels.

## Typography

The caption uses the frontmatter's Georgia serif stack; all status and development text uses the native system sans-serif stack. There is no display headline, branded webfont, or invented type scale. The caption has normal weight, compact negative tracking and a bottom gap given by `caption-gap`. At the compact breakpoint it switches to `caption-compact`. Development summary weight is 600; diagnostic output and numeric values use tabular numerals.

## Layout

The studio is a centered grid with minimum height `100svh`, isolated stacking and hidden overflow. Desktop padding is `48px max(24px, env(safe-area-inset-right)) 36px max(24px, env(safe-area-inset-left))`. The vertical composition width is `min(100%, 1320px, calc((100svh - 190px) * 16 / 9))`; its gap is `composition-gap`.

The photograph has `aspect-ratio: 16 / 9`, full width, and absolutely positioned poster/video with `object-fit: contain`. At `max-width: 640px`, studio padding becomes `24px 12px`, composition width becomes `100%`, and the gap becomes `compact-composition-gap`. Full-frame preservation deliberately leaves a smaller face and substantial vertical whitespace on phones; the 390×844 capture records a 366×205.875 image.

The caption is centered. Status and playback control form a centered row with `playback-gap` and minimum height 24px. The evaluation panel is fixed 16px from top/left, capped to `100svh - 32px` height, and scrolls internally. Unlike the parent's diagnostics, its fixed insets do not add safe-area calculations.

## Elevation & Depth

There are no box shadows, perspective, rotation or scale. The source photograph supplies depth. A and B have a flat silver environment. C adds only `radial-gradient(ellipse at 18% 28%, #d1d2d3 0%, transparent 52%)` and `radial-gradient(ellipse at 86% 82%, #9b9ea0 0%, transparent 54%)` on a layer inset by −50px. The environment sits behind the composition at z-index −1, video above poster at 1, and evaluation controls at 5. C's visible perimeter makes the rectangular photographic edge more apparent; it has no established aesthetic advantage over A.

## Shapes

The photograph keeps straight rectangular edges without rounded clipping. Development panel/reset borders are 1px; playback uses only a 1px currentColor bottom border. Native radio/checkbox controls are 16×16px. No custom rounded scale is established. Keyboard focus uses a 2px ink outline with 4px offset on buttons, inputs and summary.

## Components

### Living photograph

A is the parse fallback and default. It plays the native muted inline loop without presentation movement. A first-frame poster remains underneath and is shown on video error. Playback starts through the native play promise, with a blocked-play status and Play affordance when required. Hiding the document pauses playback and recenters raw pointer targets; visibility restores playback unless paused or reduced.

B translates the whole photographic rectangle by at most ±2px horizontally and ±1.5px vertically at default settings. C keeps the photograph stationary and translates exterior atmosphere by ±18px per axis, plus the caption by ±3px horizontally / ±2px vertically. No mode rotates or scales the frame. Explicit `?mode=B` and `?mode=C` comparisons remain available; mode radio controls require development plus `?debug=1`.

Shared viewport coordinates normalize to −1…+1 and update MotionValues directly. Both springs use stiffness 300, damping 35 and mass 1, near critical damping (`2 * sqrt(300) ≈ 34.64`); restDelta is 0.0001 and restSpeed 0.001. Exit, cancellation, blur and resize reset the target. Springs jump to neutral when interaction is disabled. Touch pointer events never drive parallax; interaction requires live `(hover: hover) and (pointer: fine)` capability.

Live `prefers-reduced-motion: reduce` changes pause the video, set currentTime to zero, hide video to expose the first-frame poster, remove the playback button, neutralize transforms, and hide atmosphere. The development simulation uses the same behavioral branch; the CSS atmosphere rule additionally follows the real system preference. Restoring the preference resumes playback when not manually paused.

### Caption and playback toggle

“A quiet presence.” is the small serif caption. A native underlined Pause/Play button has an explicit accessible name; the adjacent message is a status region. Error state reads “Video unavailable. A still portrait is shown.” Reduced motion reads “Still portrait · reduced motion”. The source defines no custom hover or active animation. Preserve the native interaction and visible focus treatment rather than inventing preview-only states.

### Evaluation controls

Development-only details/summary contains A/B/C radios; frame X/Y sliders; atmosphere, stiffness and damping sliders; interaction/reduced-motion checkboxes; and Return to neutral. Range grid columns are `1fr 95px 28px`, with 6px gaps. Defaults come from the shared controller. Sliders bound frame X to 0…2 (step 0.1), frame Y to 0…1.5 (step 0.1), environment to 0…32 (step 1), stiffness to 100…600 (step 10), and damping to 25…60 (step 1). These exploratory ranges are not new recommended defaults. There are no production cards, menus, chips or text fields to synthesize.

## Do's and Don'ts

### Do:
- **Do** preserve the complete source frame, including hair, forehead, shoulders, expression events and watermark.
- **Do** keep A as default; label B and C as experimental comparisons.
- **Do** disable pointer parallax for touch and use a still first frame for reduced motion.
- **Do** keep evaluation controls development-only behind ?debug=1.

### Don't:
- **Don't** infer anatomical tracking from presentation translation.
- **Don't** place gradients, masks, glows or generated layers over facial pixels.
- **Don't** crop, scale, rotate, reconstruct or cursor-seek the source.
- **Don't** treat this local experiment or its recorded telemetry as production or perceptual-loop approval.
