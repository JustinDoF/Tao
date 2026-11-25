// 生成 PWA 图标（纯 Node，无依赖）：SDF 抗锯齿绘制，输出 PNG
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

/* ---------- PNG 编码 ---------- */
let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcBuf]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------- 绘制 ---------- */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const cov = (d) => clamp(0.5 - d, 0, 1); // d: 有符号距离(像素)，负为内部

function render(size, pad) {
  const buf = Buffer.alloc(size * size * 4);
  const c = size / 2;
  const k = 1 - pad * 2;           // 内容缩放（maskable 用 0.78 留安全区）
  const R = size * 0.33 * k;       // 六宫环半径
  const ringW = size * 0.0085 * k;
  const dotR = size * 0.049 * k;
  const tW = size * 0.152 * k;     // 卦象线长
  const tH = size * 0.019 * k;     // 卦象线粗
  const tGap = size * 0.030 * k;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5, py = y + 0.5;

      // 背景：竖向墨色渐变
      const ty = py / size;
      let r = 19 + (10 - 19) * ty;
      let g = 26 + (13 - 26) * ty;
      let b = 31 + (15 - 31) * ty;

      // 中心金色微光
      const dx = px - c, dy = py - c;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const glow = Math.max(0, 1 - dist / (size * 0.52)) ** 2 * 0.5;
      r += (201 - r) * glow * 0.20;
      g += (169 - g) * glow * 0.20;
      b += (97 - b) * glow * 0.20;

      let a0 = 1;

      // 内圈细线
      const dInner = Math.abs(dist - size * 0.145 * k) - size * 0.0032 * k;
      const aa = cov(dInner) * 0.55;
      r = 201 * aa + r * (1 - aa); g = 169 * aa + g * (1 - aa); b = 97 * aa + b * (1 - aa);

      // 六宫环
      const dRing = Math.abs(dist - R) - ringW;
      const ar = cov(dRing);
      r = 201 * ar + r * (1 - ar); g = 169 * ar + g * (1 - ar); b = 97 * ar + b * (1 - ar);

      // 六个宫位圆点
      for (let i = 0; i < 6; i++) {
        const ang = -Math.PI / 2 + i * Math.PI / 3;
        const nx = c + R * Math.cos(ang), ny = c + R * Math.sin(ang);
        const dd = Math.hypot(px - nx, py - ny) - dotR;
        const ad = cov(dd);
        if (ad > 0) {
          const hi = i === 0 ? 1 : 0.86;
          const cr = 214 * hi, cg = 183 * hi, cb = 107 * hi;
          r = cr * ad + r * (1 - ad); g = cg * ad + g * (1 - ad); b = cb * ad + b * (1 - ad);
        }
      }

      // 中央三横（乾卦）
      for (let i = -1; i <= 1; i++) {
        const ly = c + i * (tH + tGap);
        const ddx = Math.max(Math.abs(px - c) - tW / 2, 0);
        const ddy = Math.max(Math.abs(py - ly) - tH / 2, 0);
        const dl = Math.hypot(ddx, ddy) - 0.0001;
        const al = cov(Math.hypot(ddx, ddy) <= 0.0001 ? -1 : dl);
        if (al > 0) {
          r = 227 * al + r * (1 - al); g = 203 * al + g * (1 - al); b = 148 * al + b * (1 - al);
        }
      }

      const o = (y * size + x) * 4;
      buf[o] = clamp(Math.round(r), 0, 255);
      buf[o + 1] = clamp(Math.round(g), 0, 255);
      buf[o + 2] = clamp(Math.round(b), 0, 255);
      buf[o + 3] = Math.round(a0 * 255);
    }
  }
  return encodePNG(size, size, buf);
}

const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });
const jobs = [
  ['icon-180.png', 180, 0.06],
  ['icon-192.png', 192, 0.06],
  ['icon-512.png', 512, 0.06],
  ['icon-maskable-512.png', 512, 0.15],
  ['icon-1024.png', 1024, 0.06]
];
for (const [name, size, pad] of jobs) {
  fs.writeFileSync(path.join(outDir, name), render(size, pad));
  console.log('✓', name, size + 'px');
}
