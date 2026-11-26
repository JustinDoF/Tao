/* ==========================================================
   liuyao.js — 六爻纳甲 排盘与断卦
   一、八宫归属（按变爻规则生成）
   二、纳甲装卦（干支）
   三、六亲、六神、世应
   四、动爻、变卦、伏神
   五、月建日辰、旬空、旺衰
   ========================================================== */
(function (global) {
  'use strict';

  var D = global.LiuYaoData;
  var MD = global.MeihuaData;

  /* ---------- 八卦爻象 → 键名 ---------- */
  var TRI_BY_LINES = {};
  MD.trigrams.forEach(function (t) { TRI_BY_LINES[t.lines.join('')] = t.key; });

  /* ---------- 一、八宫 ---------- */
  function flip(lines, idx) {
    var c = lines.slice();
    c[idx] = c[idx] ? 0 : 1;
    return c;
  }

  /** 由本宫卦生成一宫八卦：本宫、一世…五世、游魂、归魂 */
  function buildPalace(pureKey) {
    var t = MD.byKey[pureKey];
    var base = t.lines.concat(t.lines);
    var out = [];
    var cur = base;

    out.push({ lines: base.slice(), gen: 0 });
    for (var i = 0; i < 5; i++) {
      cur = flip(cur, i);
      out.push({ lines: cur.slice(), gen: i + 1 });
    }
    // 游魂：自五世复变第四爻
    var youhun = flip(cur, 3);
    out.push({ lines: youhun.slice(), gen: 6 });
    // 归魂：下卦复归本宫
    var guihun = t.lines.concat(youhun.slice(3));
    out.push({ lines: guihun.slice(), gen: 7 });

    return out;
  }

  /** 建立 64 卦 → {宫, 五行, 卦序} 索引 */
  function buildIndex() {
    var idx = {};
    D.palaces.forEach(function (p) {
      var list = buildPalace(p.key);
      list.forEach(function (item, gi) {
        var lowKey = TRI_BY_LINES[item.lines.slice(0, 3).join('')];
        var upKey = TRI_BY_LINES[item.lines.slice(3, 6).join('')];
        var hex = MD.hexIndex[upKey + '|' + lowKey];
        idx[hex.n] = {
          palace: p.key,
          palaceName: p.name,
          wuxing: p.wuxing,
          gen: item.gen,
          genName: D.genName[gi],
          shi: D.shiying[gi].shi,
          ying: D.shiying[gi].ying,
          lines: item.lines.slice(),
          hex: hex
        };
      });
    });
    return idx;
  }

  var IDX = buildIndex();

  /* ---------- 二、纳甲 ---------- */
  /** 六爻干支：返回 [{stem, zhi, ganZhi}] 自初爻至上爻 */
  function najia(lines) {
    var lowKey = TRI_BY_LINES[lines.slice(0, 3).join('')];
    var upKey = TRI_BY_LINES[lines.slice(3, 6).join('')];
    var lo = D.najia[lowKey], up = D.najia[upKey];
    var out = [];
    for (var i = 0; i < 3; i++) {
      out.push({ stem: lo.stems[0], zhi: lo.inner[i], ganZhi: lo.stems[0] + lo.inner[i] });
    }
    for (var j = 0; j < 3; j++) {
      out.push({ stem: up.stems[1], zhi: up.outer[j], ganZhi: up.stems[1] + up.outer[j] });
    }
    return out;
  }

  /* ---------- 三、六亲 ---------- */
  function liuqin(palaceWx, zhi) {
    var lw = D.zhiWuxing[zhi];
    if (!lw) return '?';
    if (lw === palaceWx) return '兄弟';
    if (D.sheng[lw] === palaceWx) return '父母';   // 生我者父母
    if (D.sheng[palaceWx] === lw) return '子孙';   // 我生者子孙
    if (D.ke[lw] === palaceWx) return '官鬼';      // 克我者官鬼
    if (D.ke[palaceWx] === lw) return '妻财';      // 我克者妻财
    return '?';
  }

  /* ---------- 四、六神 ---------- */
  function liushen(dayGan) {
    var start = D.liushenStart[dayGan] || '青龙';
    var s = D.liushen.indexOf(start);
    var out = [];
    for (var i = 0; i < 6; i++) out.push(D.liushen[(s + i) % 6]);
    return out;
  }

  /* ---------- 五、旬空 ---------- */
  function xunKong(dayIdx) {
    var xunStart = Math.floor(dayIdx / 10) * 10;
    var z = D.genName ? null : null;
    var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    var base = xunStart % 12;
    return [ZHI[(base + 10) % 12], ZHI[(base + 11) % 12]];
  }

  /* ---------- 六、月建 ---------- */
  function monthBranch(date) {
    var QM = global.Qimen;
    if (!QM) return null;
    var lon = QM.sunLongitude(QM.toJD(date));
    var idx = Math.floor((((lon - 315) % 360) + 360) % 360 / 30);
    var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    return ZHI[(idx + 2) % 12];
  }

  /* ---------- 七、旺衰 ---------- */
  /** 五行在某月支下的旺衰 */
  function wangShuai(wx, monthZhi) {
    if (!monthZhi) return { level: 0, label: '平', text: '' };
    var mw = D.zhiWuxing[monthZhi];
    if (wx === mw) return { level: 2, label: '旺', text: '与月建同气，当令得势' };
    if (D.sheng[mw] === wx) return { level: 2, label: '相', text: '月建生之，得气有力' };
    if (D.sheng[wx] === mw) return { level: -1, label: '休', text: '生月建而泄气，力弱' };
    if (D.ke[wx] === mw) return { level: -1, label: '囚', text: '克月建而耗力，不得势' };
    if (D.ke[mw] === wx) return { level: -2, label: '死', text: '被月建所克，最弱' };
    return { level: 0, label: '平', text: '' };
  }

  /* ---------- 八、排盘 ---------- */
  /**
   * @param states 六爻状态数组（自初爻至上爻）：
   *        { yin:0|1, moving:bool, key:'laoyin'|... }
   * @param opts   { date, yongshen }
   */
  function cast(states, opts) {
    opts = opts || {};
    var date = opts.date || new Date();

    var lines = states.map(function (s) { return s.yin ? 0 : 1; });
    var lowKey = TRI_BY_LINES[lines.slice(0, 3).join('')];
    var upKey = TRI_BY_LINES[lines.slice(3, 6).join('')];
    var ben = MD.hexIndex[upKey + '|' + lowKey];
    var meta = IDX[ben.n];

    // 干支历
    var QM = global.Qimen;
    var dayIdx = QM ? QM.dayGanzhiIndex(date) : 0;
    var dayGan = QM ? QM.gz(dayIdx).charAt(0) : '甲';
    var dayZhi = QM ? QM.gz(dayIdx).charAt(1) : '子';
    var monthZhi = monthBranch(date);
    var kong = xunKong(dayIdx);

    // 装卦
    var nj = najia(lines);
    var ls = liushen(dayGan);

    var yao = [];
    for (var i = 0; i < 6; i++) {
      var zhi = nj[i].zhi;
      yao.push({
        pos: i + 1,
        yin: lines[i],
        moving: !!states[i].moving,
        stateKey: states[i].key,
        stem: nj[i].stem,
        zhi: zhi,
        ganZhi: nj[i].ganZhi,
        wuxing: D.zhiWuxing[zhi],
        liuqin: liuqin(meta.wuxing, zhi),
        liushen: ls[i],
        shi: meta.shi === i + 1,
        ying: meta.ying === i + 1,
        kong: kong.indexOf(zhi) >= 0
      });
    }

    // 动爻与变卦
    var moving = yao.filter(function (y) { return y.moving; });
    var bian = null, bianYao = null;
    if (moving.length) {
      var bl = lines.map(function (v, i) { return states[i].moving ? (v ? 0 : 1) : v; });
      var blLow = TRI_BY_LINES[bl.slice(0, 3).join('')];
      var blUp = TRI_BY_LINES[bl.slice(3, 6).join('')];
      var bHex = MD.hexIndex[blUp + '|' + blLow];
      var bNj = najia(bl);
      bian = { hex: bHex, lines: bl, meta: IDX[bHex.n] };
      // 变爻六亲仍以本卦宫五行为准（通行法）
      bianYao = [];
      for (var m = 0; m < 6; m++) {
        bianYao.push({
          pos: m + 1,
          yin: bl[m],
          stem: bNj[m].stem,
          zhi: bNj[m].zhi,
          ganZhi: bNj[m].ganZhi,
          wuxing: D.zhiWuxing[bNj[m].zhi],
          liuqin: liuqin(meta.wuxing, bNj[m].zhi),
          changed: states[m].moving
        });
      }
      // 把变爻信息挂到本卦对应爻上
      yao.forEach(function (y, i2) {
        if (y.moving) {
          y.bianZhi = bianYao[i2].zhi;
          y.bianGanZhi = bianYao[i2].ganZhi;
          y.bianLiqin = bianYao[i2].liuqin;
        }
      });
    }

    // 伏神：本卦所缺六亲，取本宫首卦同位之爻
    var present = {};
    yao.forEach(function (y) { present[y.liuqin] = true; });
    var pure = buildPalace(meta.palace)[0];
    var pureNj = najia(pure.lines);
    var fu = [];
    D.liuqin.forEach(function (q) {
      if (present[q]) return;
      for (var p = 0; p < 6; p++) {
        // 伏神取首卦中该六亲之爻
        var qq = liuqin(meta.wuxing, pureNj[p].zhi);
        if (qq === q) {
          fu.push({
            pos: p + 1,
            liuqin: q,
            stem: pureNj[p].stem,
            zhi: pureNj[p].zhi,
            ganZhi: pureNj[p].ganZhi,
            wuxing: D.zhiWuxing[pureNj[p].zhi],
            kong: kong.indexOf(pureNj[p].zhi) >= 0
          });
          break;
        }
      }
    });
    // 挂到爻上
    fu.forEach(function (f) {
      var target = yao[f.pos - 1];
      if (target) target.fushen = f;
    });

    // 用神
    var yong = opts.yongshen || null;
    var analysis = analyze(yao, yong, monthZhi, dayZhi, kong, meta);

    return {
      date: date,
      states: states,
      lines: lines,
      ben: ben,
      meta: meta,
      yao: yao,
      moving: moving,
      bian: bian,
      bianYao: bianYao,
      fushen: fu,
      dayGanZhi: QM ? QM.gz(dayIdx) : '甲子',
      dayGan: dayGan,
      dayZhi: dayZhi,
      monthZhi: monthZhi,
      kong: kong,
      yongshen: yong,
      analysis: analysis,
      palaceText: meta.palaceName + '宫' + D.genName[meta.gen]
    };
  }

  /* ---------- 九、断卦 ---------- */
  function analyze(yao, yong, monthZhi, dayZhi, kong, meta) {
    if (!yong) return null;

    var lines = [];
    var target = yao.filter(function (y) { return y.liuqin === yong; });
    var fuTarget = null;
    if (!target.length) {
      var f = yao.filter(function (y) { return y.fushen && y.fushen.liuqin === yong; })[0];
      if (f) fuTarget = f.fushen;
    }

    var tone = { level: 0, label: '平', cls: 'luck-ji2' };

    if (!target.length && !fuTarget) {
      lines.push('卦中不见' + yong + '，本宫首卦亦无，此谓「用神不上卦」而又无伏神可取，'
        + '事多无着落，宜另择时再占。');
      return { lines: lines, tone: { level: -3, label: '无着', cls: 'luck-xiong' }, target: null, fu: null };
    }

    var t = target[0];
    var useYao = t || null;
    var isFu = false;

    // 用神两现：取动者、取临世者、取旺者
    if (target.length > 1) {
      var picked = target.filter(function (y) { return y.moving; })[0]
        || target.filter(function (y) { return y.shi; })[0]
        || target.slice().sort(function (a, b) {
          return wangShuai(b.wuxing, monthZhi).level - wangShuai(a.wuxing, monthZhi).level;
        })[0];
      lines.push('用神「' + yong + '」两现（第'
        + target.map(function (y) { return y.pos + '爻' + y.ganZhi; }).join('、')
        + '）。取' + (picked.moving ? '发动者' : (picked.shi ? '临世者' : '旺者'))
        + '为用：第' + picked.pos + '爻 ' + picked.ganZhi + '。');
      t = picked;
      useYao = picked;
    }

    if (!t && fuTarget) {
      isFu = true;
      lines.push('用神「' + yong + '」不上卦，取伏神：' + fuTarget.ganZhi + ' ' + fuTarget.wuxing
        + ' 伏于第' + fuTarget.pos + '爻之下。伏神需得日月生扶、或得飞神提拔方能出伏，'
        + '否则事在暗处，一时难见分晓。');
      useYao = {
        pos: fuTarget.pos, ganZhi: fuTarget.ganZhi, zhi: fuTarget.zhi,
        wuxing: fuTarget.wuxing, liuqin: yong, kong: fuTarget.kong,
        moving: false, liushen: '—', shi: false, ying: false
      };
    } else {
      lines.push('用神取「' + yong + '」：第' + t.pos + '爻 ' + t.ganZhi + ' ' + t.wuxing
        + (t.moving ? '，发动' : '，安静')
        + (t.shi ? '，且持世' : '')
        + (t.ying ? '，居应位' : '') + '。');
    }

    // 旺衰
    var ws = wangShuai(useYao.wuxing, monthZhi);
    var score = ws.level;
    var mw = D.zhiWuxing[monthZhi] || '';
    if (ws.text) {
      lines.push('月建' + monthZhi + '（' + mw + '）：用神' + useYao.wuxing + '，' + ws.label
        + '，' + ws.text + '。');
    }

    // 日辰
    var dw = D.zhiWuxing[dayZhi] || '';
    var dayRel = '平';
    if (dw === useYao.wuxing) { dayRel = '临日建，有气'; score += 1; }
    else if (D.sheng[dw] === useYao.wuxing) { dayRel = '日辰生之，得力'; score += 1; }
    else if (D.ke[dw] === useYao.wuxing) { dayRel = '日辰克之，受制'; score -= 1; }
    else if (D.sheng[useYao.wuxing] === dw) { dayRel = '泄气于日辰，力减'; score -= 1; }
    lines.push('日辰' + dayZhi + '（' + dw + '）：' + dayRel + '。');

    // 空亡
    if (useYao.kong) {
      lines.push('用神' + useYao.zhi + '逢旬空（' + kong.join('、') + '空）。'
        + '空则事虚，动而空者待冲实，静而空者待填实，眼下多不落实。');
      score -= 2;
    }

    // 动爻生克用神
    var yaoList = yao.filter(function (y) { return y.moving && y.liuqin !== yong; });
    if (yaoList.length) {
      var rels = [];
      yaoList.forEach(function (y) {
        if (D.sheng[y.wuxing] === useYao.wuxing) { rels.push(y.liuqin + '（' + y.ganZhi + '）生用神，有助'); score += 1; }
        else if (D.ke[y.wuxing] === useYao.wuxing) { rels.push(y.liuqin + '（' + y.ganZhi + '）克用神，为忌'); score -= 1; }
        else if (D.sheng[useYao.wuxing] === y.wuxing) { rels.push(y.liuqin + '（' + y.ganZhi + '）泄用神之气'); score -= 1; }
        else if (D.ke[useYao.wuxing] === y.wuxing) { rels.push(y.liuqin + '（' + y.ganZhi + '）为用神所克'); }
      });
      if (rels.length) lines.push('动爻作用：' + rels.join('；') + '。');
    } else if (yao.some(function (y) { return y.moving; })) {
      lines.push('动爻即用神本身，事在自身主动，宜自决而不宜等人。');
    }

    // 世应
    if (useYao.shi) lines.push('用神持世，事在己手，主动权在我。');
    else if (useYao.ying) lines.push('用神居应，事在对方，须看他人之意。');

    // 结论
    var label, cls;
    if (score >= 3) { label = '大吉'; cls = 'luck-ji'; }
    else if (score >= 1) { label = '吉'; cls = 'luck-ji2'; }
    else if (score === 0) { label = '平'; cls = 'luck-ji2'; }
    else if (score >= -2) { label = '小凶'; cls = 'luck-xiong'; }
    else { label = '凶'; cls = 'luck-xiong'; }

    var concl;
    if (score >= 3) concl = '用神旺相得助，所求可成，时机已近，宜着手去办。';
    else if (score >= 1) concl = '用神有气，事可为，然须借力而行，不宜独断。';
    else if (score === 0) concl = '用神平平，成败在人，守正待时为宜。';
    else if (score >= -2) concl = '用神力弱受制，事多阻，宜缓图，先固根本。';
    else concl = '用神衰绝，事难成，宜止宜改图，强求反损。';
    if (isFu) concl += '（伏神未出，尤须待时。）';

    lines.push('总断：' + concl);

    return {
      lines: lines, tone: { level: score, label: label, cls: cls },
      target: t, fu: fuTarget, isFu: isFu, score: score, wangshuai: ws
    };
  }

  /* ---------- 摇卦 ---------- */
  /** 单爻摇卦：三枚铜钱 */
  function toss() {
    var coins = 0;
    for (var i = 0; i < 3; i++) if (Math.random() < 0.5) coins++;
    // coins: 背面数。3背=老阳(重)，2背=少阴(拆)，1背=少阳(单)，0背=老阴(交)
    var key = coins === 3 ? 'laoyang' : coins === 2 ? 'shaoyin' : coins === 1 ? 'shaoyang' : 'laoyin';
    var st = D.yaoStates.filter(function (s) { return s.key === key; })[0];
    return {
      key: st.key, name: st.name, mark: st.mark, coins: coins,
      yin: st.yin, moving: st.moving, note: st.note
    };
  }

  global.LiuYao = {
    cast: cast,
    toss: toss,
    najia: najia,
    liuqin: liuqin,
    liushen: liushen,
    xunKong: xunKong,
    monthBranch: monthBranch,
    wangShuai: wangShuai,
    buildPalace: buildPalace,
    index: IDX
  };

})(window);
