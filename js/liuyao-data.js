/* ==========================================================
   liuyao-data.js — 六爻纳甲 基础数据
   一、六十四卦八宫归属（按变爻规则生成，另附标准表供校验）
   二、纳甲（八卦纳干支）
   三、地支五行、五行生克
   四、六神起例
   ========================================================== */
(function (global) {
  'use strict';

  var D = global.MeihuaData; // 复用八卦爻象与六十四卦索引，避免两套数据打架

  /* ---------- 八卦（键名与 meihua-data 一致） ---------- */
  var TRI = ['qian', 'dui', 'li', 'zhen', 'xun', 'kan', 'gen', 'kun'];
  var TRI_NAME = { qian: '乾', dui: '兑', li: '离', zhen: '震', xun: '巽', kan: '坎', gen: '艮', kun: '坤' };

  /* ---------- 纳甲 ----------
     stems[0]=内卦天干，stems[1]=外卦天干
     inner=初二三爻地支，outer=四五六爻地支 */
  var NAJIA = {
    qian: { stems: ['甲', '壬'], inner: ['子', '寅', '辰'], outer: ['午', '申', '戌'] },
    kun:  { stems: ['乙', '癸'], inner: ['未', '巳', '卯'], outer: ['丑', '亥', '酉'] },
    zhen: { stems: ['庚', '庚'], inner: ['子', '寅', '辰'], outer: ['午', '申', '戌'] },
    xun:  { stems: ['辛', '辛'], inner: ['丑', '亥', '酉'], outer: ['未', '巳', '卯'] },
    kan:  { stems: ['戊', '戊'], inner: ['寅', '辰', '午'], outer: ['申', '戌', '子'] },
    li:   { stems: ['己', '己'], inner: ['卯', '丑', '亥'], outer: ['酉', '未', '巳'] },
    gen:  { stems: ['丙', '丙'], inner: ['辰', '午', '申'], outer: ['戌', '子', '寅'] },
    dui:  { stems: ['丁', '丁'], inner: ['巳', '卯', '丑'], outer: ['亥', '酉', '未'] }
  };

  /* ---------- 八宫 ---------- */
  var PALACES = [
    { key: 'qian', name: '乾', wuxing: '金' },
    { key: 'kan',  name: '坎', wuxing: '水' },
    { key: 'gen',  name: '艮', wuxing: '土' },
    { key: 'zhen', name: '震', wuxing: '木' },
    { key: 'xun',  name: '巽', wuxing: '木' },
    { key: 'li',   name: '离', wuxing: '火' },
    { key: 'kun',  name: '坤', wuxing: '土' },
    { key: 'dui',  name: '兑', wuxing: '金' }
  ];

  /* 八宫卦序标准名（用于校验生成结果） */
  var PALACE_STANDARD = {
    qian: ['乾为天', '天风姤', '天山遁', '天地否', '风地观', '山地剥', '火地晋', '火天大有'],
    kan:  ['坎为水', '水泽节', '水雷屯', '水火既济', '泽火革', '雷火丰', '地火明夷', '地水师'],
    gen:  ['艮为山', '山火贲', '山天大畜', '山泽损', '火泽睽', '天泽履', '风泽中孚', '风山渐'],
    zhen: ['震为雷', '雷地豫', '雷水解', '雷风恒', '地风升', '水风井', '泽风大过', '泽雷随'],
    xun:  ['巽为风', '风天小畜', '风火家人', '风雷益', '天雷无妄', '火雷噬嗑', '山雷颐', '山风蛊'],
    li:   ['离为火', '火山旅', '火风鼎', '火水未济', '山水蒙', '风水涣', '天水讼', '天火同人'],
    kun:  ['坤为地', '地雷复', '地泽临', '地天泰', '雷天大壮', '泽天夬', '水天需', '水地比'],
    dui:  ['兑为泽', '泽水困', '泽地萃', '泽山咸', '水山蹇', '地山谦', '雷山小过', '雷泽归妹']
  };

  /* 世应：索引为卦序（0=本宫 … 7=归魂） */
  var SHIYING = [
    { shi: 6, ying: 3 },  // 本宫
    { shi: 1, ying: 4 },  // 一世
    { shi: 2, ying: 5 },  // 二世
    { shi: 3, ying: 6 },  // 三世
    { shi: 4, ying: 1 },  // 四世
    { shi: 5, ying: 2 },  // 五世
    { shi: 4, ying: 1 },  // 游魂
    { shi: 3, ying: 6 }   // 归魂
  ];

  var GEN_NAME = ['本宫', '一世', '二世', '三世', '四世', '五世', '游魂', '归魂'];

  /* ---------- 地支五行 ---------- */
  var ZHI_WUXING = {
    '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
    '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水'
  };

  /* 五行生克 */
  var SHENG = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
  var KE = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };

  /* ---------- 六神 ---------- */
  var LIUSHEN = ['青龙', '朱雀', '勾陈', '腾蛇', '白虎', '玄武'];

  /* 日干 → 初爻起何神 */
  var LIUSHEN_START = {
    '甲': '青龙', '乙': '青龙',
    '丙': '朱雀', '丁': '朱雀',
    '戊': '勾陈',
    '己': '腾蛇',
    '庚': '白虎', '辛': '白虎',
    '壬': '玄武', '癸': '玄武'
  };

  /* ---------- 六亲 ---------- */
  var LIUQIN = ['父母', '兄弟', '子孙', '妻财', '官鬼'];

  /* 六亲取用（问事） */
  var YONGSHEN = [
    { key: '父母', desc: '长辈、文书、房屋、车船、消息', use: '问父母长辈、考试文书、房产车辆' },
    { key: '兄弟', desc: '同辈、朋友、竞争者、破财', use: '问兄弟朋友、合伙、竞争、失物' },
    { key: '子孙', desc: '子女、晚辈、福气、医药、僧道', use: '问子女、求医、解灾、宠物' },
    { key: '妻财', desc: '钱财、货物、妻子、佣人', use: '问财运、买卖、妻子、失物' },
    { key: '官鬼', desc: '官职、功名、疾病、丈夫、盗贼', use: '问事业官运、疾病、丈夫、官司' }
  ];

  /* 动爻四象（以钱代蓍） */
  var YAO_STATES = [
    { key: 'laoyin',  name: '老阴', mark: '交', coins: 0, yin: 1, moving: true,  note: '三字' },
    { key: 'shaoyin', name: '少阴', mark: '拆', coins: 1, yin: 1, moving: false, note: '二背一字' },
    { key: 'shaoyang',name: '少阳', mark: '单', coins: 2, yin: 0, moving: false, note: '一背二字' },
    { key: 'laoyang', name: '老阳', mark: '重', coins: 3, yin: 0, moving: true,  note: '三背' }
  ];

  global.LiuYaoData = {
    tri: TRI,
    triName: TRI_NAME,
    najia: NAJIA,
    palaces: PALACES,
    palaceStandard: PALACE_STANDARD,
    shiying: SHIYING,
    genName: GEN_NAME,
    zhiWuxing: ZHI_WUXING,
    sheng: SHENG,
    ke: KE,
    liushen: LIUSHEN,
    liushenStart: LIUSHEN_START,
    liuqin: LIUQIN,
    yongshen: YONGSHEN,
    yaoStates: YAO_STATES
  };

})(window);
