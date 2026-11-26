global.window = global;
require('../js/meihua-data.js');
require('../js/qimen-data.js');
require('../js/qimen.js');
require('../js/liuyao-data.js');
require('../js/liuyao.js');

const MD = global.MeihuaData;
const D = global.LiuYaoData;
const LY = global.LiuYao;

let pass = 0, fail = 0;
const fails = [];
function ok(cond, label, extra) {
  if (cond) pass++;
  else { fail++; fails.push(label + (extra ? ' → ' + extra : '')); }
}
function section(t) { console.log('\n=== ' + t + ' ==='); }

/* ==========================================================
   表一：八宫卦序
   ========================================================== */
section('表一 八宫卦序');
const allHex = new Set();
let dupName = [];
D.palaces.forEach(p => {
  const list = LY.buildPalace(p.key);
  const std = D.palaceStandard[p.key];
  if (list.length !== 8) ok(false, p.name + '宫卦数', list.length);
  list.forEach((item, gi) => {
    const lowK = Object.keys(MD.byKey).filter(k => MD.byKey[k].lines.join('') === item.lines.slice(0,3).join(''))[0];
    const upK = Object.keys(MD.byKey).filter(k => MD.byKey[k].lines.join('') === item.lines.slice(3,6).join(''))[0];
    const hex = MD.hexIndex[upK + '|' + lowK];
    if (!hex) { ok(false, p.name + '宫第' + gi + '卦查无此卦'); return; }
    const expect = std[gi];
    if (hex.name !== expect) ok(false, `${p.name}宫 ${D.genName[gi]}`, `${hex.name} 应为 ${expect}`);
    if (allHex.has(hex.n)) dupName.push(hex.name);
    allHex.add(hex.n);
  });
});
ok(allHex.size === 64, '八宫共得 64 卦（无重复无遗漏）', allHex.size);
ok(dupName.length === 0, '无重复卦', dupName.join(','));
console.log('  64 卦八宫归属全部与标准表一致:', fail === 0 ? '是' : '否');

/* 世应位置 */
section('表二 世应');
const shiyingExpect = [
  [6,3],[1,4],[2,5],[3,6],[4,1],[5,2],[4,1],[3,6]
];
let syOk = true;
D.palaces.forEach(p => {
  LY.buildPalace(p.key).forEach((item, gi) => {
    if (D.shiying[gi].shi !== shiyingExpect[gi][0] || D.shiying[gi].ying !== shiyingExpect[gi][1]) {
      syOk = false; console.log('  ✗ ' + p.name + '宫 ' + D.genName[gi]);
    }
  });
});
ok(syOk, '世应八序正确');
// 世应必在初爻至上爻之间，且不同爻
let syValid = true;
D.shiying.forEach((s, i) => {
  if (s.shi < 1 || s.shi > 6 || s.ying < 1 || s.ying > 6) syValid = false;
  if (s.shi === s.ying) syValid = false;
  if (Math.abs(s.shi - s.ying) !== 3) syValid = false; // 世应相隔三位
});
ok(syValid, '世应均在 1–6 且相隔三位');

/* ==========================================================
   表三：纳甲
   ========================================================== */
section('表三 纳甲（八卦纯卦）');
const NAJIA_EXPECT = {
  '乾为天': ['甲子','甲寅','甲辰','壬午','壬申','壬戌'],
  '坤为地': ['乙未','乙巳','乙卯','癸丑','癸亥','癸酉'],
  '震为雷': ['庚子','庚寅','庚辰','庚午','庚申','庚戌'],
  '巽为风': ['辛丑','辛亥','辛酉','辛未','辛巳','辛卯'],
  '坎为水': ['戊寅','戊辰','戊午','戊申','戊戌','戊子'],
  '离为火': ['己卯','己丑','己亥','己酉','己未','己巳'],
  '艮为山': ['丙辰','丙午','丙申','丙戌','丙子','丙寅'],
  '兑为泽': ['丁巳','丁卯','丁丑','丁亥','丁酉','丁未']
};
let njOk = true;
Object.keys(NAJIA_EXPECT).forEach(name => {
  const hex = MD.hexagrams.filter(h => h.name === name)[0];
  const nj = LY.najia(MD.trigrams.filter(t => t.key === hex.low)[0].lines
    .concat(MD.trigrams.filter(t => t.key === hex.up)[0].lines));
  const got = nj.map(x => x.ganZhi);
  const exp = NAJIA_EXPECT[name];
  const same = got.join(',') === exp.join(',');
  if (!same) { njOk = false; console.log(`  ✗ ${name} 实得 ${got.join(' ')} 应为 ${exp.join(' ')}`); }
});
ok(njOk, '八卦纯卦纳甲全部正确');

