const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function toRadians(degrees) {
  return degrees * DEG_TO_RAD;
}

export function toDegrees(radians) {
  return radians * RAD_TO_DEG;
}

export function unitVectorFromAltAz(azimuthDeg, altitudeDeg) {
  const azimuth = toRadians(azimuthDeg);
  const altitude = toRadians(altitudeDeg);
  const cosAltitude = Math.cos(altitude);

  return {
    east: cosAltitude * Math.sin(azimuth),
    up: Math.sin(altitude),
    north: cosAltitude * Math.cos(azimuth),
  };
}

export function createCamera(viewport, camera) {
  const heading = toRadians(camera.heading);
  const elevation = toRadians(camera.elevation);

  return Object.freeze({
    ...viewport,
    heading: camera.heading,
    elevation: camera.elevation,
    forward: {
      east: Math.cos(elevation) * Math.sin(heading),
      up: Math.sin(elevation),
      north: Math.cos(elevation) * Math.cos(heading),
    },
    right: {
      east: Math.cos(heading),
      up: 0,
      north: -Math.sin(heading),
    },
    cameraUp: {
      east: -Math.sin(elevation) * Math.sin(heading),
      up: Math.cos(elevation),
      north: -Math.sin(elevation) * Math.cos(heading),
    },
  });
}

function dot(a, b) {
  return a.east * b.east + a.up * b.up + a.north * b.north;
}

export function projectVector(vector, camera) {
  const xCamera = dot(vector, camera.right);
  const yCamera = dot(vector, camera.cameraUp);
  const zCamera = dot(vector, camera.forward);

  return {
    x: camera.centerX + camera.focalLength * (xCamera / zCamera),
    y: camera.centerY - camera.focalLength * (yCamera / zCamera),
    depth: zCamera,
    inFront: zCamera > 0,
  };
}

export function projectAltAz(azimuthDeg, altitudeDeg, camera) {
  return projectVector(unitVectorFromAltAz(azimuthDeg, altitudeDeg), camera);
}

/**
 * Samples the apparent circular limb on the celestial sphere, then applies the
 * rectilinear camera projection. This preserves angular diameter and the mild
 * off-axis conic distortion instead of treating degrees as linear pixels.
 */
export function projectDiscLimb(
  azimuthDeg,
  altitudeDeg,
  angularRadiusDeg,
  camera,
  samples = 64,
) {
  const azimuth = toRadians(azimuthDeg);
  const altitude = toRadians(altitudeDeg);
  const radius = toRadians(angularRadiusDeg);
  const center = unitVectorFromAltAz(azimuthDeg, altitudeDeg);
  const tangentAzimuth = {
    east: Math.cos(azimuth),
    up: 0,
    north: -Math.sin(azimuth),
  };
  const tangentAltitude = {
    east: -Math.sin(altitude) * Math.sin(azimuth),
    up: Math.cos(altitude),
    north: -Math.sin(altitude) * Math.cos(azimuth),
  };
  const cosRadius = Math.cos(radius);
  const sinRadius = Math.sin(radius);
  const points = [];

  for (let index = 0; index < samples; index += 1) {
    const angle = (index / samples) * Math.PI * 2;
    const tangentX = Math.cos(angle);
    const tangentY = Math.sin(angle);
    const limb = {
      east:
        center.east * cosRadius +
        (tangentAzimuth.east * tangentX + tangentAltitude.east * tangentY) * sinRadius,
      up:
        center.up * cosRadius +
        (tangentAzimuth.up * tangentX + tangentAltitude.up * tangentY) * sinRadius,
      north:
        center.north * cosRadius +
        (tangentAzimuth.north * tangentX + tangentAltitude.north * tangentY) * sinRadius,
    };
    points.push(projectVector(limb, camera));
  }

  return points;
}

export function projectedRadius(points, center) {
  if (!points.length) return 0;
  const sum = points.reduce(
    (total, point) => total + Math.hypot(point.x - center.x, point.y - center.y),
    0,
  );
  return sum / points.length;
}

export function mathematicalHorizonY(camera) {
  return projectAltAz(camera.heading, 0, camera).y;
}
