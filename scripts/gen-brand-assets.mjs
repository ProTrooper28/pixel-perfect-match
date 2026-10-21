/**
 * Builds every BuildLens brand asset from a single geometry model, so the SVG
 * mark, the favicons, the PWA icons and the Open Graph card are always the same
 * artwork at different sizes.
 *
 *   node scripts/gen-brand-assets.mjs            # write all assets
 *   node scripts/gen-brand-assets.mjs --ascii    # preview the mark in the terminal
 *
 * The mark is the official logo: the navy camera-eye with blue light streaks,
 * the code glyph and the cyan lens ring with its blue magnifier handle.
 */
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

/* --------------------------------------------------------------- geometry */

const NAVY = [11, 37, 69]; // #0B2545
const BLUE = [16, 132, 245]; // #1084F5
const CYAN = [69, 212, 245]; // #45D4F5
const WHITE = [255, 255, 255];
const ICE = [245, 249, 255]; // #F5F9FF icon plate

const MARK_W = 200;
const MARK_H = 108;

const flattenCubic = (p0, c1, c2, p1, steps = 36) => {
  const pts = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0],
      u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1],
    ]);
  }
  return pts;
};

const roundPoly = (points, radius, steps = 10) => {
  const out = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const prev = points[(i + n - 1) % n];
    const cur = points[i];
    const next = points[(i + 1) % n];
    const lenIn = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
    const lenOut = Math.hypot(next[0] - cur[0], next[1] - cur[1]);
    const r = Math.min(radius, lenIn / 2, lenOut / 2);
    const inPt = [
      cur[0] + ((prev[0] - cur[0]) / lenIn) * r,
      cur[1] + ((prev[1] - cur[1]) / lenIn) * r,
    ];
    const outPt = [
      cur[0] + ((next[0] - cur[0]) / lenOut) * r,
      cur[1] + ((next[1] - cur[1]) / lenOut) * r,
    ];
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const u = 1 - t;
      out.push([
        u * u * inPt[0] + 2 * u * t * cur[0] + t * t * outPt[0],
        u * u * inPt[1] + 2 * u * t * cur[1] + t * t * outPt[1],
      ]);
    }
  }
  return out;
};

const roundedRectLoop = (cx, cy, w, h, r, angleDeg) => {
  const hw = w / 2;
  const hh = h / 2;
  const corners = [
    [-hw + r, -hh + r, Math.PI],
    [hw - r, -hh + r, -Math.PI / 2],
    [hw - r, hh - r, 0],
    [-hw + r, hh - r, Math.PI / 2],
  ];
  const pts = [];
  for (const [x, y, start] of corners) {
    for (let i = 0; i <= 8; i++) {
      const a = start + (i / 8) * (Math.PI / 2);
      pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
  }
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return pts.map(([x, y]) => [cx + x * cos - y * sin, cy + x * sin + y * cos]);
};

const circleLoop = (cx, cy, r, steps = 72) => {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
};

const capsuleLoop = (x1, y1, x2, y2, width, steps = 18) => {
  const r = width / 2;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = angle - Math.PI / 2 + (i / steps) * Math.PI;
    pts.push([x2 + Math.cos(a) * r, y2 + Math.sin(a) * r]);
  }
  for (let i = 0; i <= steps; i++) {
    const a = angle + Math.PI / 2 + (i / steps) * Math.PI;
    pts.push([x1 + Math.cos(a) * r, y1 + Math.sin(a) * r]);
  }
  return pts;
};

/** The official BuildLens mark, back to front. */
const MARK = [
  // Camera-eye outline: a navy crescent that tapers to a point on the right.
  {
    color: NAVY,
    loops: [
      [
        ...[[84, 16]],
        ...flattenCubic([84, 16], [118, 2], [158, 14], [194, 54]),
        ...flattenCubic([194, 54], [158, 94], [118, 106], [84, 92]),
      ],
      [
        [94, 28],
        ...flattenCubic([94, 28], [124, 18], [154, 32], [188, 54]).slice(1),
        ...flattenCubic([188, 54], [154, 76], [124, 90], [94, 80]).slice(1),
      ],
    ],
  },
  // Shutter streaks on the left: blue blade, navy blade, blue blade.
  { color: BLUE, loops: [roundedRectLoop(12, 58, 11, 44, 5.5, -6)] },
  { color: NAVY, loops: [roundedRectLoop(26, 58, 10, 56, 5, -6)] },
  { color: BLUE, loops: [roundedRectLoop(40, 58, 15, 74, 7.5, -6)] },
  // Camera body.
  {
    color: NAVY,
    loops: [
      roundPoly(
        [
          [44, 36],
          [84, 3],
          [91, 9],
          [91, 101],
          [44, 101],
        ],
        6,
      ),
    ],
  },
  // Lens: navy disc, cyan ring, highlight, then the blue magnifier handle.
  { color: NAVY, loops: [circleLoop(122, 54, 29)] },
  { color: BLUE, loops: [capsuleLoop(140, 72, 165, 97, 12.5)] },
  {
    color: CYAN,
    loops: [circleLoop(122, 54, 21.5), circleLoop(122, 54, 15.5)],
  },
  { color: WHITE, loops: [circleLoop(112, 42, 4.2, 40)] },
  // Code glyph on the body.
  { color: WHITE, loops: [capsuleLoop(66, 37, 58, 45, 4.6)] },
  { color: WHITE, loops: [capsuleLoop(58, 45, 66, 53, 4.6)] },
  { color: WHITE, loops: [capsuleLoop(68, 56, 75, 34, 4.6)] },
  { color: WHITE, loops: [capsuleLoop(77, 37, 85, 45, 4.6)] },
  { color: WHITE, loops: [capsuleLoop(85, 45, 77, 53, 4.6)] },
];

