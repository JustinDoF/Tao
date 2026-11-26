/* ==========================================================
   zhuge.js — 诸葛神数 起课
   三字笔画 → 上卦 / 下卦 / 动爻 → 签号 1–384
   ========================================================== */
(function (global) {
  'use strict';

  var ZD = global.ZhugeData;
  var MD = global.MeihuaData;
  var BAI = global.MeihuaBai || {};

  function mod(n, m) {
    var r = n % m;
    return r === 0 ? m : r;
  }

  /** 取字笔画；查不到返回 null */
  function strokeOf(ch) {
    if (!ch) return null;
    var n = ZD.strokes[ch];
    return typeof n === 'number' ? n : null;
  }

  /**
   * 由三字起课
   * @param chars ['字','字','字'] 或 null
   * @param strokes [n,n,n] 笔画数
   */
  function cast(chars, strokes) {
    var a = strokes[0], b = strokes[1], c = strokes[2];
    a = Math.max(1, Math.floor(a));
    b = Math.max(1, Math.floor(b));
    c = Math.max(1, Math.floor(c));

    var upNum = mod(a, 8);
    var lowNum = mod(b, 8);
    var dong = mod(c, 6);

    var up = MD.byNum[upNum];
    var low = MD.byNum[lowNum];
    var hex = MD.hexIndex[up.key + '|' + low.key];

    var signNo = (upNum - 1) * 8 * 6 + (lowNum - 1) * 6 + dong;

    var yao = ZD.yaoPos[dong - 1];
    var bai = BAI[hex.n] || null;

    return {
      chars: chars,
      strokes: [a, b, c],
      upNum: upNum, lowNum: lowNum, dong: dong,
      up: up, low: low,
      hex: hex,
      signNo: signNo,
      yao: yao,
      bai: bai,
      verdict: judge(hex, yao, bai, up, low)
    };
  }

  function judge(hex, yao, bai, up, low) {
    var lines = [];
    var score = 0;

    // 卦之总吉凶
    if (hex.fortune === '吉') score += 2;
    else if (hex.fortune === '凶') score -= 2;

    // 爻位
    if (yao.n === 2 || yao.n === 5) score += 1;      // 得中
    else if (yao.n === 3 || yao.n === 6) score -= 1; // 极位

    lines.push('<b>卦象</b>：上' + up.name + '（' + up.nature + '）下' + low.name
      + '（' + low.nature + '），是为「' + hex.name + '」。' + (bai ? bai.bai : ''));

    lines.push('<b>爻位</b>：动在' + yao.name + '，' + yao.pos + '。' + yao.text);

    var tail;
    if (score >= 3) tail = '卦吉而位得中，此签为上。事可成，且成得体面，宜放手去做。';
    else if (score >= 1) tail = '卦与位俱不恶，此签为中上。事可为，循序而行自有分晓。';
    else if (score === 0) tail = '吉凶相抵，此签为平。成败在人，守正待时为宜。';
    else if (score >= -2) tail = '卦或位有损，此签为中下。事多阻，宜缓图，先保根本。';
    else tail = '卦凶而位又极，此签为下。宜止宜退，强求必损。';

    lines.push('<b>总断</b>：' + tail);

    var label, cls;
    if (score >= 3) { label = '上上'; cls = 'luck-ji'; }
    else if (score >= 1) { label = '中上'; cls = 'luck-ji2'; }
    else if (score === 0) { label = '中平'; cls = 'luck-ji2'; }
    else if (score >= -2) { label = '中下'; cls = 'luck-xiong'; }
    else { label = '下下'; cls = 'luck-xiong'; }

    return {
      lines: lines,
      tone: { label: label, cls: cls, score: score },
      advice: yao.advice,
      yong: bai ? bai.yong : ''
    };
  }

  /** 解析输入的三字 → 笔画；返回 {ok, strokes, missing} */
  function resolveChars(str) {
    var arr = [];
    for (var i = 0; i < str.length; i++) arr.push(str.charAt(i));
    arr = arr.filter(function (c) { return c.trim() !== ''; });
    if (arr.length !== 3) return { ok: false, reason: 'need3', chars: arr };

    var strokes = [], missing = [];
    arr.forEach(function (c) {
      var s = strokeOf(c);
      if (s === null) missing.push(c);
      strokes.push(s);
    });

    if (missing.length) return { ok: false, reason: 'missing', chars: arr, missing: missing, strokes: strokes };
    return { ok: true, chars: arr, strokes: strokes };
  }

  global.Zhuge = {
    cast: cast,
    strokeOf: strokeOf,
    resolveChars: resolveChars,
    mod: mod
  };

})(window);
