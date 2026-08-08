import './styles.css';
import {
  CAMERA,
  LOCATION,
  OFFICIAL_CIRCUMSTANCES,
  SIMULATION,
  VIEWPORT,
} from './config.js';
import { calculateEclipseState } from './ephemeris.js';
import {
  createCamera,
  mathematicalHorizonY,
  projectAltAz,
  projectDiscLimb,
  projectedRadius,
} from './projection.js';

const DETAIL_ZOOM = 15;
const camera = createCamera(VIEWPORT, CAMERA);
const horizonY = mathematicalHorizonY(camera);

const sceneCanvas = document.querySelector('#scene');
const sceneContext = sceneCanvas.getContext('2d');
const detailCanvas = document.querySelector('#solar-detail');
const detailContext = detailCanvas.getContext('2d');
const timeline = document.querySelector('#timeline');
const playButton = document.querySelector('#play');
const playbackSpeedSelect = document.querySelector('#playback-speed');
const languageSelect = document.querySelector('#language-select');
const methodDialog = document.querySelector('#method-dialog');

const ui = {
  time: document.querySelector('#local-time'),
  zone: document.querySelector('#zone'),
  date: document.querySelector('#local-date'),
  phase: document.querySelector('#phase'),
  coverage: document.querySelector('#coverage'),
  magnitude: document.querySelector('#magnitude'),
  altitude: document.querySelector('#altitude'),
  azimuth: document.querySelector('#azimuth'),
  discRatio: document.querySelector('#disc-ratio'),
  detailStatus: document.querySelector('#detail-status'),
};