/* ------------------------------------------------------------------- svg */

const n = (v) => (Math.round(v * 100) / 100).toString();
const loopToPath = (loop) => `M${loop.map(([x, y]) => `${n(x)} ${n(y)}`).join("L")}Z`;
const shapeToPath = (shape) => shape.loops.map(loopToPath).join("");
const hex = ([r, g, b]) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;

const markPaths = (fill, extra = "") =>
  MARK.map(
    (shape) =>
      `<path d="${shapeToPath(shape)}" fill="${hex(fill ?? shape.color)}" fill-rule="evenodd"${extra}/>`,
  ).join("");

function writeMarkSvg(file) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_W} ${MARK_H}" width="${MARK_W}" height="${MARK_H}" role="img" aria-label="BuildLens">
<title>BuildLens</title>
${markPaths()}
</svg>
`;
  fs.writeFileSync(file, svg);
  return svg.length;
}

function writeFaviconSvg(file) {
  // Small sizes need the mark on its plate: the navy body would disappear on a
  // dark browser tab otherwise.
  const scale = 0.28;
  const w = MARK_W * scale;
  const h = MARK_H * scale;
  const x = (64 - w) / 2;
  const y = (64 - h) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
<rect width="64" height="64" rx="14" fill="${hex(ICE)}"/>
<g transform="translate(${n(x)} ${n(y)}) scale(${scale})">
${markPaths()}
</g>
</svg>
`;
  fs.writeFileSync(file, svg);
  return svg.length;
}

/* ------------------------------------------------------------------- png */

const table = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
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

function encodePng(width, height, rgba) {
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
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const insideLoops = (loops, x, y) => {
  let inside = false;
  for (const loop of loops) {
    for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
      const [xi, yi] = loop[i];
      const [xj, yj] = loop[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
};

/** Paint a mark (scaled + positioned) into a raw RGBA buffer. */
function drawMark(buf, cw, ch, { x, y, scale }, colors = MARK) {
  for (const shape of colors) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const loop of shape.loops)
      for (const [px, py] of loop) {
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
      }
    const x0 = Math.max(0, Math.floor(x + minX * scale));
    const x1 = Math.min(cw - 1, Math.ceil(x + maxX * scale));
    const y0 = Math.max(0, Math.floor(y + minY * scale));
    const y1 = Math.min(ch - 1, Math.ceil(y + maxY * scale));

    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        let hits = 0;
        for (let sy = 0; sy < 4; sy++) {
          for (let sx = 0; sx < 4; sx++) {
            const mx = (px + (sx + 0.5) / 4 - x) / scale;
            const my = (py + (sy + 0.5) / 4 - y) / scale;
            if (insideLoops(shape.loops, mx, my)) hits++;
          }
        }
        if (hits === 0) continue;
        const a = hits / 16;
        const o = (py * cw + px) * 4;
        for (let c = 0; c < 3; c++) {
          buf[o + c] = Math.round(buf[o + c] * (1 - a) + shape.color[c] * a);
        }
        buf[o + 3] = 255;
      }
    }
  }
}

const fillRect = (buf, cw, ch, x0, y0, x1, y1, color) => {
  for (let y = Math.max(0, y0); y < Math.min(ch, y1); y++) {
    for (let x = Math.max(0, x0); x < Math.min(cw, x1); x++) {
      const o = (y * cw + x) * 4;
      buf[o] = color[0];
      buf[o + 1] = color[1];
      buf[o + 2] = color[2];
      buf[o + 3] = 255;
    }
  }
};

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function renderIcon(size, plateColor = ICE) {
  const buf = Buffer.alloc(size * size * 4);
  fillRect(buf, size, size, 0, 0, size, size, plateColor);
  const scale = (size * 0.86) / MARK_W;
  drawMark(buf, size, size, {
    x: (size - MARK_W * scale) / 2,
    y: (size - MARK_H * scale) / 2,
    scale,
  });
  return buf;
}

function writeIco(file, pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + pngs.length * 16;
  for (const { size, data } of pngs) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(entry);
  }
  fs.writeFileSync(file, Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]));
}

/* -------------------------------------------------------------------- og */