// 纳甲规律：阳卦（乾震坎艮）顺行阳支，阴卦（坤巽离兑）逆行阴支
section('纳甲规律');
const YANG_ZHI = ['子','寅','辰','午','申','戌'];
const YIN_ZHI = ['丑','亥','酉','未','巳','卯'];
const YANG_GUA = ['qian', 'zhen', 'kan', 'gen'];
let ruleOk = true;
D.tri.forEach(k => {
  const n = D.najia[k];
  const seq = n.inner.concat(n.outer);
  const isYangTri = YANG_GUA.indexOf(k) >= 0;
  const base = isYangTri ? YANG_ZHI : YIN_ZHI;
  const start = base.indexOf(seq[0]);
  if (start < 0) { ruleOk = false; console.log('  ✗', k, '首支不在序列'); return; }
  for (let i = 0; i < 6; i++) {
    if (seq[i] !== base[(start + i) % 6]) { ruleOk = false; console.log('  ✗ ', k, seq.join('')); }
  }
});
ok(ruleOk, '八宫纳支：阳卦顺阳支、阴卦逆阴支');

// 阳卦四、阴卦四
ok(YANG_GUA.every(k => D.najia[k]), '四阳卦齐备');
ok(D.tri.filter(k => YANG_GUA.indexOf(k) < 0).length === 4, '四阴卦齐备');

/* ==========================================================
   表四：六亲
   ========================================================== */
section('表四 六亲');
// 关键校验：乾宫金
const QIAN_TEST = [
  ['子','子孙'], ['丑','父母'], ['寅','妻财'], ['卯','妻财'], ['辰','父母'], ['巳','官鬼'],
  ['午','官鬼'], ['未','父母'], ['申','兄弟'], ['酉','兄弟'], ['戌','父母'], ['亥','子孙']
];
let lqOk = true;
QIAN_TEST.forEach(([zhi, exp]) => {
  const got = LY.liuqin('金', zhi);
  if (got !== exp) { lqOk = false; console.log(`  ✗ 乾宫金 ${zhi} → ${got} 应为 ${exp}`); }
});
ok(lqOk, '乾宫（金）十二支六亲全部正确');

// 五行皆验证：每行 12 支，六亲必覆盖且逻辑自洽
let allOk = true;
['木','火','土','金','水'].forEach(wx => {
  const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  ZHI.forEach(z => {
    const q = LY.liuqin(wx, z);
    if (D.liuqin.indexOf(q) < 0) { allOk = false; console.log('  ✗', wx, z, q); }
  });
});
ok(allOk, '五行×十二支六亲取值合法');

// 六亲定义一致性：兄弟必须同五行
let defOk = true;
['木','火','土','金','水'].forEach(wx => {
  ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'].forEach(z => {
    if (D.zhiWuxing[z] === wx && LY.liuqin(wx, z) !== '兄弟') defOk = false;
  });
});
ok(defOk, '同五行者必为兄弟');

/* ==========================================================
   表五：六神
   ========================================================== */
section('表五 六神');
const LS_EXPECT = {
  '甲': ['青龙','朱雀','勾陈','腾蛇','白虎','玄武'],
  '乙': ['青龙','朱雀','勾陈','腾蛇','白虎','玄武'],
  '丙': ['朱雀','勾陈','腾蛇','白虎','玄武','青龙'],
  '丁': ['朱雀','勾陈','腾蛇','白虎','玄武','青龙'],
  '戊': ['勾陈','腾蛇','白虎','玄武','青龙','朱雀'],
  '己': ['腾蛇','白虎','玄武','青龙','朱雀','勾陈'],
  '庚': ['白虎','玄武','青龙','朱雀','勾陈','腾蛇'],
  '辛': ['白虎','玄武','青龙','朱雀','勾陈','腾蛇'],
  '壬': ['玄武','青龙','朱雀','勾陈','腾蛇','白虎'],
  '癸': ['玄武','青龙','朱雀','勾陈','腾蛇','白虎']
};
let lsOk = true;
Object.keys(LS_EXPECT).forEach(g => {
  const got = LY.liushen(g).join(',');
  if (got !== LS_EXPECT[g].join(',')) { lsOk = false; console.log(`  ✗ ${g}日 → ${got}`); }
});
ok(lsOk, '十干起六神全部正确');