// These translations are intentionally kept in the app so the language switcher
// works offline and does not depend on an external translation service.
const TRANSLATIONS = Object.freeze({
  en: Object.freeze({
    pageTitle: 'Koper Eclipse · 12 August 2026',
    pageDescription: 'Interactive, true-scale simulation of the 12 August 2026 partial solar eclipse from Koper promenade, Slovenia.',
    location: 'Koper · Slovenia',
    title: 'Sunset<br />in eclipse',
    headerDate: '12 August 2026',
    language: 'Language',
    openMethod: 'Open simulation details',
    method: 'Method',
    solarView: 'Solar view',
    aboveHorizon: 'Above horizon',
    phasePartial: 'Partial eclipse',
    sunCovered: 'Sun covered',
    magnitude: 'Magnitude',
    sunAltitude: 'Sun altitude',
    azimuth: 'Azimuth',
    discRatio: 'Moon / Sun',
    trueScale: 'Main view: true angular scale',
    signature: 'Simulation made by',
    controls: 'Simulation time controls',
    play: 'Play simulation',
    pause: 'Pause simulation',
    speed: 'Speed',
    playbackSpeed: 'Playback speed',
    eventJump: 'Jump to event',
    sunset: 'Sunset',
    peak: 'Peak*',
    belowHorizon: '* below the sea horizon',
    photoCredit: 'Photo: Google Maps · Apr 2014',
    methodEyebrow: 'How this simulation works',
    methodTitle: 'Position first.<br />Atmosphere second.',
    methodDescription: 'Sun and Moon coordinates are topocentric for <strong>45.5455229° N, 13.7234669° E</strong>. Their circular limbs are projected through the reference camera at the real apparent angular sizes. The scene disc is only about 9–10 pixels wide; the inset enlarges both bodies by exactly the same 15×.',
    viewFact: 'View',
    viewFactValue: '279.8199° true · 90° vertical FOV',
    firstContactFact: 'First contact',
    firstContactFactValue: '19:26:46 CEST',
    sunsetFact: 'Sunset',
    sunsetFactValue: '20:17:41 CEST',
    peakFact: 'Geometric peak',
    peakFactValue: '20:18:47 CEST · below horizon',
    methodNote: 'Motion uses Astronomy Engine 2.1.19 (approximately ±1 arcminute). Event labels are pinned to USNO/NASA calculations. Near-horizon refraction depends on actual weather; photo darkening is an illustrative exposure response, not a weather forecast.',
    closeMethod: 'Close details',
    safety: 'Use ISO 12312-2 eclipse glasses. Never look directly at the Sun.',
    noscript: 'This simulation needs JavaScript enabled.',
    desktopHint: 'Drag the timeline · space toggles playback · arrow keys nudge time',
    beforeContact: 'Before first contact',
    complete: 'Eclipse complete',
    belowVisible: 'Partial · below horizon',
    visible: 'Partial eclipse · visible',
    below: 'Below horizon',
    setting: 'Setting at sea horizon',
    before: 'Before contact',
    coverageAria: 'percent covered',
  }),
  sl: Object.freeze({
    pageTitle: 'Koper · Sončni mrk · 12. avgust 2026',
    pageDescription: 'Interaktivna simulacija delnega Sončevega mrka 12. avgusta 2026 z obale v Kopru.',
    location: 'Koper · Slovenija',
    title: 'Sončni zahod<br />v mrku',
    headerDate: '12. avgust 2026',
    language: 'Jezik',
    openMethod: 'Odpri podrobnosti simulacije',
    method: 'Metoda',
    solarView: 'Pogled na Sonce',
    aboveHorizon: 'Nad obzorjem',
    phasePartial: 'Delni mrk',
    sunCovered: 'Pokritost Sonca',
    magnitude: 'Magnituda',
    sunAltitude: 'Višina Sonca',
    azimuth: 'Azimut',
    discRatio: 'Luna / Sonce',
    trueScale: 'Glavni pogled: resnično kotno merilo',
    signature: 'Simulacija:',
    controls: 'Časovni nadzor simulacije',
    play: 'Predvajaj simulacijo',
    pause: 'Zaustavi simulacijo',
    speed: 'Hitrost',
    playbackSpeed: 'Hitrost predvajanja',
    eventJump: 'Skok na dogodek',
    sunset: 'Sončni zahod',
    peak: 'Vrh*',
    belowHorizon: '* pod morskim obzorjem',
    photoCredit: 'Foto: Google Maps · apr 2014',
    methodEyebrow: 'Kako simulacija deluje',
    methodTitle: 'Najprej položaj.<br />Nato atmosfera.',
    methodDescription: 'Koordinate Sonca in Lune so topocentrične za <strong>45.5455229° S, 13.7234669° V</strong>. Njuna krožna roba sta projicirana skozi referenčno kamero z resničnima navideznima kotnima velikostma. Disk v prizoru je širok le približno 9–10 slikovnih pik; vstavek obe telesi poveča natanko 15×.',
    viewFact: 'Pogled',
    viewFactValue: '279,8199° pravo · 90° navpični vidni kot',
    firstContactFact: 'Prvi stik',
    firstContactFactValue: '19:26:46 CEST',
    sunsetFact: 'Sončni zahod',
    sunsetFactValue: '20:17:41 CEST',
    peakFact: 'Geometrijski vrh',
    peakFactValue: '20:18:47 CEST · pod obzorjem',
    methodNote: 'Gibanje uporablja Astronomy Engine 2.1.19 (približno ±1 ločna minuta). Oznake dogodkov so usklajene z izračuni USNO/NASA. Lom svetlobe tik nad obzorjem je odvisen od vremena; zatemnitev fotografije je ponazoritveni odziv osvetlitve, ne vremenska napoved.',
    closeMethod: 'Zapri podrobnosti',
    safety: 'Uporabite očala za opazovanje mrka po standardu ISO 12312-2. Nikoli ne glejte neposredno v Sonce.',
    noscript: 'Za to simulacijo je potreben omogočen JavaScript.',
    desktopHint: 'Povlecite časovnico · preslednica predvaja · puščice premikajo čas',
    beforeContact: 'Pred prvim stikom',
    complete: 'Mrk končan',
    belowVisible: 'Delni mrk · pod obzorjem',
    visible: 'Delni mrk · viden',
    below: 'Pod obzorjem',
    setting: 'Zaide za morsko obzorje',
    before: 'Pred stikom',
    coverageAria: 'odstotkov pokritosti',
  }),
});

