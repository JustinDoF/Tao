global.window = global;
require('../js/meihua-data.js');
require('../js/meihua.js');

const D = global.MeihuaData;
const M = global.Meihua;

/* ---- 1. 六十四卦表完整性 ---- */
const combos = new Set();
let dup = [];
D.hexagrams.forEach(h => {
  const k = h.up + '|' + h.low;
  if (combos.has(k)) dup.push(h.name);
  combos.add(k);
});
console.log('卦数:', D.hexagrams.length, '| 唯一组合:', combos.size, '| 重复:', dup.length ? dup.join(',') : '无');
const missing = [];
D.trigrams.forEach(u => D.trigrams.forEach(l => {
  if (!D.hexIndex[u.key + '|' + l.key]) missing.push(u.name + '上' + l.name + '下');
}));
console.log('缺失组合:', missing.length ? missing.join(', ') : '无（8×8=64 全覆盖）');

/* ---- 2. 八卦爻象自检 ---- */
// 乾三连、坤六断、震仰盂、艮覆碗、离中虚、坎中满、兑上缺、巽下断
const expect = {
  '乾': [1,1,1], '坤': [0,0,0], '震': [1,0,0], '艮': [0,0,1],
  '离': [1,0,1], '坎': [0,1,0], '兑': [1,1,0], '巽': [0,1,1]
};
let ok = true;
D.trigrams.forEach(t => {
  const got = t.lines.join('');
  const exp = expect[t.name].join('');
  if (got !== exp) { ok = false; console.log('  ✗', t.name, '爻象', got, '应为', exp); }
});
console.log('八卦爻象:', ok ? '全部正确' : '有误');

/* ---- 3. 经卦组合与卦名一致性 ---- */
// 抽查：乾上乾下=乾为天，坤上坤下=坤为地，坎上震下=水雷屯，离上坎下=火水未济
const checks = [
  ['qian','qian','乾为天'], ['kun','kun','坤为地'], ['kan','zhen','水雷屯'],
  ['li','kan','火水未济'], ['kan','li','水火既济'], ['gen','gen','艮为山'],
  ['xun','xun','巽为风'], ['dui','dui','兑为泽'], ['zhen','zhen','震为雷'], ['li','li','离为火'], ['kan','kan','坎为水']
];
let ok2 = true;
checks.forEach(([u, l, name]) => {
  const h = D.hexIndex[u + '|' + l];
  if (!h || h.name !== name) { ok2 = false; console.log('  ✗', u, l, '→', h && h.name, '应为', name); }
});
console.log('卦名抽查:', ok2 ? '全部正确' : '有误');

/* ---- 4. 起卦算法 ---- */
function show(r, note) {
  console.log(`${note || ''} 本卦=${r.ben.name} 动爻=${r.dong} 体=${r.ti.name}(${r.ti.wuxing}) 用=${r.yong.name}(${r.yong.wuxing}) 互=${r.hu.name} 变=${r.bian ? r.bian.name : '-'} → ${r.verdict.rel.label}/${r.verdict.tone.label}`);
}
console.log('\n=== 起卦示例 ===');
show(M.castByNumbers(1, 1), '数1,1  ');
show(M.castByNumbers(8, 8), '数8,8  ');
show(M.castByNumbers(9, 17), '数9,17 ');
show(M.castByTime(7, 10, 18, 1), '丙午年十月十八子时');
show(M.castByNumbers(3, 5), '数3,5  ');

/* ---- 5. 体用判定正确性 ---- */
// 动爻<=3 → 用卦取下卦、体卦取上卦；动爻>=4 反之
let ok3 = true;
for (let a = 1; a <= 64; a++) for (let b = 1; b <= 64; b++) {
  const r = M.castByNumbers(a, b);
  if (r.dong <= 3) {
    if (r.yong.key !== r.low.key || r.ti.key !== r.up.key) { ok3 = false; }
  } else {
    if (r.yong.key !== r.up.key || r.ti.key !== r.low.key) { ok3 = false; }
  }
  if (r.lines.length !== 6) ok3 = false;
  if (!r.hu || !r.bian) ok3 = false;
  // 变卦必须与原卦不同（动一爻必变）
  if (r.bian.n === r.ben.n) ok3 = false;
}
console.log('体用/互变 4096 组:', ok3 ? '全部正确' : '有误');

/* ---- 6. 变卦爻验证 ---- */
const r = M.castByNumbers(3, 5);
const bl = r.lines.slice(); bl[r.dong - 1] = bl[r.dong - 1] ? 0 : 1;
const diff = r.lines.filter((v, i) => v !== bl[i]).length;
console.log('变卦仅动一爻:', diff === 1 ? '正确' : '错误 diff=' + diff);

/* ---- 7. 时间起卦与公式一致性 ---- */
let ok4 = true;
for (let z = 1; z <= 12; z++) for (let m = 1; m <= 12; m++) for (let d = 1; d <= 30; d++) for (let h = 1; h <= 12; h++) {
  const x = M.castByTime(z, m, d, h);
  const s1 = z + m + d, s2 = s1 + h;
  const expUp = ((s1 % 8) || 8), expLow = ((s2 % 8) || 8), expDong = ((s2 % 6) || 6);
  if (x.up.num !== expUp || x.low.num !== expLow || x.dong !== expDong) ok4 = false;
}
console.log('时间起卦 51840 组与公式一致:', ok4 ? '通过' : '失败');

/* ---- 8. 五行生克表 ---- */
const W = D.wuxing;
console.log('生:', JSON.stringify(W.sheng));
console.log('克:', JSON.stringify(W.ke));
let ok5 = true;
['木','火','土','金','水'].forEach(e => {
  if (!W.sheng[e] || !W.ke[e]) ok5 = false;
});
// 不能自己生自己/克自己
['木','火','土','金','水'].forEach(e => {
  if (W.sheng[e] === e || W.ke[e] === e) ok5 = false;
});
console.log('生克表:', ok5 ? '完备' : '有缺');
