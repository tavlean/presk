#!/usr/bin/env node
// Deterministically generate the synthetic test fixtures (no network, no deps):
//   illustration.png — flat shapes / few colors / sharp edges (lossless-friendly,
//                       exposes JPEG ringing).
//   transparent.png  — RGBA with a full alpha range (tests alpha preservation).
// The photographic fixtures (photo.jpg, photo-large.jpg) are downloaded real
// photos (see tests/fixtures/README.md) — synthetic noise isn't representative
// of real photo entropy, so those are not generated here.
import { crc32, deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(w, h, rgba) {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  return Buffer.concat([
    SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const canvas = (w, h, [r, g, b, a]) => {
  const buf = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) buf.set([r, g, b, a], i * 4);
  return buf;
};
const px = (buf, w, x, y, c) => {
  if (x < 0 || y < 0 || x >= w) return;
  buf.set(c, (y * w + x) * 4);
};
const rect = (buf, w, x0, y0, x1, y1, c) => {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) px(buf, w, x, y, c);
};
const disc = (buf, w, cx, cy, r, c) => {
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) px(buf, w, x, y, c);
};

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const W = 512;
const H = 512;

// --- illustration: flat colours, sharp edges, ~6 colours ---
{
  const buf = canvas(W, H, [245, 245, 245, 255]); // off-white bg
  rect(buf, W, 40, 40, 240, 240, [220, 50, 47, 255]); // red square
  disc(buf, W, 360, 150, 90, [38, 139, 210, 255]); // blue circle
  rect(buf, W, 60, 300, 460, 380, [133, 153, 0, 255]); // green bar
  disc(buf, W, 150, 410, 60, [181, 137, 0, 255]); // amber circle
  rect(buf, W, 300, 300, 470, 470, [108, 113, 196, 255]); // violet square
  writeFileSync(here('./illustration.png'), encodePng(W, H, buf));
  console.log('wrote illustration.png');
}

// --- transparent: full alpha range over an opaque shape ---
{
  const buf = canvas(W, H, [0, 0, 0, 0]); // fully transparent bg
  disc(buf, W, 256, 256, 150, [211, 54, 130, 255]); // opaque magenta disc
  // horizontal alpha gradient band (alpha 0 -> 255) over a teal fill
  for (let x = 0; x < W; x++) {
    const a = Math.round((x / (W - 1)) * 255);
    for (let y = 430; y < 500; y++) px(buf, W, x, y, [42, 161, 152, a]);
  }
  writeFileSync(here('./transparent.png'), encodePng(W, H, buf));
  console.log('wrote transparent.png');
}