/* ==========================================================
   表六：旬空
   ========================================================== */
section('表六 旬空');
const KONG_TEST = [
  [0, ['戌','亥']],   // 甲子旬
  [10, ['申','酉']],  // 甲戌旬
  [20, ['午','未']],  // 甲申旬
  [30, ['辰','巳']],  // 甲午旬
  [40, ['寅','卯']],  // 甲辰旬
  [50, ['子','丑']]   // 甲寅旬
];
let kOk = true;
KONG_TEST.forEach(([idx, exp]) => {
  const got = LY.xunKong(idx);
  if (got.join('') !== exp.join('')) { kOk = false; console.log(`  ✗ 序${idx} → ${got.join('')} 应为 ${exp.join('')}`); }
});
ok(kOk, '六旬空亡全部正确');

/* ==========================================================
   表七：动变
   ========================================================== */
section('表七 动变');
function st(key) {
  return D.yaoStates.filter(s => s.key === key)[0];
}
// 全静卦：乾为天，无动变
const quiet = LY.cast([
  st('shaoyang'), st('shaoyang'), st('shaoyang'),
  st('shaoyang'), st('shaoyang'), st('shaoyang')
], { date: new Date(2026, 10, 26, 10, 0) });
ok(quiet.ben.name === '乾为天', '六阳静 → 乾为天', quiet.ben.name);
ok(quiet.bian === null, '无动爻则无变卦');
ok(quiet.meta.palaceName === '乾' && quiet.meta.gen === 0, '乾为天属乾宫本宫');
ok(quiet.yao[5].shi === true && quiet.yao[2].ying === true, '本宫卦世六应三');

// 初爻动：乾变姤
const one = LY.cast([
  st('laoyang'), st('shaoyang'), st('shaoyang'),
  st('shaoyang'), st('shaoyang'), st('shaoyang')
], { date: new Date(2026, 10, 26, 10, 0) });
ok(one.ben.name === '乾为天', '本卦乾');
ok(one.bian && one.bian.hex.name === '天风姤', '初爻动 → 变天风姤', one.bian && one.bian.hex.name);
ok(one.moving.length === 1, '动爻数 1');

// 三爻动：乾变否
const three = LY.cast([
  st('laoyang'), st('laoyang'), st('laoyang'),
  st('shaoyang'), st('shaoyang'), st('shaoyang')
], { date: new Date(2026, 10, 26, 10, 0) });
ok(three.bian && three.bian.hex.name === '天地否', '初三二爻动 → 天地否', three.bian && three.bian.hex.name);

// 全动：乾变坤
const six = LY.cast([
  st('laoyang'), st('laoyang'), st('laoyang'),
  st('laoyang'), st('laoyang'), st('laoyang')
], { date: new Date(2026, 10, 26, 10, 0) });
ok(six.bian && six.bian.hex.name === '坤为地', '六爻全动 → 坤为地', six.bian && six.bian.hex.name);

// 变爻六亲以本卦宫五行
ok(six.bianYao[0].liuqin === LY.liuqin('金', six.bianYao[0].zhi), '变爻六亲以本卦宫五行');

/* ==========================================================
   表八：伏神
   ========================================================== */
section('表八 伏神');
// 天风姤（乾宫一世）：乾宫金，六亲为 父母(丑戌) 兄弟(申酉) 子孙(亥) 官鬼(午) 妻财(寅卯)
// 姤：初辛丑父母、二辛亥子孙、三辛酉兄弟、四壬午官鬼、五壬申兄弟、六壬戌父母
// 缺妻财 → 应伏寅或卯
const gou = LY.cast([
  st('shaoyin'), st('shaoyang'), st('shaoyang'),
  st('shaoyang'), st('shaoyang'), st('shaoyang')
], { date: new Date(2026, 10, 26, 10, 0) });
ok(gou.ben.name === '天风姤', '卦为天风姤', gou.ben.name);
const gouQin = gou.yao.map(y => y.liuqin);
console.log('  姤卦六亲:', gouQin.join(' '));
ok(gouQin.join(',') === '父母,子孙,兄弟,官鬼,兄弟,父母', '姤卦六亲序列正确', gouQin.join(','));
ok(gou.fushen.length > 0, '姤卦有伏神');
const fuQin = gou.fushen.map(f => f.liuqin);
console.log('  伏神:', gou.fushen.map(f => f.liuqin + '(' + f.ganZhi + ')@' + f.pos).join(' '));
ok(fuQin.indexOf('妻财') >= 0, '姤卦缺妻财故伏妻财', fuQin.join(','));
// 伏神干支必须来自本宫首卦同位
const pureQian = LY.buildPalace('qian')[0];
const pureNj = LY.najia(pureQian.lines);
let fuValid = true;
gou.fushen.forEach(f => {
  if (pureNj[f.pos - 1].ganZhi !== f.ganZhi) fuValid = false;
});
ok(fuValid, '伏神取自本宫首卦同位');

