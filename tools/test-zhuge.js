global.window = global;
require('../js/meihua-data.js');
require('../js/meihua-bai.js');
require('../js/zhuge-data.js');
require('../js/zhuge.js');

const MD = global.MeihuaData;
const ZD = global.ZhugeData;
const ZG = global.Zhuge;

let pass = 0, fail = 0;
const fails = [];
function ok(c, label, extra) {
  if (c) pass++; else { fail++; fails.push(label + (extra ? ' → ' + extra : '')); }
}
function sec(t) { console.log('\n=== ' + t + ' ==='); }

/* ---------- 笔画表 ---------- */
sec('笔画表');
const chars = Object.keys(ZD.strokes);
ok(chars.length >= 800, '收录字数 ≥ 800', chars.length);
let rangeOk = true;
chars.forEach(c => {
  const n = ZD.strokes[c];
  if (typeof n !== 'number' || n < 1 || n > 30) { rangeOk = false; console.log('  ✗', c, n); }
});
ok(rangeOk, '笔画数均在 1–30');

// 抽查已知笔画
const CHECK = [
  ['一',1],['二',2],['三',3],['四',5],['五',4],['六',4],['七',2],['八',2],['九',2],['十',2],
  ['人',2],['大',3],['小',3],['天',4],['地',6],['日',4],['月',4],['水',4],['火',4],['木',4],
  ['金',8],['土',3],['山',3],['石',5],['心',4],['手',4],['口',3],['目',5],['耳',6],['足',7],
  ['父',4],['母',5],['子',3],['女',3],['兄',5],['弟',7],['家',10],['门',3],
  ['春',9],['夏',10],['秋',9],['冬',5],['年',6],['时',7],
  ['中',4],['国',8],['民',5],['王',4],['玉',5],['龙',5],['马',3],['鸟',5],['鱼',8],
  ['上',3],['下',3],['左',5],['右',5],['来',7],['去',5],['行',6],['走',7]
];
let ckOk = true;
CHECK.forEach(([c, n]) => {
  const got = ZG.strokeOf(c);
  if (got !== n) { ckOk = false; console.log(`  ✗ ${c} 实得 ${got} 应为 ${n}`); }
});
ok(ckOk, '抽查 ' + CHECK.length + ' 常用字笔画全部正确');

/* ---------- 起卦算法 ---------- */
sec('起卦算法');
// 上卦=3÷8余3(离) 下卦=5÷8余5(巽) 动爻=7÷6余1 → 火风鼎，签号=(3-1)*48+(5-1)*6+1=96+24+1=121
const r1 = ZG.cast(['三','四','七'], [3, 5, 7]);
console.log('  笔画 3/5/7 → ' + r1.up.name + r1.low.name + ' ' + r1.hex.name
  + ' 动' + r1.dong + ' 第' + r1.signNo + '签 ' + r1.verdict.tone.label);
ok(r1.upNum === 3 && r1.lowNum === 5 && r1.dong === 1, '三数取卦正确');
ok(r1.hex.name === '火风鼎', '卦为火风鼎', r1.hex.name);
ok(r1.signNo === 121, '签号 121', r1.signNo);

// 余 0 处理
const r2 = ZG.cast(null, [8, 8, 6]);
ok(r2.upNum === 8 && r2.lowNum === 8 && r2.dong === 6, '余 0 取满数（8/8/6）',
  `${r2.upNum}/${r2.lowNum}/${r2.dong}`);
ok(r2.hex.name === '坤为地', '8/8 → 坤为地', r2.hex.name);
ok(r2.signNo === 384, '签号 384（最大）', r2.signNo);

const r3 = ZG.cast(null, [1, 1, 1]);
ok(r3.signNo === 1, '签号 1（最小）', r3.signNo);
ok(r3.hex.name === '乾为天', '1/1 → 乾为天', r3.hex.name);

