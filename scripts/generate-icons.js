import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, drawFn) {
  // RGBA buffer with filter byte per scanline
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function createChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);

    const crcTable = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        if (c & 1) c = 0xedb88320 ^ (c >>> 1);
        else c = c >>> 1;
      }
      crcTable[n] = c;
    }

    let crc = 0xffffffff;
    for (let i = 0; i < typeAndData.length; i++) {
      crc = crcTable[(crc ^ typeAndData[i]) & 0xff] ^ (crc >>> 8);
    }
    crc = (crc ^ 0xffffffff) >>> 0;

    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);

    return Buffer.concat([len, typeAndData, crcBuf]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdr = createChunk('IHDR', ihdrData);
  const idat = createChunk('IDAT', compressed);
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// Draw elegant bank/financial emblem with rounded gradient and golden coin symbol
function drawAppIcon(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2;
  
  // Normalized distance from center (0 to 1)
  const dist = Math.hypot(x - cx, y - cy);
  const normDist = dist / r;

  // Background: Deep Royal Navy Gradient
  const gradY = y / h;
  let bgR = Math.round(29 + (15 - 29) * gradY);
  let bgG = Math.round(78 + (23 - 78) * gradY);
  let bgB = Math.round(216 + (42 - 216) * gradY);
  let bgA = 255;

  // Corner rounding for standard icons (unless maskable)
  if (!isMaskable) {
    const cornerRadius = w * 0.22;
    // Check if outside rounded rectangle
    const qx = Math.max(0, Math.abs(x - cx) - (cx - cornerRadius));
    const qy = Math.max(0, Math.abs(y - cy) - (cy - cornerRadius));
    const distCorner = Math.hypot(qx, qy);
    if (distCorner > cornerRadius) {
      return [0, 0, 0, 0]; // Transparent
    }
    // Anti-alias edge
    if (distCorner > cornerRadius - 1) {
      bgA = Math.round(255 * (cornerRadius - distCorner + 1));
    }
  }

  // Draw Central Coin & Pillar Crest
  // Outer Golden Ring
  const outerRingR = w * 0.32;
  const innerRingR = w * 0.28;

  if (dist <= outerRingR && dist >= innerRingR) {
    // Gold gradient
    return [245, 158, 11, bgA]; // Amber Gold #f59e0b
  }

  // Bank Building Icon (pillars and pediment in center)
  const relX = (x - cx) / (w * 0.2);
  const relY = (y - cy) / (h * 0.2);

  // Roof triangle / pediment (relY from -0.8 to -0.3)
  if (relY >= -0.7 && relY <= -0.3) {
    const halfWidthAtY = (relY - (-0.7)) * 1.5;
    if (Math.abs(relX) <= halfWidthAtY && Math.abs(relX) <= 0.7) {
      return [254, 243, 199, bgA]; // Warm cream
    }
  }

  // Architrave (bar beneath roof)
  if (relY >= -0.3 && relY <= -0.18 && Math.abs(relX) <= 0.75) {
    return [245, 158, 11, bgA]; // Gold
  }

  // 3 Pillars (relY from -0.15 to 0.45)
  if (relY >= -0.15 && relY <= 0.45) {
    // Left pillar: -0.55 to -0.35
    // Center pillar: -0.1 to 0.1
    // Right pillar: 0.35 to 0.55
    if (
      (relX >= -0.58 && relX <= -0.32) ||
      (relX >= -0.13 && relX <= 0.13) ||
      (relX >= 0.32 && relX <= 0.58)
    ) {
      return [254, 243, 199, bgA];
    }
  }

  // Base / steps (relY from 0.45 to 0.7)
  if (relY >= 0.45 && relY <= 0.6 && Math.abs(relX) <= 0.8) {
    return [245, 158, 11, bgA];
  }
  if (relY >= 0.6 && relY <= 0.72 && Math.abs(relX) <= 0.9) {
    return [251, 191, 36, bgA];
  }

  return [bgR, bgG, bgB, bgA];
}

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate PWA icons
console.log('Generating 192x192 icon...');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192, (x, y, w, h) => drawAppIcon(x, y, w, h, false)));

console.log('Generating 512x512 icon...');
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512, (x, y, w, h) => drawAppIcon(x, y, w, h, false)));

console.log('Generating 512x512 maskable icon...');
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, (x, y, w, h) => drawAppIcon(x, y, w, h, true)));

console.log('Generating apple-touch-icon.png (180x180)...');
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, (x, y, w, h) => drawAppIcon(x, y, w, h, false)));

console.log('Generating favicon.png (64x64)...');
fs.writeFileSync(path.join(publicDir, 'favicon.png'), createPNG(64, 64, (x, y, w, h) => drawAppIcon(x, y, w, h, false)));

console.log('All icons generated successfully!');