/* ==========================================================
   表九：完整卦例核对（天风姤）
   ========================================================== */
section('表九 天风姤完整卦例');
// 已知标准答案（甲子日占）
const g = LY.cast([
  st('shaoyin'), st('shaoyang'), st('shaoyang'),
  st('shaoyang'), st('shaoyang'), st('shaoyang')
], { date: new Date(2026, 10, 26, 10, 0) });
console.log('  卦：' + g.ben.name + '　' + g.palaceText + '　世' + g.meta.shi + '应' + g.meta.ying);
console.log('  日' + g.dayGanZhi + '　月建' + g.monthZhi + '　旬空' + g.kong.join(''));
g.yao.forEach(y => {
  console.log('  第' + y.pos + '爻 ' + y.liushen + ' '
    + (y.fushen ? '伏' + y.fushen.liuqin + y.fushen.ganZhi + ' ' : '')
    + y.liuqin + ' ' + y.ganZhi + ' ' + y.wuxing
    + (y.shi ? ' 世' : '') + (y.ying ? ' 应' : '')
    + (y.moving ? ' 动→' + y.bianGanZhi + ' ' + y.bianLiqin : '')
    + (y.kong ? ' 空' : ''));
});
// 世应
ok(g.meta.shi === 1 && g.meta.ying === 4, '姤卦世初应四', `世${g.meta.shi}应${g.meta.ying}`);
// 纳甲
const njG = g.yao.map(y => y.ganZhi).join(',');
ok(njG === '辛丑,辛亥,辛酉,壬午,壬申,壬戌', '姤卦纳甲正确', njG);

/* ==========================================================
   表十：全量稳定性（随机 3000 卦）
   ========================================================== */
section('表十 全量稳定性');
const KEYS = ['laoyin','shaoyin','shaoyang','laoyang'];
let inv = true, errs = '';
for (let i = 0; i < 3000; i++) {
  const states = [];
  for (let j = 0; j < 6; j++) states.push(st(KEYS[Math.floor(Math.random()*4)]));
  const r = LY.cast(states, { date: new Date(2026, 0, 1 + (i % 360), 10, 0) });

  // 六爻齐全
  if (r.yao.length !== 6) { inv = false; errs = '爻数不为6'; break; }
  // 世应各一
  if (r.yao.filter(y => y.shi).length !== 1 || r.yao.filter(y => y.ying).length !== 1) {
    inv = false; errs = '世应数量异常'; break;
  }
  // 纳甲六支必须两两可辨（六亲合法）
  if (r.yao.some(y => D.liuqin.indexOf(y.liuqin) < 0)) { inv = false; errs = '六亲非法'; break; }
  // 六神齐全
  if (r.yao.some(y => D.liushen.indexOf(y.liushen) < 0)) { inv = false; errs = '六神非法'; break; }
  // 动爻与变卦一致
  const mcount = r.yao.filter(y => y.moving).length;
  if (mcount !== r.moving.length) { inv = false; errs = '动爻计数不符'; break; }
  if (mcount > 0 && !r.bian) { inv = false; errs = '有动无变'; break; }
  if (mcount === 0 && r.bian) { inv = false; errs = '无动有变'; break; }
  // 变卦必须与原卦不同（前提有动爻）
  if (r.bian && r.bian.hex.n === r.ben.n) { inv = false; errs = '变卦同于本卦'; break; }
  // 伏神：只补缺失的六亲，且不与本卦重复
  const present = new Set(r.yao.map(y => y.liuqin));
  r.fushen.forEach(f => {
    if (present.has(f.liuqin)) { inv = false; errs = '伏神与本卦重复'; }
  });
}
ok(inv, '3000 随机卦全部自洽', errs);

/* 汇总 */
console.log('\n' + '='.repeat(46));
console.log(`通过 ${pass}　失败 ${fail}`);
if (fail) { console.log('失败项：'); fails.forEach(f => console.log('  ✗ ' + f)); }