function renderOgCard(width = 1200, height = 630) {
  const buf = Buffer.alloc(width * height * 4);
  const darkA = [8, 21, 38];
  const darkB = [13, 40, 70];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let color = mix(darkA, darkB, y / height);
      const glow =
        Math.max(0, 1 - Math.hypot((x - width * 0.5) / 520, (y - height * 0.42) / 340)) ** 2;
      color = mix(color, BLUE, glow * 0.22);
      const o = (y * width + x) * 4;
      buf[o] = Math.round(color[0]);
      buf[o + 1] = Math.round(color[1]);
      buf[o + 2] = Math.round(color[2]);
      buf[o + 3] = 255;
    }
  }

  // White plate so the navy half of the mark stays readable on the dark card.
  const plateW = 380;
  const plateH = 236;
  const plateX = Math.round((width - plateW) / 2);
  const plateY = Math.round((height - plateH) / 2);
  const radius = 34;
  for (let y = plateY; y < plateY + plateH; y++) {
    for (let x = plateX; x < plateX + plateW; x++) {
      const dx = Math.max(plateX + radius - x, 0, x - (plateX + plateW - radius - 1));
      const dy = Math.max(plateY + radius - y, 0, y - (plateY + plateH - radius - 1));
      if (Math.hypot(dx, dy) > radius) continue;
      let hits = 0;
      for (let sy = 0; sy < 4; sy++) {
        for (let sx = 0; sx < 4; sx++) {
          const px = x + (sx + 0.5) / 4;
          const py = y + (sy + 0.5) / 4;
          const ddx = Math.max(plateX + radius - px, 0, px - (plateX + plateW - radius));
          const ddy = Math.max(plateY + radius - py, 0, py - (plateY + plateH - radius));
          if (Math.hypot(ddx, ddy) <= radius) hits++;
        }
      }
      if (hits === 0) continue;
      const a = hits / 16;
      const o = (y * width + x) * 4;
      buf[o] = Math.round(buf[o] * (1 - a) + 255 * a);
      buf[o + 1] = Math.round(buf[o + 1] * (1 - a) + 255 * a);
      buf[o + 2] = Math.round(buf[o + 2] * (1 - a) + 255 * a);
    }
  }

  const scale = 300 / MARK_W;
  drawMark(buf, width, height, {
    x: (width - MARK_W * scale) / 2,
    y: (height - MARK_H * scale) / 2,
    scale,
  });

  // Accent rules beneath the plate, echoing the brand's blue.
  for (let i = 0; i < 3; i++) {
    const barW = [220, 150, 90][i];
    const barX = Math.round((width - barW) / 2);
    const barY = Math.round((height + plateH) / 2 + 26 + i * 16);
    for (let y = barY; y < barY + 6; y++) {
      for (let x = barX; x < barX + barW; x++) {
        const o = (y * width + x) * 4;
        const target = i === 0 ? WHITE : CYAN;
        const a = i === 0 ? 0.85 : 0.45;
        buf[o] = Math.round(buf[o] * (1 - a) + target[0] * a);
        buf[o + 1] = Math.round(buf[o + 1] * (1 - a) + target[1] * a);
        buf[o + 2] = Math.round(buf[o + 2] * (1 - a) + target[2] * a);
      }
    }
  }
  return buf;
}

/* ------------------------------------------------------------------ main */

const PUBLIC = path.join(process.cwd(), "public");
const BRAND = path.join(PUBLIC, "brand");
fs.mkdirSync(BRAND, { recursive: true });

if (process.argv.includes("--ascii")) {
  const W = 78;
  const H = Math.round((W * MARK_H) / MARK_W / 2.1);
  const glyph = (rgb) => {
    if (rgb[0] > 200 && rgb[1] > 200) return "#";
    if (rgb[2] > 200 && rgb[0] < 120) return "o";
    if (rgb[2] > 200) return "+";
    if (rgb[0] < 60) return "%%";
    return "..";
  };
  for (let y = 0; y < H; y++) {
    let line = "";
    for (let x = 0; x < W; x++) {
      const mx = ((x + 0.5) / W) * MARK_W;
      const my = ((y + 0.5) / H) * MARK_H;
      let color = null;
      for (const shape of MARK) {
        if (insideLoops(shape.loops, mx, my)) color = shape.color;
      }
      line += color ? glyph(color) : "  ";
    }
    console.log(line);
  }
  process.exit(0);
}

const written = {};
written.markSvg = writeMarkSvg(path.join(BRAND, "buildlens-mark.svg"));
written.faviconSvg = writeFaviconSvg(path.join(PUBLIC, "favicon.svg"));

const iconSizes = [
  [32, path.join(BRAND, "icon-32.png")],
  [180, path.join(PUBLIC, "apple-touch-icon.png")],
  [192, path.join(BRAND, "icon-192.png")],
  [512, path.join(BRAND, "icon-512.png")],
];
for (const [size, file] of iconSizes) {
  fs.writeFileSync(file, encodePng(size, size, renderIcon(size)));
}

const icoSizes = [16, 32, 48].map((size) => ({
  size,
  data: encodePng(size, size, renderIcon(size)),
}));
writeIco(path.join(PUBLIC, "favicon.ico"), icoSizes);

const OG_W = 1200;
const OG_H = 630;
fs.writeFileSync(
  path.join(PUBLIC, "og-image.png"),
  encodePng(OG_W, OG_H, renderOgCard(OG_W, OG_H)),
);

console.log(JSON.stringify(written));
