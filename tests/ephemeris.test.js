import assert from 'node:assert/strict';
import test from 'node:test';

import { OFFICIAL_CIRCUMSTANCES } from '../src/config.js';
import {
  calculateEclipseState,
  circumstances,
  discObscuration,
} from '../src/ephemeris.js';

test('Astronomy Engine circumstances remain close to pinned USNO/NASA labels', () => {
  const model = circumstances();
  assert.ok(Math.abs(model.partialBegin.getTime() - OFFICIAL_CIRCUMSTANCES.partialBeginMs) < 10_000);
  assert.ok(Math.abs(model.sunset.getTime() - OFFICIAL_CIRCUMSTANCES.sunsetMs) < 1_000);
  assert.ok(Math.abs(model.peak.getTime() - OFFICIAL_CIRCUMSTANCES.peakMs) < 10_000);
  assert.ok(Math.abs(model.partialEnd.getTime() - OFFICIAL_CIRCUMSTANCES.partialEndMs) < 10_000);
  assert.ok(Math.abs(model.peakObscuration - OFFICIAL_CIRCUMSTANCES.peakObscuration) < 0.001);
});

test('first contact has the expected refracted Sun position and disc ratio', () => {
  const state = calculateEclipseState(OFFICIAL_CIRCUMSTANCES.partialBeginMs);
  assert.ok(Math.abs(state.sun.azimuth - 283.3627) < 0.001);
  assert.ok(Math.abs(state.sun.altitude - 7.7698) < 0.001);
  assert.ok(Math.abs(state.sun.diameterDeg - 0.525916) < 0.00001);
  assert.ok(Math.abs(state.moon.diameterDeg / state.sun.diameterDeg - 1.03336) < 0.0001);
  // USNO and Astronomy Engine contact conventions differ by about four seconds.
  assert.ok(state.obscuration < 0.0001);
});

test('the deepest visible phase is at sunset and geometric peak is hidden', () => {
  const setting = calculateEclipseState(OFFICIAL_CIRCUMSTANCES.sunsetMs);
  const peak = calculateEclipseState(OFFICIAL_CIRCUMSTANCES.peakMs);
  assert.ok(Math.abs(setting.obscuration - 0.9040) < 0.001);
  assert.ok(setting.sunAboveHorizon);
  assert.ok(setting.upperLimbAltitude > 0);
  assert.ok(Math.abs(peak.obscuration - 0.9068) < 0.001);
  assert.equal(peak.sunAboveHorizon, false);
});

test('circle intersection handles full, partial, and zero obscuration', () => {
  assert.equal(discObscuration(1, 1.1, 0), 1);
  assert.equal(discObscuration(1, 1, 2), 0);
  assert.ok(Math.abs(discObscuration(1, 1, 1) - 0.3910022189557706) < 1e-12);
});
