# Head-tracking prototype

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
React, TypeScript, Vite, as requested. Technical decisions delegated by the brief.

## Users and purpose
The video subject is evaluating whether a recorded AI-generated head movement can become a convincing cursor-controlled portrait for a future portfolio. Success is responsive viewer-relative direction tracking, with an honest assessment of the footage's limitations.

## Constraints
Use only the supplied video. Keep it untouched. Build only this isolated, full-viewport experiment; no portfolio content, new portrait generation, 3D models, artificial intermediate frames, or automatic video looping. Show the full source composition, including hairstyle and shoulders. Debug controls are available only in development with `?debug=1`.

## Evidence
The user confirmed `Man_moving_head_in_studio_20261009121811.mp4` as the new sole runtime source. It is 1920×1080, 24 fps, 240 frames, 10 seconds, H.264 High profile with AAC audio. The old 68-frame implementation from `Generate_video_from_image_reference_20261009112404.mp4` is retained outside production in `rollback/original-68/`. Active analysis is recorded in `analysis/FLOW-UPGRADE.md`; `analysis/VIDEO-ANALYSIS.md` is historical.

## Accessibility
Desktop is primary. Touch starts neutral and supports deliberate drag tracking. Reduced motion uses deliberate pose changes without temporal smoothing. Portrait has an accessible description; debug controls have labels and keyboard focus.

## Pinned presentation
One centered portrait, matching neutral grey studio background, generous whitespace, an optional “Move your cursor” instruction, and no scrolling. This explicit visual brief determines the surface; no generated design assets are permitted.
