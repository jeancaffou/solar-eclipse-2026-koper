import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  // The workspace used this fallback during validation. A normal checkout can
  // install Playwright as a dev dependency or set PLAYWRIGHT_MODULE explicitly.
  const modulePath = process.env.PLAYWRIGHT_MODULE || '/tmp/qr-playwright/node_modules/playwright/index.mjs';
  ({ chromium } = await import(modulePath));
}

const FPS = 30;
const DURATION_SECONDS = 12;
const WIDTH = 1080;
const HEIGHT = 1920;
const FAST_RATE = 1100;
const SLOW_RATE = 156;
const TRANSITION_SECONDS = 900 / ((FAST_RATE + SLOW_RATE) / 2);
const PRE_FAST_SECONDS = 2100 / FAST_RATE;
const SLOW_HOLD_SECONDS = 780 / SLOW_RATE;
const POST_FAST_SECONDS = DURATION_SECONDS -
  PRE_FAST_SECONDS - TRANSITION_SECONDS * 2 - SLOW_HOLD_SECONDS;
const outputPath = resolve(
  process.argv[2] || 'public/assets/koper-eclipse-2026.mp4',
);
const baseUrl = process.env.KOPER_URL || 'http://127.0.0.1:4173/';

const segments = [
  {
    from: Date.parse('2026-08-12T17:10:00.000Z'), // 19:10 CEST
    to: Date.parse('2026-08-12T17:45:00.000Z'), // 19:45 CEST
    seconds: PRE_FAST_SECONDS,
    easing: 'linear',
  },
  {
    from: Date.parse('2026-08-12T17:45:00.000Z'), // 19:45 CEST
    to: Date.parse('2026-08-12T18:00:00.000Z'), // 20:00 CEST
    seconds: TRANSITION_SECONDS,
    easing: 'velocity',
    fromVelocity: FAST_RATE,
    toVelocity: SLOW_RATE,
  },
  {
    from: Date.parse('2026-08-12T18:00:00.000Z'), // 20:00 CEST
    to: Date.parse('2026-08-12T18:13:00.000Z'), // 20:13 CEST
    seconds: SLOW_HOLD_SECONDS,
    easing: 'linear',
  },
  {
    from: Date.parse('2026-08-12T18:13:00.000Z'), // 20:13 CEST
    to: Date.parse('2026-08-12T18:28:00.000Z'), // 20:28 CEST
    seconds: TRANSITION_SECONDS,
    easing: 'velocity',
    fromVelocity: SLOW_RATE,
    toVelocity: FAST_RATE,
  },
  {
    from: Date.parse('2026-08-12T18:28:00.000Z'), // 20:28 CEST
    to: Date.parse('2026-08-12T19:08:15.270Z'), // C4, below horizon
    seconds: POST_FAST_SECONDS,
    easing: 'linear',
  },
];

// Cubic smoothing is applied to velocity, then integrated. This keeps the
// speed continuous at both ends of each transition instead of stopping at a
// segment boundary.
function integratedVelocity(value, fromVelocity, toVelocity) {
  const smoothIntegral = value ** 3 - 0.5 * value ** 4;
  return fromVelocity * value + (toVelocity - fromVelocity) * smoothIntegral;
}

function simulationTimeAt(videoSeconds) {
  let elapsed = 0;
  for (const segment of segments) {
    if (videoSeconds <= elapsed + segment.seconds || segment === segments.at(-1)) {
      const local = Math.min(1, Math.max(0, (videoSeconds - elapsed) / segment.seconds));
      const eased = segment.easing === 'velocity'
        ? integratedVelocity(local, segment.fromVelocity, segment.toVelocity) /
          integratedVelocity(1, segment.fromVelocity, segment.toVelocity)
        : local;
      return segment.from + (segment.to - segment.from) * eased;
    }
    elapsed += segment.seconds;
  }
  return segments.at(-1).to;
}

async function render() {
  const frameCount = Math.round(DURATION_SECONDS * FPS);
  const frameDirectory = await mkdtemp('/tmp/koper-eclipse-frames-');
  await mkdir(dirname(outputPath), { recursive: true });
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: { width: WIDTH, height: HEIGHT },
      deviceScaleFactor: 1,
    });
    page.on('console', (message) => {
      if (message.type() === 'error') console.error(`[browser] ${message.text()}`);
    });
    page.on('pageerror', (error) => console.error(`[browser] ${error.message}`));

    await page.goto(`${baseUrl}?lang=en&time=2026-08-12T17:10:00.000Z`, {
      waitUntil: 'networkidle',
    });
    await page.waitForFunction(() => window.__KOPER_SIMULATOR__?.isReady?.());
    await page.addStyleTag({
      content: `
        #open-method, .language-switcher, .timeline-wrap { display: none !important; }
        .top-actions { display: none !important; }
        .controls { padding: 2.2cqw 3.2cqw 1.8cqw !important; }
        #play { display: none !important; }
        .time-row { grid-template-columns: minmax(0, 1fr) auto !important; gap: 2cqw !important; }
        .playback-speed { display: none !important; }
        .signature { bottom: 27.5% !important; }
        .signature-repo { display: none !important; }
        .controls { bottom: 15.9% !important; }
        .clock time { font-size: 6.8cqw !important; }
        .local-date { max-width: none !important; white-space: nowrap !important; }
        .event-jumps { gap: .8cqw !important; }
        .event-jumps button { padding: .9cqw .8cqw !important; }
        .control-foot { margin-top: 1cqw !important; }
      `,
    });

    for (let index = 0; index < frameCount; index += 1) {
      const videoSeconds = index / FPS;
      const timeMs = simulationTimeAt(videoSeconds);
      await page.evaluate((value) => window.__KOPER_SIMULATOR__.setTime(value), timeMs);
      await page.screenshot({
        path: join(frameDirectory, `frame-${String(index + 1).padStart(5, '0')}.png`),
        type: 'png',
      });
      if (index % FPS === 0) {
        console.log(`rendered ${index / FPS}s / ${DURATION_SECONDS}s`);
      }
    }

    await execFileAsync('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-framerate',
      String(FPS),
      '-i',
      join(frameDirectory, 'frame-%05d.png'),
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      outputPath,
    ]);
    console.log(`wrote ${outputPath}`);
  } finally {
    await browser.close();
    await rm(frameDirectory, { recursive: true, force: true });
  }
}

await render();
