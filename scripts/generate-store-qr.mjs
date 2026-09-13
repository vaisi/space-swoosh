// generate-store-qr.mjs
// Changes: Writes cream/ink SVG QR codes for the desktop store rails from
// StoreLinks.js. Run with `npm run assets:qr`.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

import { PLAY_STORE_URL, appStoreUrl } from '../src/services/StoreLinks.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'qr');

const targets = [
    { file: 'ios.svg', url: appStoreUrl() },
    { file: 'android.svg', url: PLAY_STORE_URL },
];

async function writeQr(fileName, url) {
    const svg = await QRCode.toString(url, {
        type: 'svg',
        margin: 2,
        width: 240,
        errorCorrectionLevel: 'M',
        color: {
            dark: '#1A1A1A',
            light: '#EAE4D2',
        },
    });
    const stamped = svg.replace(
        /^<svg([^>]*)>/,
        `<svg$1><!-- QR for ${url}. Regenerate with npm run assets:qr. -->`,
    );
    fs.writeFileSync(path.join(outDir, fileName), stamped);
    console.log(`[qr] ${fileName} ← ${url}`);
}

fs.mkdirSync(outDir, { recursive: true });
for (const target of targets) {
    await writeQr(target.file, target.url);
}
