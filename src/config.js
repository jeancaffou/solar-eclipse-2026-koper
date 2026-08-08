export const VIEWPORT = Object.freeze({
  width: 1080,
  height: 1920,
  focalLength: 960,
  centerX: 540,
  centerY: 960,
});

export const CAMERA = Object.freeze({
  heading: 279.8198683764021,
  elevation: 19.527332645671322,
  verticalFov: 90,
});

export const LOCATION = Object.freeze({
  name: 'Koper promenade',
  latitude: 45.5455229,
  longitude: 13.7234669,
  elevationMeters: 2,
  timeZone: 'Europe/Ljubljana',
});

export const SOURCE_CROP = Object.freeze({
  source: 'promenada-4k.png',
  sourceWidth: 3840,
  sourceHeight: 2160,
  x: 1312.5,
  y: 0,
  width: 1215,
  height: 2160,
  scale: 8 / 9,
});

export const SIMULATION = Object.freeze({
  startMs: Date.parse('2026-08-12T17:10:00.000Z'),
  endMs: Date.parse('2026-08-12T19:15:00.000Z'),
  defaultMs: Date.parse('2026-08-12T18:10:00.000Z'),
  playbackRate: 60,
});

// Labels are pinned to USNO/NASA local-circumstance calculations. Continuous
// motion comes from Astronomy Engine and agrees within about 6 seconds here.
export const OFFICIAL_CIRCUMSTANCES = Object.freeze({
  partialBeginMs: Date.parse('2026-08-12T17:26:46.500Z'),
  sunsetMs: Date.parse('2026-08-12T18:17:40.600Z'),
  peakMs: Date.parse('2026-08-12T18:18:47.360Z'),
  partialEndMs: Date.parse('2026-08-12T19:08:15.270Z'),
  peakMagnitude: 0.921,
  peakObscuration: 0.907,
});
