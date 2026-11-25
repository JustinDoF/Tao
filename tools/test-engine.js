global.window = global;
require('../js/lunar.js');
require('../js/data.js');
require('../js/engine.js');

function show(counts, note) {
  const r = window.LiuRen.castFromCounts(counts);
  const path = r.stops.map(s => s.meta.label + '→' + s.palace.name + '(' + s.n + ')').join('  ');
  console.log((note || '') + ' counts=' + JSON.stringify(counts) + ' hops=' + r.total + ' => ' + path + ' | 主宫 ' + r.main.name + ' ' + r.main.luck.label);
}

// 传统校验：农历三月初五午时 → 大安（大安起正月：三月速喜；速喜起初一：初五大安；大安起子：午时大安）
show([3, 5, 7], '经典例');
// 正月 初一 子时 → 大安
show([1, 1, 1], '极简');
// 二月 初二 丑时 → 留连
show([2, 2, 2], '二位');
show([6, 6, 6]);
show([12, 30, 12]);
show([7], '单数');
show([8, 9], '两数');

// 一致性：公式校验 index=(m-1+d-1+h-1)%6
let ok = true;
for (let m = 1; m <= 12; m++) for (let d = 1; d <= 30; d++) for (let h = 1; h <= 12; h++) {
  const r = window.LiuRen.castFromCounts([m, d, h]);
  if (r.mainIndex !== (m + d + h - 3) % 6) { ok = false; console.log('公式不一致', m, d, h); }
}
console.log('全量 4320 组与公式一致性：', ok ? '通过' : '失败');

// 农历/时辰
const t = window.Lunar.fromDate(new Date(2026, 10, 25, 22, 11), { lateZi: true });
console.log('2026-11-25 22:11 →', t.text, '| 月日时', t.month, t.day, t.hour);
const t2 = window.Lunar.fromDate(new Date(2026, 10, 25, 23, 30), { lateZi: true });
console.log('2026-11-25 23:30 晚子时 →', t2.text, '| 月日时', t2.month, t2.day, t2.hour, 'shifted=', t2.shifted);
const t3 = window.Lunar.fromDate(new Date(2026, 10, 25, 23, 30), { lateZi: false });
console.log('2026-11-25 23:30 不算次日 →', t3.text, t3.month, t3.day, t3.hour);
// 已知农历节点
[['2024-06-10', '五月初五'], ['2025-01-29', '正月初一'], ['2026-02-17', '正月初一'], ['2026-09-25', '八月十五'], ['2023-03-22', '闰二月初一']].forEach(([s, exp]) => {
  const [y, m, d] = s.split('-').map(Number);
  const l = window.Lunar.solar2lunar(y, m, d);
  const got = window.Lunar.monthName(l.m, l.isLeap) + window.Lunar.dayName(l.d);
  console.log(s, '→', got, got === exp ? 'OK' : '≠ ' + exp);
});
