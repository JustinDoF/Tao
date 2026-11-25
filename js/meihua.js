/* ==========================================================
   meihua.js — 梅花易数 起卦与断卦
   起卦：时间 / 数字 / 随机
   断卦：体用五行生克、互卦、变卦
   ========================================================== */
(function (global) {
  'use strict';

  var D = global.MeihuaData;
  var WX = D.wuxing;

  /* ---------------- 爻 ---------------- */
  function hexLines(hex) {
    var up = D.byKey[hex.up].lines;
    var low = D.byKey[hex.low].lines;
    return low.concat(up); // [初,二,三,四,五,上]
  }

  function linesToHex(lines) {
    var low = lines.slice(0, 3), up = lines.slice(3, 6);
    var lk = D.trigrams.filter(function (t) { return t.lines.join('') === low.join(''); })[0];
    var uk = D.trigrams.filter(function (t) { return t.lines.join('') === up.join(''); })[0];
    if (!lk || !uk) return null;
    return { hex: D.hexIndex[uk.key + '|' + lk.key], up: uk, low: lk, lines: lines.slice() };
  }

  /* ---------------- 取卦 ---------------- */
  function trigramByNum(n) {
    n = ((n - 1) % 8 + 8) % 8 + 1; // 1–8，余 0 取 8
    return D.byNum[n];
  }
  function mod(n, m) {
    var r = n % m;
    return r === 0 ? m : r;
  }

  /**
   * 数字起卦
   * 上卦 = 数一 % 8，下卦 = 数二 % 8，动爻 = (数一 + 数二) % 6
   */
  function castByNumbers(a, b) {
    a = Math.max(1, Math.floor(a));
    b = Math.max(1, Math.floor(b));
    var up = trigramByNum(mod(a, 8));
    var low = trigramByNum(mod(b, 8));
    var dong = mod(a + b, 6);
    return build(up, low, dong, { mode: 'num', a: a, b: b });
  }

  /**
   * 时间起卦
   * 上卦 = (年支序 + 月 + 日) % 8
   * 下卦 = (年支序 + 月 + 日 + 时) % 8
   * 动爻 = (年支序 + 月 + 日 + 时) % 6
   */
  function castByTime(zhiIndex, month, day, shichen) {
    var s1 = zhiIndex + month + day;
    var s2 = s1 + shichen;
    var up = trigramByNum(mod(s1, 8));
    var low = trigramByNum(mod(s2, 8));
    var dong = mod(s2, 6);
    return build(up, low, dong, { mode: 'time', zhiIndex: zhiIndex, month: month, day: day, shichen: shichen, sum1: s1, sum2: s2 });
  }

  /** 随机起卦：随机取年月日时之数 */
  function castRandom() {
    var z = Math.floor(Math.random() * 12) + 1;
    var m = Math.floor(Math.random() * 12) + 1;
    var d = Math.floor(Math.random() * 30) + 1;
    var h = Math.floor(Math.random() * 12) + 1;
    return castByTime(z, m, d, h);
  }

  /* ---------------- 组装卦体 ---------------- */
  function build(up, low, dong, meta) {
    var ben = D.hexIndex[up.key + '|' + low.key];
    var lines = hexLines(ben);

    // 体用：动爻所在之卦为「用」，另一卦为「体」
    var dongInLow = dong <= 3;
    var tiTri = dongInLow ? up : low;    // 体（静卦）
    var yongTri = dongInLow ? low : up;  // 用（动卦）

    // 互卦：下互 = 2,3,4 爻；上互 = 3,4,5 爻（索引 1,2,3 与 2,3,4）
    var huLow = [lines[1], lines[2], lines[3]];
    var huUp = [lines[2], lines[3], lines[4]];
    var huLowT = D.trigrams.filter(function (t) { return t.lines.join('') === huLow.join(''); })[0];
    var huUpT = D.trigrams.filter(function (t) { return t.lines.join('') === huUp.join(''); })[0];
    var hu = D.hexIndex[huUpT.key + '|' + huLowT.key];

    // 变卦：动爻变
    var bl = lines.slice();
    bl[dong - 1] = bl[dong - 1] ? 0 : 1;
    var bian = linesToHex(bl);

    return {
      mode: meta.mode,
      meta: meta,
      ben: ben,
      up: up,
      low: low,
      lines: lines,
      dong: dong,
      ti: tiTri,
      yong: yongTri,
      tiPos: dongInLow ? '上卦' : '下卦',
      yongPos: dongInLow ? '下卦' : '上卦',
      hu: hu,
      huUp: huUpT,
      huLow: huLowT,
      bian: bian ? bian.hex : null,
      bianLines: bl,
      guanxi: relation(tiTri.wuxing, yongTri.wuxing),
      verdict: judge(tiTri, yongTri, hu, bian ? bian.hex : null, dong)
    };
  }

  /* ---------------- 五行关系 ---------------- */
  function relation(ti, yong) {
    if (ti === yong) return { key: 'bihe', label: '体用比和', luck: '吉', level: 3,
      text: '体用同属' + ti + '，比和之象。' };
    if (WX.sheng[yong] === ti) return { key: 'yong_sheng_ti', label: '用生体', luck: '吉', level: 4,
      text: '用卦属' + yong + '，生体卦之' + ti + '，为「用生体」。' };
    if (WX.sheng[ti] === yong) return { key: 'ti_sheng_yong', label: '体生用', luck: '凶', level: -2,
      text: '体卦属' + ti + '，生用卦之' + yong + '，为「体生用」。' };
    if (WX.ke[ti] === yong) return { key: 'ti_ke_yong', label: '体克用', luck: '吉', level: 2,
      text: '体卦属' + ti + '，克用卦之' + yong + '，为「体克用」。' };
    if (WX.ke[yong] === ti) return { key: 'yong_ke_ti', label: '用克体', luck: '凶', level: -4,
      text: '用卦属' + yong + '，克体卦之' + ti + '，为「用克体」。' };
    return { key: 'none', label: '无生克', luck: '平', level: 0, text: '' };
  }

  var REL_TEXT = {
    yong_sheng_ti: '吉。他力助我，事易成，多有进益之喜；所求之事有人相扶，不劳而获。',
    bihe: '吉。体用比和，彼此同心，事顺而速成；谋为如意，无甚阻碍。',
    ti_ke_yong: '吉而费力。我能制事，事可成，然须亲自操劳、耗些心力，非坐而得。',
    ti_sheng_yong: '耗。我去生他，付出多于所得；事虽可为，终有耗损，宜量力而行。',
    yong_ke_ti: '凶。他来克我，事多阻逆，受制于人；强求必损，宜退守避锋。'
  };

  /* ---------------- 断辞 ---------------- */
  function judge(ti, yong, hu, bian, dong) {
    var rel = relation(ti.wuxing, yong.wuxing);
    var lines = [];
    lines.push('体卦为' + ti.name + '（' + ti.wuxing + '），用卦为' + yong.name + '（' + yong.wuxing + '），' + rel.text);
    lines.push(REL_TEXT[rel.key] || '');

    // 互卦为事之中程
    if (hu) {
      var huRel = relation(ti.wuxing, D.byKey[hu.low].wuxing);
      lines.push('互卦' + hu.name + '，为事之中程。' + (huRel.level > 0
        ? '中段得助，事有转机，宜于此时着力。'
        : huRel.level < 0
          ? '中段受阻，其间必有一番周折，须忍过方见分晓。'
          : '中段平顺，无甚起伏。'));
    }

    // 变卦为事之终局
    if (bian) {
      var bianRelTri = dong <= 3 ? null : null;
      lines.push('变卦' + bian.name + '，为事之终局。' + (bian.fortune === '吉'
        ? '终归吉顺，收束有成。'
        : bian.fortune === '凶'
          ? '终局欠顺，宜早作打算，勿待事败方思退。'
          : '终局平常，成败在人为，守正则无咎。'));
    }

    // 动爻位置
    var posName = ['初', '二', '三', '四', '五', '上'][dong - 1] + '爻';
    lines.push('动在' + posName + (dong <= 3 ? '，动在內卦，变在己身——事由己出，宜自省自修。'
      : '，动在外卦，变在环境——事由外至，宜观势待时。'));

    var level = rel.level;
    if (bian && bian.fortune === '凶') level -= 2;
    if (bian && bian.fortune === '吉') level += 1;

    var tone;
    if (level >= 3) tone = { label: '大吉', cls: 'luck-ji' };
    else if (level >= 1) tone = { label: '吉', cls: 'luck-ji2' };
    else if (level === 0) tone = { label: '平', cls: 'luck-ji2' };
    else if (level >= -2) tone = { label: '小凶', cls: 'luck-xiong' };
    else tone = { label: '凶', cls: 'luck-xiong' };

    var advice;
    if (level >= 3) advice = '所宜：顺势而为，把握当下；所忌：迟疑观望、错过时机。';
    else if (level >= 1) advice = '所宜：稳步推进，借助外力；所忌：独断专行、急求速成。';
    else if (level === 0) advice = '所宜：守正待时，凡事留余；所忌：轻举妄动、贪多求全。';
    else if (level >= -2) advice = '所宜：收敛所求，先固根本；所忌：追加投入、勉强撑持。';
    else advice = '所宜：止、退、改图，避其锋芒；所忌：强争硬取、孤注一掷。';

    return { rel: rel, tone: tone, lines: lines, advice: advice, level: level };
  }

  /* ---------------- 起卦依据描述 ---------------- */
  function basisText(r, lunarInfo) {
    var m = r.meta;
    if (m.mode === 'num') {
      return '报数 ' + m.a + ' · ' + m.b + '　上卦 ' + m.a + '÷8 余 ' + mod(m.a, 8)
        + ' 取' + r.up.name + '，下卦 ' + m.b + '÷8 余 ' + mod(m.b, 8)
        + ' 取' + r.low.name + '，动爻 (' + m.a + '+' + m.b + ')÷6 余 ' + r.dong;
    }
    if (m.mode === 'time') {
      var t = '年支' + m.zhiIndex + ' + 月' + m.month + ' + 日' + m.day + ' = ' + m.sum1;
      var t2 = ' 再加时' + m.shichen + ' = ' + m.sum2;
      return {
        zhi: m.zhiIndex, month: m.month, day: m.day, shichen: m.shichen,
        text: t + '，÷8 余 ' + mod(m.sum1, 8) + ' 取' + r.up.name
          + '；' + t2 + '，÷8 余 ' + mod(m.sum2, 8) + ' 取' + r.low.name
          + '，÷6 余 ' + r.dong + ' 为动爻'
      };
    }
    return '';
  }

  global.Meihua = {
    castByNumbers: castByNumbers,
    castByTime: castByTime,
    castRandom: castRandom,
    hexLines: hexLines,
    basisText: basisText,
    mod: mod
  };

})(window);