const SUPPORTED_LANGUAGES = new Set(Object.keys(TRANSLATIONS));

function detectBrowserLanguage() {
  const locales = [...(navigator.languages || []), navigator.language].filter(Boolean);
  const browserPrefersSlovenian = locales.some((locale) => /^sl(?:-|$)/i.test(locale));
  const timezoneIsSlovenian = Intl.DateTimeFormat().resolvedOptions().timeZone === LOCATION.timeZone;
  return browserPrefersSlovenian || timezoneIsSlovenian ? 'sl' : 'en';
}

function resolveLanguage() {
  const requested = new URLSearchParams(window.location.search).get('lang')?.toLowerCase();
  return SUPPORTED_LANGUAGES.has(requested) ? requested : detectBrowserLanguage();
}

let currentLanguage = resolveLanguage();

function createFormatters(language) {
  const locale = language === 'sl' ? 'sl-SI' : 'en-GB';
  return {
    time: new Intl.DateTimeFormat(locale, {
      timeZone: LOCATION.timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }),
    shortTime: new Intl.DateTimeFormat(locale, {
      timeZone: LOCATION.timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }),
    date: new Intl.DateTimeFormat(locale, {
      timeZone: LOCATION.timeZone,
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    }),
    zone: new Intl.DateTimeFormat(locale, {
      timeZone: LOCATION.timeZone,
      timeZoneName: 'short',
    }),
  };
}

let {
  time: timeFormatter,
  shortTime: shortTimeFormatter,
  date: dateFormatter,
  zone: zoneFormatter,
} = createFormatters(currentLanguage);

const durationSeconds = Math.round((SIMULATION.endMs - SIMULATION.startMs) / 1000);
timeline.max = String(durationSeconds);

let currentMs = initialTimeFromUrl();
let isPlaying = false;
let playbackSpeed = Number(playbackSpeedSelect.value);
let previousAnimationTime = null;
let imageReady = false;
let trajectory = [];

const sceneImage = new Image();
sceneImage.src = `${import.meta.env.BASE_URL}assets/koper-promenada-portrait.png`;
sceneImage.addEventListener('load', () => {
  imageReady = true;
  render();
});
sceneImage.addEventListener('error', () => {
  drawImageError();
});

function initialTimeFromUrl() {
  const requested = new URLSearchParams(window.location.search).get('time');
  const parsed = requested ? Date.parse(requested) : Number.NaN;
  const candidate = Number.isFinite(parsed) ? parsed : SIMULATION.defaultMs;
  return clamp(candidate, SIMULATION.startMs, SIMULATION.endMs);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function smoothstep(edge0, edge1, value) {
  const normalized = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
}

function tracePath(context, points, transform = (point) => point) {
  if (!points.length) return;
  const first = transform(points[0]);
  context.beginPath();
  context.moveTo(first.x, first.y);
  for (let index = 1; index < points.length; index += 1) {
    const point = transform(points[index]);
    context.lineTo(point.x, point.y);
  }
  context.closePath();
}

function bodyProjection(body) {
  const center = projectAltAz(body.azimuth, body.altitude, camera);
  const limb = projectDiscLimb(
    body.azimuth,
    body.altitude,
    body.radiusDeg,
    camera,
    80,
  );

  return {
    center,
    limb,
    radiusPx: projectedRadius(limb, center),
  };
}

function drawAtmosphere(state) {
  const twilightDarkness = 0.62 * (1 - smoothstep(-6, 8, state.sun.altitude));
  const remainingSunlight = clamp(1 - state.obscuration, 0.01, 1);
  const eclipsePerceptualLoss = 1 - remainingSunlight ** (1 / 2.2);
  const eclipseInfluence = smoothstep(-1, 2, state.sun.altitude);
  const eclipseDarkness = 0.52 * eclipsePerceptualLoss * eclipseInfluence;
  const darkness = 1 - (1 - twilightDarkness) * (1 - eclipseDarkness);

  sceneContext.save();
  sceneContext.fillStyle = `rgba(3, 8, 10, ${darkness.toFixed(4)})`;
  sceneContext.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);

  const sunsetWarmth =
    smoothstep(9, -1, state.sun.altitude) * smoothstep(-1, 0.25, state.upperLimbAltitude);
  if (sunsetWarmth > 0) {
    const gradient = sceneContext.createRadialGradient(
      VIEWPORT.width * 0.69,
      horizonY,
      0,
      VIEWPORT.width * 0.69,
      horizonY,
      VIEWPORT.width * 0.75,
    );
    gradient.addColorStop(0, `rgba(219, 132, 67, ${(0.17 * sunsetWarmth).toFixed(4)})`);
    gradient.addColorStop(0.42, `rgba(122, 94, 78, ${(0.09 * sunsetWarmth).toFixed(4)})`);
    gradient.addColorStop(1, 'rgba(40, 51, 57, 0)');
    sceneContext.fillStyle = gradient;
    sceneContext.fillRect(0, 0, VIEWPORT.width, horizonY + 120);
  }
  sceneContext.restore();
}

