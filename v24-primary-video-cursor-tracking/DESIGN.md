---
name: V24 primary portrait study
description: Local documentation of the inherited neutral studio review surface
colors:
  studio-grey: "#a2a7a7"
  charcoal: "#1f2c2a"
  muted: "#43524e"
  control-paper: "#edf0ec"
  rule: "#6c7773"
  focus: "#163f35"
  selected: "#263c35"
  selected-ink: "#fff"
  control-hover: "#dce4dc"
  inspection-paper: "#dfe5e0"
typography:
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "13px"
    lineHeight: 1.5
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "12px"
    lineHeight: 1.5
  measurement:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "11px"
    lineHeight: 1.5
rounded:
  control: "5px"
spacing:
  compact-gap: "6px"
  label-gap: "8px"
  control-gap: "12px"
  section-inset: "16px"
  stage-gap: "24px"
  desktop-inset: "28px"
components:
  button:
    backgroundColor: "{colors.control-paper}"
    textColor: "{colors.charcoal}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "6px 12px"
  button-selected:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.selected-ink}"
    rounded: "{rounded.control}"
    padding: "6px 12px"
  button-hover:
    backgroundColor: "{colors.control-hover}"
  select:
    backgroundColor: "{colors.control-paper}"
    textColor: "{colors.charcoal}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "6px 12px"
  source-frame:
    textColor: "{colors.charcoal}"
    typography: "{typography.body}"
    width: "min(35vw, 460px)"
  inspection:
    backgroundColor: "{colors.inspection-paper}"
    textColor: "{colors.charcoal}"
    padding: "16px 20px"
---

# Design System: V24 primary portrait study

## Overview

**Creative North Star: "Neutral studio portrait"**

This isolated review surface extends the parent experiment's pinned studio world. The complete source photograph leads, surrounded by flat grey, native system text and compact engineering controls. This records V24's implemented local values; it establishes no portfolio identity and changes no parent design authority.

The photograph supplies the visual material. Mode navigation, frame status and optional inspection controls support source comparison with quiet, legible presentation.

**Key Characteristics:**
- Complete photographic composition in an uncropped 16:9 rectangle.
- Flat neutral surroundings and system typography.
- Native controls, explicit state labels and visible keyboard focus.
- Responsive comparisons and source limitations presented openly.

## Colors

The palette carries the cool neutral studio setting, with deep green-charcoal used for selected controls and focus rather than decoration.

### Neutral
- **Studio grey:** the surrounding viewport field.
- **Charcoal:** primary text and native control labels.
- **Muted:** supporting figure-caption text.
- **Control paper and control hover:** pale native-control surfaces at rest and on pointer hover.
- **Rule:** thin control and inspection boundaries.
- **Focus:** keyboard outlines, input accents and the small cursor marker.
- **Selected and selected ink:** pressed mode buttons and text selection.
- **Inspection paper:** the optional expanded inspection region.

These frontmatter entries are the reused local palette, not a replacement for the parent tokens. One-off status, footer and instruction inks and the canvas loading ground remain implementation details in the stylesheet.

## Typography

Use the frontmatter's system stack throughout. This engineering surface has no display face. Controls inherit body type; supporting labels and measurements are deliberately quieter than the portrait.

The title uses the title role, with its descriptive span at regular weight. Figure captions use the caption role and medium emphasis (550) for the mode name. Status measurements use the measurement role with tabular numerals; the source-frame output also uses tabular numerals.

At the compact breakpoint the title becomes 16px, figure captions 11px, measurements and footer labels 10px, and mode buttons 12px. These are local responsive adaptations, not a new global type scale.

## Layout

The page is a vertical flex layout with a minimum height of 100svh and safe-area padding. Header and toolbar precede the central portrait stage; instructions, optional source controls or inspection, and footer follow in document flow. Content may scroll when the review tools need more height.

The full photograph has width `min(100%, 1320px, calc((100svh - 248px) * 16 / 9))`. Both canvas dimensions and its wrapper retain 16:9. The stage uses the stage gap and horizontal padding of 24px. Header, toolbar and footer use the desktop inset.

Comparison gives the two photographs equal width, each `min(calc((100% - 24px) / 2), 960px)`. At a maximum width of 800px, the page uses 16px horizontal insets, portraits fill available width, comparisons stack, toolbars wrap and measurement status wraps onto its own line. Long source names wrap anywhere inside inspection.

**The Full Composition Rule.** Keep the complete source rectangle visible at every viewport and give comparison photographs equal sizing.

## Elevation & Depth

All surfaces are flat, with no shadows or blur. Inspection uses a lighter field and a thin top rule; pressed controls use a darker fill. The portrait receives no decorative depth treatment. The cursor marker sits above the document at stacking order 10 without intercepting pointer events.

## Shapes

The photograph and inspection region keep rectangular silhouettes. Native buttons and selects use the control radius and 1px rules. The cursor marker alone is circular (10px with a 2px outline). Focus uses a 2px outline offset by 3px; range and checkbox controls retain their native shapes.

## Components

### Review buttons and mode navigation

Restrained native buttons use the button tokens and a minimum height of 36px. The toolbar and mode group wrap naturally. Pressed modes use the selected variant; hover changes the unpressed fill and leaves a pressed fill stable. Disabled buttons and selects use opacity 0.55. Focus is visible on buttons, selects and inputs. No decorative transitions are authored.

### Selects and source controls

Selects share the button surface and spacing. The source-frame range is a native input with the focus accent, width `min(35vw, 460px)` on desktop and 42vw at the compact breakpoint. Its adjacent output uses tabular figures. Playback starts only through the explicit Play once action; it does not loop. Reduced motion disables playback and passive tracking while explicit directional and frame selection remain available.

### Photograph, captions and status

The full photograph is drawn into Canvas 2D without cropping, face blending or visual image transforms. A caption identifies the mode and source count; a status strip names the selected frame, actual coverage state and decoded-image usage. Loading and retry states are textual. A manifest failure presents a centered explanation and reload control.

Only pointer coordinates are smoothed, with explicit 20ms, 35ms and 50ms settings (35ms default). Touch tracking begins on the photograph and returns to neutral on release. Reduced motion leaves the portrait still until explicit selection and hides the cursor marker. Pointer exit, cancellation, blur, resize and document hiding reset the target.

### Inspection

The inspection region uses its component tokens and a 1px top rule. At the compact breakpoint its inner horizontal padding is 12px. Controls, nine directional buttons and provenance paragraphs wrap in document flow. A readable provenance measure is capped at 90ch. This is V24's comparison tooling, not a global production panel pattern.

## Do's and Don'ts

### Do:
- **Do** preserve the full photographic rectangle and equal comparison sizing.
- **Do** use the inherited flat studio surface and native system controls.
- **Do** retain visible focus, explicit state labels and source-coverage disclosures.
- **Do** let review content wrap and scroll on narrow or short viewports.

### Don't:
- **Don't** treat these V24 measurements as changes to the parent portfolio design system.
- **Don't** add decorative imagery, generated portrait assets or authored entrance motion to this pinned experiment.
- **Don't** disguise absent photographic coverage with face blending or crossfades.
