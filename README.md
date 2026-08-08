# Koper eclipse simulator

Interactive 9:16 simulation of the partial solar eclipse on **12 August 2026**
from Koper promenade, Slovenia.

## [Open the live simulation on GitHub Pages →](https://jeancaffou.github.io/solar-eclipse-2026-koper/)

## Run it

```bash
npm install
npm run dev
```

Production build and numerical checks:

```bash
npm test
npm run build
npm run preview
```

The rendered 12-second portrait animation is generated from the actual app window
with the Method button hidden.

```bash
# Start Vite in another terminal first.
npm run render:video
```

Its timing uses a fast baseline, an eased slowdown into 20:00 CEST, a constant
slow hold from 20:00–20:13, then an eased speed-up back to the original rate.
The timeline slider is hidden in the video capture so more of the promenade
sculpture remains visible; the interactive web page keeps it. The result is
`public/assets/koper-eclipse-2026.mp4`, 1080×1920 at 30 fps. The renderer uses
Playwright; set `PLAYWRIGHT_MODULE` if it is installed outside the project.

On narrow mobile screens the 9:16 stage is pinned to the top of the viewport;
desktop keeps it centered.

The simulator also accepts an ISO timestamp for deterministic previews:

```text
http://localhost:5173/?time=2026-08-12T18:10:00Z
```

While playing, the Speed control defaults to 8× and can increase playback to 2×, 4×, 8×, or 16×.

The interface detects Slovenian browser preferences (or the `Europe/Ljubljana` time zone) and
otherwise uses English. Add `lang=en` or `lang=sl` to the URL to choose explicitly; changing the
selector updates the URL so the selected language is preserved when a link is shared.

## What is calibrated

- Observer: `45.5455229° N, 13.7234669° E`, 2 m elevation
- Street View panorama: `Z-MPezbwiowvZqPvPO2h2w`
- Camera: `279.819868°` true heading, `+19.527333°` optical elevation,
  90° vertical field of view
- Portrait projection: 1080 × 1920, 960 px focal length, mathematical horizon
  at `y = 1300.469`
- Main-view Sun and Moon: sampled spherical limbs at true apparent angular scale
- Magnified inset: both bodies enlarged by the same explicit 15× factor

The crop retains the Google Maps watermark, and the interface repeats the source
attribution because the lower controls overlap that part of the image.

## Eclipse model

Continuous topocentric Sun/Moon motion, normal atmospheric refraction, distances,
and rise/set calculations use
[Astronomy Engine 2.1.19](https://github.com/cosinekitty/astronomy). Event labels
are pinned to the [USNO Solar Eclipse Computer](https://aa.usno.navy.mil/data/SolarEclipses)
and NASA/GSFC Besselian-element calculations:

| Event | Koper local time (CEST) | Visibility |
| --- | --- | --- |
| First contact | 19:26:46 | Above horizon |
| Standard sunset | 20:17:41 | Last solar limb disappears |
| Geometric peak | 20:18:47 | Below horizon |
| Fourth contact | 21:08:15 | Below horizon |

At theoretical peak the magnitude is about 0.921 and the obscured solar area is
about 90.7%. At sunset, roughly 90.4% of the Sun is obscured. The app calculates
area coverage from circular-disc intersection; eclipse magnitude is not reused as
an area or exposure value.

Astronomy Engine is designed for roughly one-arcminute positional accuracy. It
differs from the pinned USNO/NASA contact times here by about 6 seconds. Actual
sunset appearance is less certain because near-horizon refraction changes with
temperature and pressure, while the supplied April 2014 photograph cannot predict
August 2026 weather. Scene darkening is therefore an illustrative nonlinear exposure
response driven separately by solar altitude and unobscured solar area.

Never view a partial eclipse without ISO 12312-2 compliant eclipse glasses or an
equivalent safe solar-viewing method.
