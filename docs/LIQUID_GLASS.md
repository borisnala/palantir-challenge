# Liquid Glass in Risk Tool

This document is the reference for how glass looks and moves in the app. It has three parts: what the owner's
recording shows (Outlook on iOS 26, 2026-11-19), the physics behind it with the numbers we use, and which control
in this app does what. The last section is a forecast for iOS 27, marked as one.

## 1. What the recording shows

| Moment | What happens on screen |
|---|---|
| Finger lands on the segmented control | The solid gray pill lifts out of the track. It becomes clear glass, about 15% wider and 40% taller than the track, with a thin bright rim that is strongest along the top. |
| Finger drags | The lens follows the finger. The labels under it are magnified. Where the curved ends cross a letter, the letter bends and splits into a red and a blue fringe. The lens runs past the end of the track, then resists. |
| Finger lifts | The lens shrinks back into the track, turns solid gray again and springs into the nearest segment with a small overshoot. |
| Finger presses the bell and search capsule | The whole capsule swells by about 12% at once. A soft light pools under the finger and slides with it. The rim brightens. |
| Search opens | The capsule stretches across the bar and becomes the search field. The filter chips appear under it. The control changes shape, it is not replaced. |

## 2. The physics

Glass in iOS 26 is a thin optical slab on top of the content. Five effects make it read as liquid. The numbers come
from the React Bits FluidGlass source, which models the same effects, and from the frames of the recording.

| Effect | What causes it | How it is modelled | Value we use |
|---|---|---|---|
| Refraction | Light bends where the glass is curved, at the rim. The flat middle passes light straight. | Snell's law, index of refraction (IOR) 1.0 to 2.0 | Chromium uses an SVG displacement lens (liquid.tsx). Safari uses a magnified copy of the content inside the lens (Segmented). |
| Magnification | A convex slab enlarges what is under it. | The lens scale applied to the content under it | 1.14 wide, 1.42 tall while lifted |
| Dispersion | Each colour bends by a slightly different amount at the rim. | Red and blue traced at IOR ± 0.06 × dispersion | A red and a blue copy, offset 1.2 px, masked to the outer 16% of the lens |
| Fresnel reflection | Glass reflects more at grazing angles, so the rim is bright. | f0 = ((IOR − 1) / (IOR + 1))² | An inset rim, brightest along the top, 0.5 px wide |
| Light | A light source above the glass, which moves with the finger while pressed. | Specular highlight at the touch point | A radial light at the finger, 62% white at the centre, fading to nothing at 72% of the radius |

Motion is what makes it liquid instead of glassy. All of it runs on springs.

| Motion | Model | Value |
|---|---|---|
| Follow the finger | Damped spring | ω 30 rad/s, damping ratio 0.86, which settles in about 0.15 s without wobble |
| Lift and sink | Underdamped spring | stiffness 484, damping 24: a quick lift with a small overshoot |
| Stretch while moving | Scale along the direction of travel | 1 + min(speed / 1800, 0.55) × 0.5, the other axis shrinks by half that |
| Rubber band at the ends | Square-root resistance past the limit | 3 × √(distance past the end) |
| Bounce off an edge | Restitution | 62% of the speed is kept, the rest goes into a stretch kick |
| Settle into place | Spring with overshoot | stiffness 360, damping 26 |
| Press swell | Scale on a spring curve | 1.12, back over 0.45 s |

## 3. Which control does what in Risk Tool

Glass is for the control layer only. Content (rows, cards, charts, numbers) stays solid.

| Control | Where | Glass behaviour |
|---|---|---|
| Round bar buttons (menu, back, bell, more) | Top bar | Swell to 1.12 under the finger, light follows the finger, rim brightens |
| Title capsule | Top bar | Swells less (1.04), opens the Data status sheet |
| More menu | Top bar | Grows out of its button, from a circle to the menu, on a spring |
| Segmented control | Many screens, Client 360 tabs | Lifts into a lens on touch, follows the finger, magnifies with a colour fringe at the rim, rubber-bands past the ends, sinks back on release |
| Search circle | Bottom left | Swells and lights under the finger |
| Action pill | Bottom right | Swells and lights under the finger. Solid black, not clear glass, because it is the main action |
| Sheets | Everywhere | Rise on a spring, follow a drag down, close past a third of their height |
| Side menu | Left edge | Follows the finger, settles on a spring. Glass buttons inside it behave as in the top bar |
| Switch | Settings rows | The knob stretches like a drop while it travels |
| Rows, cards, charts, numbers | Content | No glass |

What stays out on purpose: a WebGL glass layer (React Bits renders its own scene, it cannot bend the page under it),
and refraction over long text, which makes text harder to read.

## 4. iOS 27, a forecast

This section is a forecast from iOS 26 behaviour, not documented Apple behaviour. Check it against Apple's Human
Interface Guidelines when iOS 27 ships.

| Area | Likely direction | What it would mean for Risk Tool |
|---|---|---|
| Morphing | More controls change shape instead of being replaced: buttons into fields, menus and sheets. | The search circle grows into the search field. Sheets open out of the button that called them. |
| Grouped controls | Neighbouring glass buttons merge into one capsule and split again as space changes. | Bell and more join into one capsule when the title is short. |
| Legibility | Clearer glass with stronger contrast controls under accessibility settings. | Keep the solid fallback for Reduce Transparency and the static fallback for Reduce Motion. |
| Light | The light source follows device tilt as well as touch. | LightSource can read device orientation once the person allows it. |