/* ---------- 签号全覆盖 ---------- */
sec('签号 1–384 全覆盖');
const seen = new Map();
let dup = [];
for (let a = 1; a <= 64; a++) {
  for (let b = 1; b <= 64; b++) {
    for (let c = 1; c <= 12; c++) {
      const r = ZG.cast(null, [a, b, c]);
      if (r.signNo < 1 || r.signNo > 384 || !Number.isInteger(r.signNo)) {
        ok(false, '签号越界', `${a}/${b}/${c} → ${r.signNo}`);
      }
      const key = r.signNo + ':' + r.hex.n + ':' + r.dong;
      if (!seen.has(r.signNo)) seen.set(r.signNo, key);
    }
  }
}
const nums = Array.from(seen.keys()).sort((x, y) => x - y);
let contiguous = true;
for (let i = 0; i < 384; i++) {
  if (nums[i] !== i + 1) { contiguous = false; console.log('  ✗ 缺签', i + 1); break; }
}
ok(nums.length === 384, '恰得 384 个不同签号', nums.length);
ok(contiguous, '签号 1–384 连续无缺');

// 每个签号对应的 卦+爻 必须唯一且覆盖 64×6
const comboSeen = new Set();
for (let n = 1; n <= 384; n++) {
  // 反推：n-1 = (up-1)*48 + (low-1)*6 + (dong-1)
  const t = n - 1;
  const up = Math.floor(t / 48) + 1;
  const low = Math.floor((t % 48) / 6) + 1;
  const dong = (t % 6) + 1;
  const r = ZG.cast(null, [up, low, dong]);
  if (r.signNo !== n) { ok(false, '签号反推不符', n + ' → ' + r.signNo); }
  comboSeen.add(r.hex.n + ':' + r.dong);
}
ok(comboSeen.size === 384, '384 签恰好覆盖 64 卦 × 6 爻', comboSeen.size);

/* ---------- 卦爻完备 ---------- */
sec('每签均可得卦与爻位');
let allOk = true;
for (let n = 1; n <= 384; n += 7) {
  const t = n - 1;
  const r = ZG.cast(null, [Math.floor(t / 48) + 1, Math.floor((t % 48) / 6) + 1, (t % 6) + 1]);
  if (!r.hex || !r.hex.name || !r.yao || !r.yao.name) { allOk = false; console.log('  ✗', n); }
  if (!r.verdict || !r.verdict.tone || !r.verdict.lines.length) { allOk = false; console.log('  ✗ 断辞缺失', n); }
}
ok(allOk, '抽样 55 签均有卦、爻位、断辞');

// 64 卦白话必须齐全
let baiOk = true;
MD.hexagrams.forEach(h => {
  if (!global.MeihuaBai[h.n] || !global.MeihuaBai[h.n].bai) { baiOk = false; console.log('  ✗ 缺白话', h.name); }
});
ok(baiOk, '64 卦白话齐备（签义引用）');

/* ---------- 字形解析 ---------- */
sec('字形解析');
const good = ZG.resolveChars('天地人');
ok(good.ok === true, '「天地人」解析成功');
ok(good.strokes.join(',') === '4,6,2', '笔画 4/6/2', good.strokes.join(','));
const rr = ZG.cast(good.chars, good.strokes);
console.log('  天地人 → ' + rr.hex.name + ' 第' + rr.signNo + '签');

const bad = ZG.resolveChars('龘龘龘');
ok(bad.ok === false && bad.reason === 'missing', '未收录字返回 missing');

const two = ZG.resolveChars('天地');
ok(two.ok === false && two.reason === 'need3', '不足三字返回 need3');

/* ---------- 吉凶分布 ---------- */
sec('吉凶分布（384 签）');
const dist = {};
for (let n = 1; n <= 384; n++) {
  const t = n - 1;
  const r = ZG.cast(null, [Math.floor(t / 48) + 1, Math.floor((t % 48) / 6) + 1, (t % 6) + 1]);
  const L = r.verdict.tone.label;
  dist[L] = (dist[L] || 0) + 1;
}
console.log('  ' + Object.keys(dist).map(k => k + ':' + dist[k]).join('  '));
const sum = Object.values(dist).reduce((a, b) => a + b, 0);
ok(sum === 384, '五档吉凶合计 384', sum);
ok(Object.keys(dist).length >= 4, '至少四档并存', Object.keys(dist).length);

console.log('\n' + '='.repeat(46));
console.log(`通过 ${pass}　失败 ${fail}`);
if (fail) fails.forEach(f => console.log('  ✗ ' + f));