function createTrajectory() {
  const points = [];
  const start = OFFICIAL_CIRCUMSTANCES.partialBeginMs;
  const end = OFFICIAL_CIRCUMSTANCES.sunsetMs;
  const intervals = 30;

  for (let index = 0; index <= intervals; index += 1) {
    const time = start + ((end - start) * index) / intervals;
    const state = calculateEclipseState(time);
    points.push(projectAltAz(state.sun.azimuth, state.sun.altitude, camera));
  }
  return points;
}

function drawTrajectory() {
  if (!trajectory.length) trajectory = createTrajectory();
  sceneContext.save();
  sceneContext.beginPath();
  sceneContext.rect(0, 0, VIEWPORT.width, horizonY);
  sceneContext.clip();
  sceneContext.beginPath();
  trajectory.forEach((point, index) => {
    if (index === 0) sceneContext.moveTo(point.x, point.y);
    else sceneContext.lineTo(point.x, point.y);
  });
  sceneContext.setLineDash([3, 13]);
  sceneContext.lineWidth = 1.4;
  sceneContext.strokeStyle = 'rgba(255, 238, 187, 0.35)';
  sceneContext.stroke();
  sceneContext.setLineDash([]);

  for (let index = 0; index < trajectory.length; index += 10) {
    const point = trajectory[index];
    sceneContext.beginPath();
    sceneContext.arc(point.x, point.y, 2.4, 0, Math.PI * 2);
    sceneContext.fillStyle = 'rgba(255, 241, 198, 0.48)';
    sceneContext.fill();
  }
  sceneContext.restore();
}

function drawLocator(center, radius) {
  const locatorRadius = Math.max(18, radius + 10);
  sceneContext.save();
  sceneContext.translate(center.x, center.y);
  sceneContext.strokeStyle = 'rgba(255, 244, 207, 0.58)';
  sceneContext.lineWidth = 1.2;
  for (let index = 0; index < 4; index += 1) {
    sceneContext.beginPath();
    sceneContext.arc(
      0,
      0,
      locatorRadius,
      index * (Math.PI / 2) - 0.14,
      index * (Math.PI / 2) + 0.14,
    );
    sceneContext.stroke();
  }
  sceneContext.restore();
}

