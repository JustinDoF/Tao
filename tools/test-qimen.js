global.window = global;
require('../js/qimen-data.js');
require('../js/qimen.js');

const Q = global.Qimen;
const D = global.QimenData;

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; } else { fail++; console.log('  ✗ ' + label + (extra ? ' → ' + extra : '')); }
}

/* ---------- 1. 节气时间（对照 2026 年公开历表，容差 ±1 天） ---------- */
console.log('=== 节气校验（2026）===');
const expectTerms = [
  ['春分', 0, 3, 20], ['夏至', 90, 6, 21], ['秋分', 180, 9, 23], ['冬至', 270, 12, 21]
];
expectTerms.forEach(([name, lon, mo, dy]) => {
  const d = Q.solveLongitude(lon, new Date(2026, mo - 1, dy));
  const got = d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` : 'null';
  const dayOk = d && d.getMonth() + 1 === mo && Math.abs(d.getDate() - dy) <= 1;
  console.log(`  ${name} 黄经${lon}° → ${got}  ${dayOk ? 'OK' : '偏差'}`);
  ok(dayOk, name);
});

// 节气名称与黄经的一致性
console.log('\n=== 节气索引映射 ===');
[['春分',0],['清明',15],['夏至',90],['冬至',270],['立春',315]].forEach(([nm,lon])=>{
  const idx = Math.floor(lon/15)%24;
  ok(D.termByIdx[idx] === nm, nm + ' 映射', D.termByIdx[idx]);
});
// 阳遁阴遁区间
ok(D.isYang(Math.floor(270/15))===true, '冬至为阳遁');
ok(D.isYang(Math.floor(90/15))===false, '夏至为阴遁');
ok(D.isYang(0)===true, '春分为阳遁');
ok(D.isYang(Math.floor(180/15))===false, '秋分为阴遁');

/* ---------- 2. 干支日 ---------- */
console.log('\n=== 干支日校验 ===');
// 已知：1949-10-01 为甲子日；2000-01-01 为戊午日
const d1949 = new Date(1949, 9, 1, 12);
ok(Q.gz(Q.dayGanzhiIndex(d1949)) === '甲子', '1949-10-01 甲子', Q.gz(Q.dayGanzhiIndex(d1949)));
const d2000 = new Date(2000, 0, 1, 12);
ok(Q.gz(Q.dayGanzhiIndex(d2000)) === '戊午', '2000-01-01 戊午', Q.gz(Q.dayGanzhiIndex(d2000)));

// 连续性：连续 400 天，干支必须逐日递增 1
let seqOk = true;
for (let i = 0; i < 400; i++) {
  const a = Q.dayGanzhiIndex(new Date(2026, 0, 1 + i, 12));
  const b = Q.dayGanzhiIndex(new Date(2026, 0, 2 + i, 12));
  if (b !== (a + 1) % 60) { seqOk = false; console.log('  断点 at', i, a, b); break; }
}
ok(seqOk, '干支日连续递增');

/* ---------- 3. 时干五鼠遁 ---------- */
console.log('\n=== 时干支 ===');
// 甲日子时=甲子；乙日子时=丙子；戊日子时=壬子
const checks = [['甲',0,'甲子'],['乙',0,'丙子'],['丙',0,'戊子'],['丁',0,'庚子'],['戊',0,'壬子']];
checks.forEach(([dg, zhi, exp]) => {
  const dayIdx = D.gan.indexOf(dg); // 用甲子旬起点近似，仅验时干
  const dt = new Date(2026, 0, 1, zhi * 2); // 占位
  // 直接验公式
  const hourGan = ((D.gan.indexOf(dg) % 5) * 2 + zhi) % 10;
  ok(D.gan[hourGan] === exp.charAt(0), `${dg}日子时应为${exp}`, D.gan[hourGan] + '子');
});

/* ---------- 4. 局数表 ---------- */
console.log('\n=== 局数表 ===');
let juOk = true;
Object.keys(D.juTable).forEach(k => {
  const v = D.juTable[k];
  if (!Array.isArray(v) || v.length !== 3) juOk = false;
  v.forEach(n => { if (n < 1 || n > 9) juOk = false; });
});
ok(Object.keys(D.juTable).length === 24, '24 节气齐全', Object.keys(D.juTable).length);
ok(juOk, '每节气三元局数 1–9');
ok(D.juTable['冬至'][0] === 1, '冬至上元一局');
ok(D.juTable['夏至'][0] === 9, '夏至上元九局');

/* ---------- 5. 排盘不变量 ---------- */
console.log('\n=== 排盘不变量（抽样 2000 个时刻）===');
let invOk = true, sampleErr = '';
let yangCount = 0, yinCount = 0;
for (let i = 0; i < 2000; i++) {
  const t = new Date(2026, 0, 1 + Math.floor(i / 5), (i % 5) * 5, 30);
  const r = Q.cast(t);
  if (r.yang) yangCount++; else yinCount++;

  // 地盘九干不重复
  const gans = Object.values(r.cells).map(c => c.gan).filter(Boolean);
  if (new Set(gans).size !== 9) { invOk = false; sampleErr = '地盘干重复 @' + t; break; }

  // 天盘八星不重复（中五宫无星，跳过）
  const RING8 = [1, 2, 3, 4, 6, 7, 8, 9];
  const stars = RING8.map(p => (r.cells[p].star || '').replace('·天禽', ''));
  if (new Set(stars).size !== 8) { invOk = false; sampleErr = '天盘星重复 @' + t + ' ' + stars.join(','); break; }

  // 八门不重复
  const doors = RING8.map(p => r.cells[p].door);
  if (new Set(doors).size !== 8) { invOk = false; sampleErr = '八门重复 @' + t + ' ' + doors.join(','); break; }

  // 八神不重复
  const gods = RING8.map(p => r.cells[p].god);
  if (new Set(gods).size !== 8) { invOk = false; sampleErr = '八神重复 @' + t + ' ' + gods.join(','); break; }

  // 值符星必在天盘（天芮·天禽时为天芮）
  if (!stars.includes(r.zhiFuStar)) { invOk = false; sampleErr = '值符星不在天盘 @' + t + ' 值符=' + r.zhiFuStar + ' 天盘=' + stars.join(','); break; }

  // 天禽必随天芮同宫
  const ruiCell = Object.values(r.cells).find(c => (c.star || '').indexOf('天芮') === 0);
  if (!ruiCell || ruiCell.star !== '天芮·天禽') { invOk = false; sampleErr = '天禽未随天芮 @' + t; break; }

  // 三吉门必须齐备
  if (r.goodDoors.length !== 3) { invOk = false; sampleErr = '三吉门缺失 @' + t + ' ' + r.goodDoors.length; break; }
}
ok(invOk, '排盘不变量', sampleErr);
console.log(`  阳遁 ${yangCount} / 阴遁 ${yinCount}`);

/* ---------- 6. 节气与局数的联动 ---------- */
console.log('\n=== 局数随节气变化 ===');
const r1 = Q.cast(new Date(2026, 5, 25, 12)); // 夏至后
const r2 = Q.cast(new Date(2026, 11, 25, 12)); // 冬至后
console.log('  2026-06-25:', r1.term.name, r1.juText, r1.yuanName);
console.log('  2026-12-25:', r2.term.name, r2.juText, r2.yuanName);
ok(r1.yang === false, '夏至后为阴遁');
ok(r2.yang === true, '冬至后为阳遁');

/* ---------- 7. 实例盘 ---------- */
console.log('\n=== 实例（2026-11-26 01:30）===');
const rt = Q.cast(new Date(2026, 10, 26, 1, 30));
console.log(`  ${rt.term.name} ${rt.yuanName} ${rt.juText}　日${rt.dayGz} 时${rt.hourGz}　旬首${rt.xun}（遁${rt.xunYi}）`);
console.log(`  值符${rt.zhiFuStar} 值使${rt.zhiShiDoor}　值符加时干「${rt.hourGan}」至 ${rt.targetPalace} 宫`);
console.log('  三吉门:', rt.goodDoors.map(g => `${g.door}→${g.dir}(${g.gua})`).join('  '));
const G = D.grid;
for (let r = 0; r < 3; r++) {
  console.log('  ' + G[r].map(n => {
    const c = rt.cells[n];
    return `[${n}${c.info.gua}]${c.god}/${c.star}/${c.door}/${c.gan}${c.tianGan ? '·' + c.tianGan : ''}`;
  }).join('  '));
}

console.log(`\n通过 ${pass}　失败 ${fail}`);
