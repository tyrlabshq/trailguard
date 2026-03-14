/**
 * TrailGuard App Store Screenshot Capture
 * Generates screenshots at exact App Store dimensions:
 *   6.7" iPhone 15 Pro Max: 1290 x 2796
 *   6.5" iPhone 14 Plus:    1284 x 2778
 */

import { chromium } from '/opt/homebrew/lib/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlFile = path.join(__dirname, 'screens.html');

// App Store required sizes
// deviceScaleFactor=3 → logical px = physical / 3
const SIZES = [
  {
    label: '6.7inch',
    dir: '/Users/ty/.openclaw/workspace/artifacts/trailguard-screenshots/6.7',
    physW: 1290,
    physH: 2796,
    // logical viewport = physical / dpr
    width: 430,   // 1290/3
    height: 932,  // 2796/3
    dpr: 3,
    name: 'iPhone 15 Pro Max',
  },
  {
    label: '6.5inch',
    dir: '/Users/ty/.openclaw/workspace/artifacts/trailguard-screenshots/6.5',
    physW: 1284,
    physH: 2778,
    width: 428,   // 1284/3
    height: 926,  // 2778/3
    dpr: 3,
    name: 'iPhone 14 Plus',
  },
];

const SCREENS = ['map', 'sos', 'groups', 'contacts', 'dms'];
const SCREEN_NAMES = {
  map: 'map-active-tracking',
  sos: 'sos-emergency',
  groups: 'group-rides',
  contacts: 'emergency-contacts',
  dms: 'dead-man-switch',
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const size of SIZES) {
    fs.mkdirSync(size.dir, { recursive: true });
    console.log(`\n📱 ${size.name} (${size.physW}×${size.physH})`);

    for (const screenId of SCREENS) {
      const context = await browser.newContext({
        viewport: { width: size.width, height: size.height },
        deviceScaleFactor: size.dpr,
      });
      const page = await context.newPage();

      const url = `file://${htmlFile}?screen=${screenId}`;
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      // Extra settle time for gradients/animations
      await page.waitForTimeout(300);

      const outName = `${SCREEN_NAMES[screenId]}.png`;
      const outPath = path.join(size.dir, outName);

      // Screenshot the body element exactly
      await page.screenshot({
        path: outPath,
        clip: { x: 0, y: 0, width: size.width, height: size.height },
      });

      // Verify actual pixel dimensions
      const stat = fs.statSync(outPath);
      results.push({ size: size.label, screen: screenId, file: outPath, bytes: stat.size });
      console.log(`  ✓ ${outName} (${stat.size} bytes)`);

      await context.close();
    }
  }

  await browser.close();

  console.log('\n✅ All screenshots captured!');
  console.log('\nFiles saved:');
  results.forEach(r => {
    console.log(`  [${r.size}] ${path.basename(r.file)}`);
  });
})();