function drawMainDiscs(state, sunProjection, moonProjection) {
  const center = sunProjection.center;
  if (!center.inFront || state.upperLimbAltitude <= 0) return;

  const horizonVisibility = smoothstep(0, 0.24, state.upperLimbAltitude);
  const illuminatedFraction = clamp(1 - state.obscuration, 0.01, 1);
  const glowRadius = 25 + 36 * Math.sqrt(illuminatedFraction);

  sceneContext.save();
  sceneContext.beginPath();
  sceneContext.rect(0, 0, VIEWPORT.width, horizonY);
  sceneContext.clip();

  const glow = sceneContext.createRadialGradient(
    center.x,
    center.y,
    sunProjection.radiusPx * 0.6,
    center.x,
    center.y,
    glowRadius,
  );
  glow.addColorStop(0, `rgba(255, 232, 168, ${(0.42 * horizonVisibility).toFixed(4)})`);
  glow.addColorStop(
    0.24,
    `rgba(255, 190, 92, ${(0.18 * Math.sqrt(illuminatedFraction) * horizonVisibility).toFixed(4)})`,
  );
  glow.addColorStop(1, 'rgba(255, 167, 69, 0)');
  sceneContext.fillStyle = glow;
  sceneContext.fillRect(center.x - glowRadius, center.y - glowRadius, glowRadius * 2, glowRadius * 2);

  tracePath(sceneContext, sunProjection.limb);
  sceneContext.fillStyle = state.sun.altitude < 2 ? '#ffc878' : '#fff1b2';
  sceneContext.shadowColor = 'rgba(255, 222, 148, 0.9)';
  sceneContext.shadowBlur = 4;
  sceneContext.fill();
  sceneContext.shadowBlur = 0;

  sceneContext.save();
  tracePath(sceneContext, sunProjection.limb);
  sceneContext.clip();
  tracePath(sceneContext, moonProjection.limb);
  sceneContext.fillStyle = '#11191a';
  sceneContext.fill();
  sceneContext.restore();

  tracePath(sceneContext, sunProjection.limb);
  sceneContext.strokeStyle = 'rgba(255, 247, 218, 0.9)';
  sceneContext.lineWidth = 0.65;
  sceneContext.stroke();
  drawLocator(center, sunProjection.radiusPx);
  sceneContext.restore();
}

function drawDetail(state, sunProjection, moonProjection) {
  const { width, height } = detailCanvas;
  const center = { x: width / 2, y: height / 2 };
  detailContext.clearRect(0, 0, width, height);

  const background = detailContext.createRadialGradient(
    center.x,
    center.y,
    0,
    center.x,
    center.y,
    width * 0.52,
  );
  background.addColorStop(0, 'rgba(45, 51, 47, 0.52)');
  background.addColorStop(0.58, 'rgba(14, 22, 21, 0.22)');
  background.addColorStop(1, 'rgba(5, 10, 10, 0)');
  detailContext.fillStyle = background;
  detailContext.fillRect(0, 0, width, height);

  detailContext.save();
  detailContext.strokeStyle = 'rgba(255, 255, 255, 0.09)';
  detailContext.lineWidth = 1;
  detailContext.beginPath();
  detailContext.moveTo(center.x, 18);
  detailContext.lineTo(center.x, height - 18);
  detailContext.moveTo(18, center.y);
  detailContext.lineTo(width - 18, center.y);
  detailContext.stroke();
  detailContext.restore();

  const transform = (point) => ({
    x: center.x + (point.x - sunProjection.center.x) * DETAIL_ZOOM,
    y: center.y + (point.y - sunProjection.center.y) * DETAIL_ZOOM,
  });

  const sunRadius = sunProjection.radiusPx * DETAIL_ZOOM;
  const sunGlow = detailContext.createRadialGradient(
    center.x,
    center.y,
    sunRadius * 0.75,
    center.x,
    center.y,
    sunRadius * 1.45,
  );
  sunGlow.addColorStop(0, 'rgba(255, 224, 145, 0.48)');
  sunGlow.addColorStop(1, 'rgba(255, 184, 84, 0)');
  detailContext.fillStyle = sunGlow;
  detailContext.beginPath();
  detailContext.arc(center.x, center.y, sunRadius * 1.5, 0, Math.PI * 2);
  detailContext.fill();

  tracePath(detailContext, sunProjection.limb, transform);
  detailContext.fillStyle = state.sun.altitude < 2 ? '#ffc66f' : '#ffe8a3';
  detailContext.fill();

  tracePath(detailContext, moonProjection.limb, transform);
  detailContext.fillStyle = 'rgba(7, 13, 14, 0.95)';
  detailContext.fill();
  detailContext.strokeStyle = 'rgba(201, 215, 207, 0.3)';
  detailContext.lineWidth = 1.2;
  detailContext.stroke();

  tracePath(detailContext, sunProjection.limb, transform);
  detailContext.strokeStyle = 'rgba(255, 244, 208, 0.76)';
  detailContext.lineWidth = 1.2;
  detailContext.stroke();
}

