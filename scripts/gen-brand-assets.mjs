import zlib from "node:zlib";
import fs from "node:fs";

const table = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function writePng(path, width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(path, png);
  return png.length;
}

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function makeCanvas(width, height, paint) {
  const buf = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = paint(x, y, width, height);
      const o = (y * width + x) * 4;
      buf[o] = r;
      buf[o + 1] = g;
      buf[o + 2] = b;
      buf[o + 3] = 255;
    }
  }
  return buf;
}

function blend(base, cover, color, colorAlpha = 1) {
  const t = Math.max(0, Math.min(1, cover)) * colorAlpha;
  return mix(base, [color[0], color[1], color[2]], t);
}

function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const dx = Math.abs(px - cx) - (hw - r);
  const dy = Math.abs(py - cy) - (hh - r);
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(dx, dy), 0) - r;
}

const SS = [0.25, 0.75];
function coverage(fn) {
  let inside = 0;
  for (const sy of SS) for (const sx of SS) if (fn(sx, sy)) inside++;
  return inside / 4;
}

/** Brand mark: rounded blue tile with a white magnifier. */
function drawMark(base, width, x0, y0, size, primary) {
  const half = size / 2;
  const radius = size * 0.28;
  const ringR = size * 0.19;
  const ringW = size * 0.08;
  const from = { x: half + size * 0.135, y: half + size * 0.135 };
  const to = { x: half + size * 0.32, y: half + size * 0.32 };
  const handleW = ringW;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x0 + x;
      const py = y0 + y;
      const o = (py * width + px) * 4;
      let color = [base[o], base[o + 1], base[o + 2]];

      color = blend(
        color,
        coverage((sx, sy) => sdRoundRect(x + sx, y + sy, half, half, half, half, radius) < 0),
        primary,
      );
      color = blend(
        color,
        coverage((sx, sy) => {
          const d = Math.hypot(x + sx - half, y + sy - half);
          return d <= ringR + ringW / 2 && d >= ringR - ringW / 2;
        }),
        [255, 255, 255],
      );

      const hx = x + 0.5;
      const hy = y + 0.5;
      const vx = to.x - from.x;
      const vy = to.y - from.y;
      const t = Math.max(
        0,
        Math.min(1, ((hx - from.x) * vx + (hy - from.y) * vy) / (vx * vx + vy * vy)),
      );
      const dist = Math.hypot(hx - (from.x + vx * t), hy - (from.y + vy * t));
      color = blend(color, dist <= handleW / 2 ? 1 : 0, [255, 255, 255]);

      base[o] = Math.round(color[0]);
      base[o + 1] = Math.round(color[1]);
      base[o + 2] = Math.round(color[2]);
      base[o + 3] = 255;
    }
  }
}

function drawBar(base, width, x, y, w, h, color, alpha) {
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const o = ((y + yy) * width + x + xx) * 4;
      const cov = coverage(
        (sx, sy) => sdRoundRect(xx + sx, yy + sy, w / 2, h / 2, w / 2, h / 2, h / 2) < 0,
      );
      const blended = blend([base[o], base[o + 1], base[o + 2]], cov, color, alpha);
      base[o] = Math.round(blended[0]);
      base[o + 1] = Math.round(blended[1]);
      base[o + 2] = Math.round(blended[2]);
      base[o + 3] = 255;
    }
  }
}

const PRIMARY = [59, 130, 246];
const DARK_A = [9, 13, 22];
const DARK_B = [15, 20, 32];

// Open Graph card: 1200x630
const W = 1200;
const H = 630;
const og = makeCanvas(W, H, (x, y) => {
  const base = mix(DARK_A, DARK_B, y / H);
  const glow = Math.max(0, 1 - Math.hypot((x - W / 2) / 620, (y - 90) / 430));
  let out = mix(base, PRIMARY, glow * 0.16);
  if (x % 48 === 0 || y % 48 === 0) out = mix(out, [255, 255, 255], 0.05);
  return [Math.round(out[0]), Math.round(out[1]), Math.round(out[2])];
});
drawMark(og, W, W / 2 - 90, H / 2 - 168, 180, PRIMARY);
for (let i = 0; i < 3; i++) {
  const barW = 460 - i * 110;
  drawBar(
    og,
    W,
    W / 2 - barW / 2,
    H / 2 + 66 + i * 48,
    barW,
    22,
    [226, 232, 240],
    i === 0 ? 0.95 : 0.45,
  );
}

// Apple touch icon: 180x180
const S = 180;
const icon = makeCanvas(S, S, (x, y) => {
  const base = mix(DARK_A, DARK_B, y / S);
  return [Math.round(base[0]), Math.round(base[1]), Math.round(base[2])];
});
drawMark(icon, S, 16, 16, 148, PRIMARY);

const ogSize = writePng("public/og-image.png", W, H, og);
const iconSize = writePng("public/apple-touch-icon.png", S, S, icon);
console.log(JSON.stringify({ ogSize, iconSize }));
