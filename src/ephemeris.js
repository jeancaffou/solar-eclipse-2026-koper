import * as Astronomy from 'astronomy-engine';
import { LOCATION } from './config.js';

export const SUN_RADIUS_KM = 695700;
// Astronomy Engine uses the polar lunar radius for solar-eclipse obscuration.
export const MOON_POLAR_RADIUS_KM = 1736;

export const observer = new Astronomy.Observer(
  LOCATION.latitude,
  LOCATION.longitude,
  LOCATION.elevationMeters,
);

export const localEclipse = Astronomy.SearchLocalSolarEclipse(
  new Date('2026-08-12T00:00:00.000Z'),
  observer,
);

export const sunset = Astronomy.SearchRiseSet(
  Astronomy.Body.Sun,
  observer,
  -1,
  new Date('2026-08-12T12:00:00.000Z'),
  1,
);

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function angularRadius(radiusKm, distanceAu) {
  return (
    Math.asin(radiusKm / (distanceAu * Astronomy.KM_PER_AU)) *
    Astronomy.RAD2DEG
  );
}

function angularSeparation(first, second) {
  const firstRa = first.ra * Astronomy.HOUR2RAD;
  const secondRa = second.ra * Astronomy.HOUR2RAD;
  const firstDec = first.dec * Astronomy.DEG2RAD;
  const secondDec = second.dec * Astronomy.DEG2RAD;
  const cosine =
    Math.sin(firstDec) * Math.sin(secondDec) +
    Math.cos(firstDec) * Math.cos(secondDec) * Math.cos(firstRa - secondRa);

  return Math.acos(clamp(cosine, -1, 1)) * Astronomy.RAD2DEG;
}

/** Returns the fraction of the first disc's area covered by the second disc. */
export function discObscuration(firstRadius, secondRadius, centerDistance) {
  if (firstRadius <= 0 || secondRadius <= 0 || centerDistance < 0) {
    throw new RangeError('Disc radii must be positive and center distance non-negative.');
  }
  if (centerDistance >= firstRadius + secondRadius) return 0;
  if (centerDistance === 0) {
    return firstRadius <= secondRadius
      ? 1
      : (secondRadius * secondRadius) / (firstRadius * firstRadius);
  }

  const x =
    (firstRadius * firstRadius - secondRadius * secondRadius + centerDistance * centerDistance) /
    (2 * centerDistance);
  const radicand = firstRadius * firstRadius - x * x;

  if (radicand <= 0) {
    return firstRadius <= secondRadius
      ? 1
      : (secondRadius * secondRadius) / (firstRadius * firstRadius);
  }

  const y = Math.sqrt(radicand);
  const firstLens =
    firstRadius * firstRadius * Math.acos(x / firstRadius) - x * y;
  const secondLens =
    secondRadius * secondRadius * Math.acos((centerDistance - x) / secondRadius) -
    (centerDistance - x) * y;

  return clamp(
    (firstLens + secondLens) / (Math.PI * firstRadius * firstRadius),
    0,
    1,
  );
}

function bodyState(body, date, radiusKm) {
  const equatorial = Astronomy.Equator(body, date, observer, true, true);
  const horizontal = Astronomy.Horizon(
    date,
    observer,
    equatorial.ra,
    equatorial.dec,
    'normal',
  );

  return {
    equatorial,
    azimuth: horizontal.azimuth,
    altitude: horizontal.altitude,
    radiusDeg: angularRadius(radiusKm, equatorial.dist),
    diameterDeg: angularRadius(radiusKm, equatorial.dist) * 2,
    distanceAu: equatorial.dist,
  };
}

export function calculateEclipseState(input) {
  const date = input instanceof Date ? input : new Date(input);
  const sun = bodyState(Astronomy.Body.Sun, date, SUN_RADIUS_KM);
  const moon = bodyState(Astronomy.Body.Moon, date, MOON_POLAR_RADIUS_KM);
  const separationDeg = angularSeparation(sun.equatorial, moon.equatorial);
  const obscuration = discObscuration(sun.radiusDeg, moon.radiusDeg, separationDeg);
  const magnitude = clamp(
    (sun.radiusDeg + moon.radiusDeg - separationDeg) / (2 * sun.radiusDeg),
    0,
    moon.radiusDeg / sun.radiusDeg,
  );
  const eclipseActive = separationDeg < sun.radiusDeg + moon.radiusDeg;
  const upperLimbAltitude = sun.altitude + sun.radiusDeg;

  return {
    date,
    sun,
    moon,
    separationDeg,
    obscuration,
    magnitude,
    eclipseActive,
    sunAboveHorizon: upperLimbAltitude > 0,
    upperLimbAltitude,
  };
}

export function circumstances() {
  return {
    partialBegin: localEclipse.partial_begin.time.date,
    peak: localEclipse.peak.time.date,
    partialEnd: localEclipse.partial_end.time.date,
    sunset: sunset?.date ?? null,
    peakObscuration: localEclipse.obscuration,
  };
}