function drawImageError() {
  sceneContext.fillStyle = '#849196';
  sceneContext.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
  sceneContext.fillStyle = '#f7f3e7';
  sceneContext.font = '32px sans-serif';
  sceneContext.fillText('Reference image could not be loaded.', 60, 960);
}

function phaseLabel(state) {
  const strings = TRANSLATIONS[currentLanguage];
  if (currentMs < OFFICIAL_CIRCUMSTANCES.partialBeginMs) return strings.beforeContact;
  if (currentMs > OFFICIAL_CIRCUMSTANCES.partialEndMs) return strings.complete;
  if (!state.sunAboveHorizon) return strings.belowVisible;
  return strings.visible;
}

function detailStatus(state) {
  const strings = TRANSLATIONS[currentLanguage];
  const lowerLimbAltitude = state.sun.altitude - state.sun.radiusDeg;
  if (!state.sunAboveHorizon) return strings.below;
  if (lowerLimbAltitude <= 0) return strings.setting;
  return state.eclipseActive ? strings.aboveHorizon : strings.before;
}

function formatZone(date) {
  const zonePart = zoneFormatter
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName');
  return zonePart?.value ?? 'CEST';
}

function updateLanguageUrl() {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('lang', currentLanguage);
  window.history.replaceState(null, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
}

function applyLanguage() {
  const strings = TRANSLATIONS[currentLanguage];
  const textFields = {
    'location-label': strings.location,
    'header-date-label': strings.headerDate,
    'language-label': strings.language,
    'method-label': strings.method,
    'solar-view-label': strings.solarView,
    'sun-covered-label': strings.sunCovered,
    'magnitude-label': strings.magnitude,
    'sun-altitude-label': strings.sunAltitude,
    'azimuth-label': strings.azimuth,
    'disc-ratio-label': strings.discRatio,
    'true-scale-label': strings.trueScale,
    'signature-label': strings.signature,
    'speed-label': strings.speed,
    'sunset-label': strings.sunset,
    'peak-label': strings.peak,
    'below-horizon-label': strings.belowHorizon,
    'photo-credit-label': strings.photoCredit,
    'method-eyebrow': strings.methodEyebrow,
    'view-fact-label': strings.viewFact,
    'view-fact-value': strings.viewFactValue,
    'first-contact-fact-label': strings.firstContactFact,
    'first-contact-fact-value': strings.firstContactFactValue,
    'sunset-fact-label': strings.sunsetFact,
    'sunset-fact-value': strings.sunsetFactValue,
    'peak-fact-label': strings.peakFact,
    'peak-fact-value': strings.peakFactValue,
    'method-note': strings.methodNote,
    'safety-note': strings.safety,
    'noscript-label': strings.noscript,
    'desktop-hint': strings.desktopHint,
  };

  for (const [id, value] of Object.entries(textFields)) {
    document.getElementById(id).textContent = value;
  }
  document.getElementById('title-label').innerHTML = strings.title;
  document.getElementById('method-title').innerHTML = strings.methodTitle;
  document.getElementById('method-description').innerHTML = strings.methodDescription;
  ui.detailStatus.textContent = strings.aboveHorizon;

  document.documentElement.lang = currentLanguage;
  document.title = strings.pageTitle;
  document.querySelector('meta[name="description"]').setAttribute('content', strings.pageDescription);
  languageSelect.value = currentLanguage;
  languageSelect.setAttribute('aria-label', strings.language);
  playbackSpeedSelect.setAttribute('aria-label', strings.playbackSpeed);
  playButton.setAttribute('aria-label', isPlaying ? strings.pause : strings.play);
  document.querySelector('#open-method').setAttribute('aria-label', strings.openMethod);
  document.querySelector('#simulation-controls').setAttribute('aria-label', strings.controls);
  document.querySelector('#solar-card').setAttribute('aria-label', strings.solarView);
  document.querySelector('#event-jumps').setAttribute('aria-label', strings.eventJump);
  document.querySelector('.signature').setAttribute('aria-label', `${strings.signature} jeancaffou`);
  document.querySelector('.close-button').setAttribute('aria-label', strings.closeMethod);

  updateEventLabels();
}

function setLanguage(nextLanguage, { updateUrl = true, renderNow = true } = {}) {
  if (!SUPPORTED_LANGUAGES.has(nextLanguage)) return;
  currentLanguage = nextLanguage;
  ({
    time: timeFormatter,
    shortTime: shortTimeFormatter,
    date: dateFormatter,
    zone: zoneFormatter,
  } = createFormatters(currentLanguage));
  applyLanguage();
  if (updateUrl) updateLanguageUrl();
  if (renderNow) render();
}

function updateInterface(state) {
  const strings = TRANSLATIONS[currentLanguage];
  const date = state.date;
  ui.time.textContent = timeFormatter.format(date);
  ui.time.dateTime = date.toISOString();
  ui.zone.textContent = formatZone(date);
  ui.date.textContent = dateFormatter.format(date).replace(',', ' ·');
  ui.phase.textContent = phaseLabel(state);
  ui.coverage.textContent = `${(state.obscuration * 100).toFixed(1)}%`;
  ui.magnitude.textContent = state.magnitude.toFixed(3);
  ui.altitude.textContent = `${state.sun.altitude >= 0 ? '+' : ''}${state.sun.altitude.toFixed(2)}°`;
  ui.azimuth.textContent = `${state.sun.azimuth.toFixed(2)}°`;
  ui.discRatio.textContent = `${(state.moon.diameterDeg / state.sun.diameterDeg).toFixed(3)}×`;
  ui.detailStatus.textContent = detailStatus(state);

  const elapsedSeconds = (currentMs - SIMULATION.startMs) / 1000;
  timeline.value = String(elapsedSeconds);
  timeline.style.setProperty('--progress', `${(elapsedSeconds / durationSeconds) * 100}%`);
  timeline.setAttribute(
    'aria-valuetext',
    `${timeFormatter.format(date)} ${formatZone(date)}, ${phaseLabel(state)}, ${(state.obscuration * 100).toFixed(1)} ${strings.coverageAria}`,
  );
}

function render() {
  const state = calculateEclipseState(currentMs);
  const sunProjection = bodyProjection(state.sun);
  const moonProjection = bodyProjection(state.moon);

  if (imageReady) {
    sceneContext.clearRect(0, 0, VIEWPORT.width, VIEWPORT.height);
    sceneContext.drawImage(sceneImage, 0, 0, VIEWPORT.width, VIEWPORT.height);
    drawAtmosphere(state);
    drawTrajectory();
    drawMainDiscs(state, sunProjection, moonProjection);
  }
  drawDetail(state, sunProjection, moonProjection);
  updateInterface(state);
}

function setTime(nextMs, { stopPlayback = false } = {}) {
  currentMs = clamp(nextMs, SIMULATION.startMs, SIMULATION.endMs);
  if (stopPlayback) pause();
  render();
}

function pause() {
  isPlaying = false;
  previousAnimationTime = null;
  playButton.classList.remove('is-playing');
  playButton.setAttribute('aria-label', TRANSLATIONS[currentLanguage].play);
}

function play() {
  if (currentMs >= SIMULATION.endMs) currentMs = SIMULATION.startMs;
  isPlaying = true;
  previousAnimationTime = null;
  playButton.classList.add('is-playing');
  playButton.setAttribute('aria-label', TRANSLATIONS[currentLanguage].pause);
  requestAnimationFrame(animate);
}

function animate(timestamp) {
  if (!isPlaying) return;
  if (previousAnimationTime === null) previousAnimationTime = timestamp;
  const elapsedRealMs = Math.min(timestamp - previousAnimationTime, 100);
  previousAnimationTime = timestamp;
  currentMs += elapsedRealMs * SIMULATION.playbackRate * playbackSpeed;

  if (currentMs >= SIMULATION.endMs) {
    currentMs = SIMULATION.endMs;
    pause();
  }
  render();
  if (isPlaying) requestAnimationFrame(animate);
}

function eventTimes() {
  return {
    partialBegin: OFFICIAL_CIRCUMSTANCES.partialBeginMs,
    sunset: OFFICIAL_CIRCUMSTANCES.sunsetMs,
    peak: OFFICIAL_CIRCUMSTANCES.peakMs,
    partialEnd: OFFICIAL_CIRCUMSTANCES.partialEndMs,
  };
}

function updateEventLabels() {
  const events = eventTimes();
  const strings = TRANSLATIONS[currentLanguage];

  document.querySelector('#c1-time').textContent = shortTimeFormatter.format(events.partialBegin);
  document.querySelector('#sunset-time').textContent = shortTimeFormatter.format(events.sunset);
  document.querySelector('#peak-time').textContent = shortTimeFormatter.format(events.peak);
  document.querySelector('#c4-time').textContent = shortTimeFormatter.format(events.partialEnd);
  document.querySelector('#sunset-label').textContent = strings.sunset;
  document.querySelector('#peak-label').textContent = strings.peak;
}

function setupEventLabels() {
  const events = eventTimes();

  for (const marker of document.querySelectorAll('[data-marker]')) {
    const eventMs = events[marker.dataset.marker];
    const percent = ((eventMs - SIMULATION.startMs) / (SIMULATION.endMs - SIMULATION.startMs)) * 100;
    marker.style.setProperty('--position', `${percent}%`);
  }

  updateEventLabels();

  for (const button of document.querySelectorAll('[data-jump]')) {
    button.addEventListener('click', () => setTime(events[button.dataset.jump], { stopPlayback: true }));
  }
}

timeline.addEventListener('input', () => {
  setTime(SIMULATION.startMs + Number(timeline.value) * 1000, { stopPlayback: true });
});

languageSelect.addEventListener('change', () => {
  setLanguage(languageSelect.value);
});

playbackSpeedSelect.addEventListener('change', () => {
  playbackSpeed = Number(playbackSpeedSelect.value);
});

playButton.addEventListener('click', () => {
  if (isPlaying) pause();
  else play();
});

document.querySelector('#open-method').addEventListener('click', () => methodDialog.showModal());

document.addEventListener('keydown', (event) => {
  if (methodDialog.open || event.target.matches('input, button, a')) return;
  if (event.code === 'Space') {
    event.preventDefault();
    if (isPlaying) pause();
    else play();
  } else if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
    event.preventDefault();
    const direction = event.code === 'ArrowRight' ? 1 : -1;
    const stepMs = event.shiftKey ? 60_000 : 10_000;
    setTime(currentMs + direction * stepMs, { stopPlayback: true });
  }
});

setupEventLabels();
setLanguage(currentLanguage, { renderNow: false });
render();

// Namespaced hook used by the deterministic offline video renderer.
window.__KOPER_SIMULATOR__ = Object.freeze({
  setTime: (timeMs) => setTime(timeMs, { stopPlayback: true }),
  getTime: () => currentMs,
  isReady: () => imageReady,
});
