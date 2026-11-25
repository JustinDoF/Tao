/* ==========================================================
   engine.js — 小六壬 起课算法
   掌诀顺行：大安1 → 留连2 → 速喜3 → 赤口4 → 小吉5 → 空亡6
   三步起课：大安起月，月宫起日，日宫起时
   ========================================================== */
(function (global) {
  'use strict';

  var P = global.LiuRenData.palaces;
  var META = global.LiuRenData.phaseMeta;

  // 六宫在「起因/进程/结局」三种语境下的语气
  var TONE = {
    daan:     { start: '本已安顿，机缘自静中而来', mid: '守成不惊，进展平稳无波', end: '归于安稳，事体自然而成' },
    liulian:  { start: '多由旧事牵缠，一时难见分明', mid: '反复迟滞，事情悬而未决', end: '归期难期，终多迁延拖尾' },
    suxi:     { start: '机缘骤至，来得甚急', mid: '进展迅捷，一路顺风', end: '终得喜讯，速成其事' },
    chikou:   { start: '多因口舌是非而起', mid: '争执纷扰，须防人相害', end: '终有争竞，宜守理而不争' },
    xiaoji:   { start: '人缘和合，先得众助', mid: '商量可成，诸事顺遂', end: '终得圆满，和合而收' },
    kongwang: { start: '起因虚浮，根基不实', mid: '费力无功，事多落空', end: '终归虚耗，宜早改图' }
  };

  function clampCount(n) {
    n = Math.floor(Number(n));
    if (!isFinite(n) || n < 1) n = 1;
    return n;
  }

  /**
   * 由若干个数起课（1–3 个）
   * 单数：直落一宫；两数：天时 + 结局；三数：天时 / 地利 / 人和
   */
  function castFromCounts(counts) {
    counts = counts.map(clampCount).slice(0, 3);

    var phasePlan;
    if (counts.length === 1) phasePlan = [2];
    else if (counts.length === 2) phasePlan = [0, 2];
    else phasePlan = [0, 1, 2];

    var pos = 0;
    var hops = [];
    var stops = [];

    counts.forEach(function (n, i) {
      var phase = phasePlan[i];
      for (var k = 1; k < n; k++) {
        pos = (pos + 1) % 6;
        hops.push({ pos: pos, phase: phase, last: k === n - 1 });
      }
      stops.push({
        pos: pos,
        n: n,
        phase: phase,
        palace: P[pos],
        meta: META[phase]
      });
      // 若本步为 1，则落宫即上一步落宫，hops 中无新点，仍需在动画里标记
      if (n === 1 && hops.length > 0) hops[hops.length - 1].stopHere = phase;
    });

    var mainIdx = pos;
    var main = P[mainIdx];

    return {
      counts: counts,
      hops: hops,
      stops: stops,
      mainIndex: mainIdx,
      main: main,
      total: hops.length,
      verdict: buildVerdict(stops, main),
      yingqi: main.yingqi
    };
  }

  /** 月日时起课：以农历月、日、时辰（1–12） */
  function castByTime(month, day, hour) {
    var r = castFromCounts([month, day, hour]);
    r.mode = 'time';
    return r;
  }

  /** 组合断：看三宫的起承转合 */
  function buildVerdict(stops, main) {
    var first = stops[0].palace;
    var last = stops[stops.length - 1].palace;
    var s = first.luck.level, e = last.luck.level;
    var head = '起于「' + first.name + '」，终归「' + last.name + '」。';

    var body;
    if (e >= 3) {
      if (s < 0) body = '先难后易，初有阻滞而终得圆满；不必因开局不利而退，守至时来，自有转机。';
      else body = '三宫气顺，起承转合皆无大碍；事可放手为之，惟须循序，不必过急。';
    } else if (e === -2) {
      if (s >= 3) body = '初时顺遂，末段略有拖尾；事虽可成，然须留后手，勿求全功。';
      else body = '全局偏滞，成事费力；宜收缩所求，先保住已得之物。';
    } else if (e <= -3) {
      if (s >= 3) body = '始吉终凶，起初顺遂而后渐失其势；宜见好即收，切勿贪进，防盛极而衰。';
      else body = '三宫俱滞，事多阻隔；宜止不宜动，退守待时方为上策，强求必生灾咎。';
    } else {
      body = '平中带吉，事在人为；守正而行，可得其中。';
    }

    // 若中宫与首尾相冲（吉宫夹凶宫），补一句提醒
    var mid = stops.length === 3 ? stops[1].palace : null;
    if (mid && mid.luck.level <= -3 && s >= 3 && e >= 3) {
      body += '惟中程逢「' + mid.name + '」，途中必有一番是非周折，过此一关则无碍。';
    }

    var advice = last.luck.level >= 3
      ? '所宜：谋定而后动，趁势而行；所忌：犹疑反复、错失时机。'
      : (last.luck.level === -2
        ? '所宜：缓图、守成、借力于人；所忌：催促逼迫、反复变卦。'
        : '所宜：止、避、改图、解禳安心；所忌：强行、争胜、再作投入。');

    return { head: head, body: body, advice: advice };
  }

  /** 生成三宫逐段解读 */
  function phaseLines(stops) {
    return stops.map(function (st) {
      var tone = TONE[st.palace.key];
      var word = st.phase === 0 ? tone.start : (st.phase === 1 ? tone.mid : tone.end);
      return {
        label: st.meta.label,
        desc: st.meta.desc,
        palace: st.palace,
        n: st.n,
        text: word
      };
    });
  }

  global.LiuRen = {
    PALACES: P,
    castFromCounts: castFromCounts,
    castByTime: castByTime,
    phaseLines: phaseLines
  };

})(window);
