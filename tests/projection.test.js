import assert from 'node:assert/strict';
import test from 'node:test';

import { CAMERA, SOURCE_CROP, VIEWPORT } from '../src/config.js';
import {
  createCamera,
  mathematicalHorizonY,
  projectAltAz,
  projectDiscLimb,
  projectedRadius,
} from '../src/projection.js';

const camera = createCamera(VIEWPORT, CAMERA);

test('the 4K center crop resolves exactly to 1080x1920', () => {
  assert.equal(SOURCE_CROP.width * SOURCE_CROP.scale, VIEWPORT.width);
  assert.equal(SOURCE_CROP.height * SOURCE_CROP.scale, VIEWPORT.height);
  assert.equal(SOURCE_CROP.x + SOURCE_CROP.width / 2, SOURCE_CROP.sourceWidth / 2);
  assert.equal(SOURCE_CROP.y + SOURCE_CROP.height, SOURCE_CROP.sourceHeight);
});

test('camera optical axis lands on the portrait principal point', () => {
  const projected = projectAltAz(CAMERA.heading, CAMERA.elevation, camera);
  assert.ok(Math.abs(projected.x - VIEWPORT.centerX) < 1e-9);
  assert.ok(Math.abs(projected.y - VIEWPORT.centerY) < 1e-9);
  assert.ok(Math.abs(projected.depth - 1) < 1e-12);
});

test('mathematical sea horizon matches the calibrated reference', () => {
  assert.ok(Math.abs(mathematicalHorizonY(camera) - 1300.4693) < 0.001);
});

test('projected limb preserves the expected true-scale Sun diameter at C1', () => {
  const center = projectAltAz(283.3627, 7.7698, camera);
  const limb = projectDiscLimb(283.3627, 7.7698, 0.525916 / 2, camera, 160);
  const diameterPx = projectedRadius(limb, center) * 2;
  assert.ok(Math.abs(diameterPx - 9.1225) < 0.01);
});
