/* ==========================================================
   app.js — 界面与交互
   ========================================================== */
(function () {
  'use strict';

  var P = window.LiuRenData.palaces;
  var META = window.LiuRenData.phaseMeta;
  var L = window.Lunar;
  var R = window.LiuRen;
  var MH = window.Meihua;
  var MHD = window.MeihuaData;
  var QM = window.Qimen;
  var QMD = window.QimenData;
  var BAI = window.MeihuaBai || {};
  var GL = window.Glossary;
  var CP = window.Compass;
  var LY = window.LiuYao;
  var LYD = window.LiuYaoData;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var STORE = 'daoshu.v1';

  var S = {
    page: 'cast',
    art: 'liuren',           // 当前术法：liuren | meihua
    method: 'time',
    mhMethod: 'time',        // 梅花起卦方式：time | num | rand
    mhNums: ['', ''],
    mhManual: false,
    mhManualVals: null,
    manual: false,
    nums: ['', '', ''],
    question: '',
    manualVals: null,
    result: null,
    mhResult: null,
    lyStates: [],
    lyYong: null,
    lyResult: null,
    basis: '',
    ts: 0,
    history: [],
    settings: { lateZi: true, sound: true, haptic: true }
  };

  /* ---------------- 存储 ---------------- */
  function loadStore() {
    try {
      var raw = localStorage.getItem(STORE);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (Array.isArray(d.history)) S.history = d.history;
      if (d.settings) S.settings = Object.assign(S.settings, d.settings);
      if (d.art === 'liuren' || d.art === 'meihua' || d.art === 'qimen' || d.art === 'liuyao') S.art = d.art;
    } catch (e) { /* 忽略 */ }
  }
  function saveStore() {
    try {
      localStorage.setItem(STORE, JSON.stringify({ history: S.history, settings: S.settings, art: S.art }));
    } catch (e) { /* 忽略 */ }
  }

  /* ---------------- 术语查询 ---------------- */
  function termChip(name) {
    if (!GL.get(name)) return '<span class="term-plain">' + esc(name) + '</span>';
    return '<button class="term" data-term="' + esc(name) + '">' + esc(name) + '<i>?</i></button>';
  }

  /** 从一段文本里找出用到的术语，列成可点的区域 */
  function termsSectionHTML(text) {
    var found = GL.findTerms(text);
    if (!found.length) return '';
    return '<div class="section-title">术 语 释 义</div>'
      + '<div class="card"><p class="hint" style="margin-bottom:10px">点下方术语即看白话解释</p>'
      + '<div class="term-wrap">'
      + found.map(function (t) { return termChip(t); }).join('')
      + '<button class="term all" id="openGlossary">全部术语 ›</button>'
      + '</div></div>';
  }

  function openTerm(name) {
    var t = GL.get(name);
    if (!t) return;
    var cat = GL.cats.filter(function (c) { return c.key === t.cat; })[0];
    openSheet('术语', cat ? cat.name : '',
      '<div class="term-detail">'
      + '<div class="td-name">' + esc(name) + '</div>'
      + '<p class="td-plain">' + esc(t.plain) + '</p>'
      + '<p class="td-detail">' + esc(t.detail) + '</p>'
      + '</div>'
      + '<button class="mini-btn" style="margin-top:18px" id="tdClose">知道了</button>');
    var b = $('#tdClose');
    if (b) b.onclick = closeSheet;
  }

  function openGlossary() {
    var html = '<h3>术 语 词 典</h3><p class="sheet-sub">共 ' + Object.keys(GL.terms).length + ' 条</p>';
    GL.cats.forEach(function (c) {
      var list = Object.keys(GL.terms).filter(function (k) { return GL.terms[k].cat === c.key; });
      if (!list.length) return;
      html += '<div class="gl-cat">' + c.name + '</div>';
      list.forEach(function (k) {
        var t = GL.terms[k];
        html += '<div class="gl-item" data-term="' + esc(k) + '">'
          + '<div class="gl-name">' + esc(k) + '</div>'
          + '<div class="gl-plain">' + esc(t.plain) + '</div>'
          + '</div>';
      });
    });
    openSheet(null, null, html);
    var sheet = $('#sheet');
    sheet.querySelectorAll('.gl-item').forEach(function (el) {
      el.onclick = function () { openTerm(el.getAttribute('data-term')); };
    });
  }

  /* ---------------- 工具 ---------------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtDate(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function toast(msg) {
    var t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(t._tm);
    t._tm = setTimeout(function () { t.classList.remove('on'); }, 1800);
  }

  var ac = null;
  function tick(freq) {
    if (!S.settings.sound) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      ac = ac || new Ctx();
      if (ac.state === 'suspended') ac.resume();
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = 'triangle';
      o.frequency.value = freq || 720;
      var t = ac.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + 0.09);
    } catch (e) { /* 忽略 */ }
  }
  function buzz(ms) {
    if (!S.settings.haptic) return;
    if (navigator.vibrate) { try { navigator.vibrate(ms || 12); } catch (e) {} }
  }

  /* ---------------- 顶栏副标题 ---------------- */
  function setSubtitle(txt) { $('#subtitle').textContent = txt || '道家掌诀 · 小六壬'; }

  /* ==========================================================
     演算页
     ========================================================== */
  function castPageHTML() {
    var t = L.fromDate(new Date(), S.settings);
    return ''
      + '<div class="segment" id="segMethod">'
      + '  <button data-m="time" class="on">时间起课</button>'
      + '  <button data-m="num">报数起课</button>'
      + '  <button data-m="rand">随机起课</button>'
      + '</div>'
      + '<div id="methodBox"></div>'
      + '<div id="resultBox"></div>';
  }

  function timePanelHTML() {
    return ''
      + '<div class="card gold-line">'
      + '  <div class="now-block">'
      + '    <div class="now-lunar" id="lunarBig">—</div>'
      + '    <div class="now-solar" id="solarLine">—</div>'
      + '    <div class="now-shichen" id="shichenTip">—</div>'
      + '  </div>'
      + '  <div class="mini-row">'
      + '    <button class="mini-btn on" id="btnNow">用此刻</button>'
      + '    <button class="mini-btn" id="btnManual">另择时刻</button>'
      + '  </div>'
      + '  <div id="manualBox"></div>'
      + '</div>'
      + '<input class="q-input" id="qInput" maxlength="40" placeholder="所问何事（可略，如：明日面谈可否成事）">'
      + '<button class="cast-btn" id="castBtn">起　课</button>';
  }

  function manualHTML() {
    var v = S.manualVals || (function () {
      var t = L.fromDate(new Date(), S.settings);
      return { month: t.month, day: t.day, hour: t.hour, solar: t.solar };
    })();
    var mOpts = '', dOpts = '', hOpts = '';
    for (var i = 1; i <= 12; i++) mOpts += '<option value="' + i + '"' + (i === v.month ? ' selected' : '') + '>' + L.monthName(i, false) + '</option>';
    for (var j = 1; j <= 30; j++) dOpts += '<option value="' + j + '"' + (j === v.day ? ' selected' : '') + '>' + L.dayName(j) + '</option>';
    for (var k = 1; k <= 12; k++) hOpts += '<option value="' + k + '"' + (k === v.hour ? ' selected' : '') + '>' + L.SHICHEN[k - 1] + '时</option>';

    var dv = v.solar ? (v.solar.y + '-' + pad(v.solar.m) + '-' + pad(v.solar.d) + 'T' + pad(v.solar.h) + ':' + pad(v.solar.mi)) : '';

    return ''
      + '<div class="manual">'
      + '  <div class="field"><label>公历时刻（自动换算农历）</label>'
      + '    <input type="datetime-local" id="dtInput" value="' + dv + '">'
      + '  </div>'
      + '  <div class="three">'
      + '    <div class="field"><label>农历月</label><select id="selM">' + mOpts + '</select></div>'
      + '    <div class="field"><label>农历日</label><select id="selD">' + dOpts + '</select></div>'
      + '    <div class="field"><label>时辰</label><select id="selH">' + hOpts + '</select></div>'
      + '  </div>'
      + '  <p class="hint" id="hRange" style="margin-top:-2px"></p>'
      + '  <p class="hint">可直接改农历三项，即以<b>所报之数</b>起课；亦可用公历时刻倒推，适合以事发之时起课。</p>'
      + '</div>';
  }

  function numPanelHTML() {
    return ''
      + '<div class="card gold-line">'
      + '  <div class="num-grid">'
      + '    <div class="num-cell"><span>一 数</span><input id="n0" inputmode="numeric" maxlength="3" placeholder="—" value="' + esc(S.nums[0]) + '"></div>'
      + '    <div class="num-cell"><span>二 数</span><input id="n1" inputmode="numeric" maxlength="3" placeholder="—" value="' + esc(S.nums[1]) + '"></div>'
      + '    <div class="num-cell"><span>三 数</span><input id="n2" inputmode="numeric" maxlength="3" placeholder="—" value="' + esc(S.nums[2]) + '"></div>'
      + '  </div>'
      + '  <p class="hint" style="margin-top:12px">心中默念所问之事，随口报数：一数落<b>天时</b>，二数落<b>地利</b>，三数落<b>人和</b>。只报一数则直断，报两数则首尾并参；留空视为「一」，故三数皆空即落大安。</p>'
      + '</div>'
      + '<input class="q-input" id="qInput" maxlength="40" placeholder="所问何事（可略）">'
      + '<button class="cast-btn" id="castBtn">起　课</button>';
  }

  function randPanelHTML() {
    return ''
      + '<div class="card gold-line">'
      + '  <p class="hint">不必报数。凝神静气，将所问之事默念三遍，按下起课，天机自显。<br>随机取三数落三宫，与报数起课同法。</p>'
      + '  <p class="hint" style="margin-top:10px;color:#6f7576">一卦只问一事，一事不可重问。心诚则灵，疑则勿卜。</p>'
      + '</div>'
      + '<input class="q-input" id="qInput" maxlength="40" placeholder="所问何事（可略）">'
      + '<button class="cast-btn" id="castBtn">起　课</button>';
  }

  function renderMethodPanel() {
    var box = $('#methodBox');
    if (!box) return;
    if (S.method === 'time') box.innerHTML = timePanelHTML();
    else if (S.method === 'num') box.innerHTML = numPanelHTML();
    else box.innerHTML = randPanelHTML();

    var q = $('#qInput');
    if (q) { q.value = S.question; }

    if (S.method === 'time') {
      updateTimeDisplay();
      if (S.manual) showManual();
      $('#btnNow').onclick = function () {
        S.manual = false;
        S.manualVals = null;
        $$('.mini-btn').forEach(function (b) { b.classList.toggle('on', b.id === 'btnNow'); });
        $('#manualBox').innerHTML = '';
        updateTimeDisplay();
      };
      $('#btnManual').onclick = function () { S.manual = true; showManual(); };
    }
    if (S.method === 'num') {
      ['n0', 'n1', 'n2'].forEach(function (id, idx) {
        var el = $('#' + id);
        if (!el) return;
        el.oninput = function () {
          var v = this.value.replace(/[^\d]/g, '').slice(0, 3);
          if (v !== this.value) this.value = v;
          S.nums[idx] = v;
        };
        el.onfocus = function () { this.select && this.select(); };
      });
    }

    if ($('#castBtn')) $('#castBtn').onclick = doCast;
  }

  function showManual() {
    var box = $('#manualBox');
    box.innerHTML = manualHTML();
    $$('.mini-btn').forEach(function (b) { b.classList.toggle('on', b.id === 'btnManual'); });
    var v = S.manualVals || (function () {
      var t = L.fromDate(new Date(), S.settings);
      return { month: t.month, day: t.day, hour: t.hour, solar: t.solar };
    })();
    $('#selM').value = v.month; $('#selD').value = v.day; $('#selH').value = v.hour;

    function sync() {
      S.manualVals = {
        month: +$('#selM').value,
        day: +$('#selD').value,
        hour: +$('#selH').value,
        solar: null
      };
      var hr = $('#hRange');
      if (hr) hr.textContent = '此时段：' + L.SHICHEN_RANGE[S.manualVals.hour - 1];
      updateTimeDisplay();
    }
    $('#selM').onchange = sync; $('#selD').onchange = sync; $('#selH').onchange = sync;
    var hr0 = $('#hRange');
    if (hr0) hr0.textContent = '此时段：' + L.SHICHEN_RANGE[v.hour - 1];

    $('#dtInput').onchange = function () {
      var val = this.value;
      if (!val) return;
      var parts = val.split('T');
      var dpart = parts[0].split('-').map(Number);
      var tpart = (parts[1] || '00:00').split(':').map(Number);
      var d = new Date(dpart[0], dpart[1] - 1, dpart[2], tpart[0], tpart[1]);
      var info = L.fromDate(d, S.settings);
      if (!info) { toast('日期超出可换算范围'); return; }
      S.manualVals = { month: info.month, day: info.day, hour: info.hour, solar: info.solar };
      $('#selM').value = info.month; $('#selD').value = info.day; $('#selH').value = info.hour;
      var hr = $('#hRange');
      if (hr) hr.textContent = '此时段：' + L.SHICHEN_RANGE[info.hour - 1];
      updateTimeDisplay();
    };
    updateTimeDisplay();
  }

  function updateTimeDisplay() {
    if (S.page !== 'cast' || S.method !== 'time') return;
    var big = $('#lunarBig'), solar = $('#solarLine'), tip = $('#shichenTip');
    if (!big) return;

    if (S.manual && S.manualVals) {
      var v = S.manualVals;
      big.innerHTML = esc(L.monthName(v.month, false) + L.dayName(v.day)) + '<small> ' + L.SHICHEN[v.hour - 1] + '时</small>';
      solar.textContent = v.solar
        ? (v.solar.y + '年' + v.solar.m + '月' + v.solar.d + '日 ' + pad(v.solar.h) + ':' + pad(v.solar.mi) + ' · 公历')
        : '手动选定 · 以农历月日时起课';
      tip.textContent = L.SHICHEN[v.hour - 1] + '时 ' + L.SHICHEN_RANGE[v.hour - 1] + ' · 月' + v.month + ' 日' + v.day + ' 时' + v.hour;
      return;
    }

    var t = L.fromDate(new Date(), S.settings);
    if (!t) { big.textContent = '—'; return; }
    big.innerHTML = esc(t.ganzhi + '年 ' + t.monthName + t.dayName) + '<small> ' + t.shichen + '时</small>';
    solar.textContent = t.solar.y + '年' + t.solar.m + '月' + t.solar.d + '日 ' + pad(t.solar.h) + ':' + pad(t.solar.mi) + ' · 公历';
    tip.textContent = t.shichen + '时 ' + t.shichenRange + ' · 月' + t.month + ' 日' + t.day + ' 时' + t.hour + (t.shifted ? ' · 晚子时计次日' : '');
  }

  /* ---------------- 起课 ---------------- */
  function doCast() {
    var q = $('#qInput');
    S.question = q ? q.value.trim() : '';

    var counts, basis, modeNice;
    var now = new Date();

    if (S.method === 'time') {
      var info;
      if (S.manual && S.manualVals) {
        counts = [S.manualVals.month, S.manualVals.day, S.manualVals.hour];
        var v = S.manualVals;
        basis = (v.solar
          ? (v.solar.y + '年' + v.solar.m + '月' + v.solar.d + '日 ' + pad(v.solar.h) + ':' + pad(v.solar.mi) + ' · ')
          : '') + '农历' + L.monthName(v.month, false) + L.dayName(v.day) + ' ' + L.SHICHEN[v.hour - 1] + '时 · 月' + v.month + ' 日' + v.day + ' 时' + v.hour;
      } else {
        info = L.fromDate(now, S.settings);
        if (!info) { toast('时间换算失败'); return; }
        counts = [info.month, info.day, info.hour];
        basis = info.solar.y + '年' + info.solar.m + '月' + info.solar.d + '日 ' + pad(info.solar.h) + ':' + pad(info.solar.mi)
          + ' · ' + info.ganzhi + '年' + info.monthName + info.dayName + ' ' + info.shichen + '时'
          + ' · 月' + info.month + ' 日' + info.day + ' 时' + info.hour
          + (info.shifted ? ' · 晚子时计次日' : '');
      }
      modeNice = '时间起课';
    } else if (S.method === 'num') {
      var arr = S.nums.map(function (x) { return String(x).trim(); }).filter(function (x) { return x !== ''; })
        .map(function (x) { var n = parseInt(x, 10); return isFinite(n) && n > 0 ? n : 1; });
      if (!arr.length) arr = [1];
      counts = arr.slice(0, 3);
      basis = '报数 ' + counts.join(' · ') + ' · 一数天时，二数地利，三数人和';
      modeNice = '报数起课';
    } else {
      counts = [rnd(99), rnd(99), rnd(99)];
      basis = '随机得数 ' + counts.join(' · ');
      modeNice = '随机起课';
    }

    var res = R.castFromCounts(counts);
    S.result = res;
    S.basis = basis;
    S.ts = now.getTime();

    // 记入课录
    S.history.unshift({
      id: String(S.ts) + Math.random().toString(36).slice(2, 6),
      art: 'liuren',
      ts: S.ts,
      q: S.question,
      mode: modeNice,
      basis: basis,
      counts: counts
    });
    if (S.history.length > 60) S.history.length = 60;
    saveStore();
    if (S.page === 'history') { /* 稍后切页刷新 */ }

    drawRingAndAnimate(res, function () {
      var box = $('#resultBox');
      box.innerHTML = resultHTML(res, basis, S.question);
      bindResultActions(res);
      setTimeout(function () {
        var y = box.getBoundingClientRect().top + window.scrollY - 74;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }, 60);
    });
  }

  function rnd(max) { return Math.floor(Math.random() * max) + 1; }

  /* ---------------- 掌诀环 ---------------- */
  // o: { marks: {pos: '12'}, main: 主宫索引, center: 主宫对象 }
  function ringSVG(o) {
    o = o || {};
    var marks = o.marks || {};
    var R0 = 98, cx = 150, cy = 150, BR = 30; // BR: 徽标沿半径外移距离
    var nodes = '';
    for (var i = 0; i < 6; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 3;
      var x = cx + R0 * Math.cos(a), y = cy + R0 * Math.sin(a);
      var bx = cx + (R0 + BR) * Math.cos(a), by = cy + (R0 + BR) * Math.sin(a);
      var label = marks[i] || '';
      var bw = label.length > 1 ? 9 + label.length * 5.6 : 17; // 胶囊宽
      nodes += '<g class="node' + (o.main === i ? ' final' : '') + '" data-i="' + i + '" data-pos="' + i + '">'
        + '<circle class="pulse" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="26"/>'
        + '<circle class="c-bg" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="26"/>'
        + '<text class="n" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '">' + P[i].name + '</text>'
        + '<g class="badge" opacity="' + (label ? '1' : '0') + '">'
        + '<rect class="badge-bg" x="' + (bx - bw / 2).toFixed(1) + '" y="' + (by - 8.5).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="17" rx="8.5"/>'
        + '<text class="badge-tx" x="' + bx.toFixed(1) + '" y="' + (by + 0.4).toFixed(1) + '"'
        + (label.length > 1 ? ' style="font-size:8.6px;letter-spacing:.6px"' : '') + '>' + label + '</text></g>'
        + '</g>';
    }
    var center = o.center
      ? '<g class="center">'
        + '<text class="center-sub" x="150" y="128">' + o.center.hint + '</text>'
        + '<text class="center-name" x="150" y="158">' + o.center.name + '</text>'
        + '<text class="center-luck" x="150" y="180">' + o.center.luck.label + '</text>'
        + '</g>'
      : '<g class="center">'
        + '<text class="center-sub" x="150" y="128">掌 诀</text>'
        + '<text class="center-name" x="150" y="158">六宫</text>'
        + '<text class="center-luck" x="150" y="180">顺 行</text>'
        + '</g>';

    return '<svg viewBox="0 0 300 300" aria-label="六宫掌诀">'
      + '<circle class="ring-line" cx="150" cy="150" r="' + R0 + '"/>'
      + '<circle cx="150" cy="150" r="56" fill="none" stroke="rgba(201,169,97,.12)"/>'
      + center
      + nodes
      + '</svg>';
  }

  // 由起课结果反推每一宫被踩中的标号（1/2/3）
  function marksByPos(res) {
    var out = {};
    var cur = -1;
    res.stops.forEach(function (st, idx) {
      if (st.n > 1) cur += st.n - 1;
      var pos = cur < 0 ? 0 : res.hops[cur].pos;
      out[pos] = out[pos] ? out[pos] + '·' + String(idx + 1) : String(idx + 1);
    });
    return out;
  }

  function drawRingAndAnimate(res, done) {
    var box = $('#resultBox');
    box.innerHTML = '<div class="result"><div class="ring-wrap" id="ring">' + ringSVG() + '</div>'
      + '<p class="hint" style="text-align:center;margin-top:6px" id="ringTip">掐指……</p></div>';

    var nodes = $$('#ring .node');
    var marks = [];
    var cur = -1;
    res.stops.forEach(function (st, idx) {
      if (st.n > 1) cur += st.n - 1;
      marks.push({ at: cur, phase: idx + 1, pos: st.pos });
    });

    // 同一落点多次停靠时合并徽标
    var merged = {};
    marks.forEach(function (m) {
      var k = String(m.at);
      merged[k] = merged[k] ? merged[k] + String(m.phase) : String(m.phase);
    });

    var hops = res.hops;
    var total = hops.length;
    var interval = total ? Math.max(42, Math.min(150, 1150 / total)) : 0;

    var tip = $('#ringTip');
    // 相位名按「本课报了几数」而定，避免取不到名字
    var phaseName;
    if (res.counts.length === 3) phaseName = { 0: '月数', 1: '日数', 2: '时数' };
    else if (res.counts.length === 2) phaseName = { 0: '首数', 2: '末数' };
    else phaseName = { 2: '所报之数' };

    // 起始即落大安（首数为 1）时，先把徽标补上
    if (merged['-1']) applyBadge(nodes[0], merged['-1']);

    var i = 0;
    function step() {
      if (i > 0) {
        var prev = nodes[hops[i - 1].pos];
        prev.classList.remove('hop');
      }
      if (i >= hops.length) { finish(); return; }

      var h = hops[i];
      var nd = nodes[h.pos];
      nd.classList.add('hop');
      tick(560 + (h.pos % 6) * 46);
      buzz(9);

      if (merged[String(i)]) applyBadge(nd, merged[String(i)]);

      if (tip) {
        tip.textContent = '拇指循宫 · ' + (phaseName[h.phase] || '') + ' 第 ' + (i + 1) + ' 转';
      }
      i++;
      setTimeout(step, interval);
    }
    function applyBadge(nd, txt) {
      var b = nd.querySelector('.badge');
      b.querySelector('.badge-tx').textContent = txt;
      b.setAttribute('opacity', '1');
    }
    function finish() {
      if (hops.length) nodes[hops[hops.length - 1].pos].classList.remove('hop');
      // 首步为 1 时，起点即大安
      if (!hops.length && merged['-1']) applyBadge(nodes[0], merged['-1']);

      var mainNode = nodes[res.mainIndex];
      nodes.forEach(function (n) { n.classList.remove('hop'); });
      mainNode.classList.add('final');

      var c = $('#ring .center');
      if (c) {
        c.querySelector('.center-name').textContent = res.main.name;
        c.querySelector('.center-luck').textContent = res.main.luck.label;
        c.querySelector('.center-sub').textContent = res.main.hint;
      }
      if (tip) tip.textContent = '落宫 · ' + res.main.name + '（' + res.main.luck.label + '）';
      tick(1180); buzz(26);
      setTimeout(function () { setSubtitle('小六壬 · ' + res.main.name); }, 120);
      done && done();
    }

    if (!total) setTimeout(finish, 80); else setTimeout(step, 160);
  }

  /* ---------------- 结果渲染 ---------------- */
  function resultHTML(res, basis, question) {
    var m = res.main;
    var lines = R.phaseLines(res.stops);

    var steps = lines.map(function (ln) {
      return '<div class="step' + (ln.palace.key === m.key && ln.label === '人和' ? ' is-final' : '') + '">'
        + '<div class="s-label">' + ln.label + '</div>'
        + '<div class="s-palace">' + ln.palace.name + '</div>'
        + '<div class="s-count">' + ln.desc.split(' · ')[0] + ' · ' + ln.palace.luck.label + '</div>'
        + '<div class="s-count" style="opacity:.7">数 ' + ln.n + '</div>'
        + '</div>';
    }).join('');

    var phaseItems = lines.map(function (ln) {
      return '<div class="item"><div class="k">' + ln.label + '</div>'
        + '<div class="v"><span style="color:var(--gold-hi)">' + ln.palace.name + '</span>'
        + '（' + ln.palace.luck.label + '·属' + ln.palace.wuxing + '）——' + esc(ln.text) + '。</div></div>';
    }).join('');

    var itemRows = Object.keys(m.items).map(function (k) {
      return '<div class="item"><div class="k">' + k + '</div><div class="v">' + esc(m.items[k]) + '</div></div>';
    }).join('');

    var luckCls = m.luck.cls;

    return ''
      + '<div class="result">'
      + '  <div class="ring-wrap">' + ringSVG({ marks: marksByPos(res), main: res.mainIndex, center: m }) + '</div>'

      + '  <div class="card gold-line" style="margin-top:16px">'
      + '    <div class="palace-name-row">'
      + '      <h2>' + m.name + '</h2>'
      + '      <span class="py">' + m.py + '</span>'
      + '      <span class="luck-tag ' + luckCls + '" style="margin-left:auto">' + m.luck.label + '</span>'
      + '    </div>'
      + '    <p class="palace-hint">主宫 · ' + m.hint + ' · 属' + m.wuxing + '</p>'
      + '    <div class="chips">'
      + '      <span class="chip">五行 <b>' + m.wuxing + '</b></span>'
      + '      <span class="chip">六神 <b>' + m.god + '</b></span>'
      + '      <span class="chip">方位 <b>' + m.dir + '</b></span>'
      + '      <span class="chip">色 <b>' + m.color + '</b></span>'
      + '      <span class="chip">数 <b>' + m.nums + '</b></span>'
      + '    </div>'
      + '    <p class="meaning" style="margin-top:14px">' + esc(m.meaning) + '</p>'
      + '  </div>'

      + '  <div class="verse-card">'
      + '    <div class="v-label">六 宫 断 辞</div>'
      + '    <div class="v-text">' + esc(m.verse) + '</div>'
      + '    <div class="verse-seal">小<br>六壬</div>'
      + '  </div>'

      + '  <div class="section-title">三 宫 起 承</div>'
      + '  <div class="steps">' + steps + '</div>'
      + '  <div class="items" style="margin-top:10px">' + phaseItems + '</div>'

      + '  <div class="section-title">分 类 断 语</div>'
      + '  <div class="items">' + itemRows + '</div>'

      + '  <div class="section-title">总 断</div>'
      + '  <div class="card">'
      + '    <p class="meaning">' + esc(res.verdict.head + res.verdict.body) + '</p>'
      + '    <p class="meaning" style="margin-top:10px;color:var(--gold)">' + esc(res.verdict.advice) + '</p>'
      + '    <p class="basis" style="margin-top:12px">' + esc(res.yingqi) + '</p>'
      + '  </div>'

      + lrBaiHTML(res)

      + termsSectionHTML('天时 地利 人和 应期 ' + m.god + ' 五行 相生 相克 ' + m.name)

      + '  <div class="basis">'
      + '    <b>起课依据</b>　' + esc(basis) + '<br>'
      + '    <b>落宫次序</b>　' + res.stops.map(function (s) { return s.palace.name + '(' + s.n + ')'; }).join(' → ')
      + '　共 ' + res.total + ' 转<br>'
      + '    <b>所问</b>　' + (question ? esc(question) : '未填') + '<br>'
      + '    <b>记时</b>　' + fmtDate(S.ts)
      + '  </div>'

      + '  <div class="row-actions">'
      + '    <button id="actCopy">复制此课</button>'
      + '    <button id="actAgain">再起一课</button>'
      + '  </div>'
      + '</div>';
  }

  function bindResultActions(res) {
    var c = $('#actCopy');
    if (c) c.onclick = function () {
      var txt = '【小六壬】' + (S.question ? S.question + '\n' : '')
        + res.stops.map(function (s) { return s.meta.label + '：' + s.palace.name; }).join('\n')
        + '\n主宫：' + res.main.name + '（' + res.main.luck.label + '）'
        + '\n' + res.main.verse.replace(/\n/g, '')
        + '\n' + res.verdict.head + res.verdict.body
        + '\n—— 掐指神通 · ' + S.basis;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () { toast('已复制课式'); }, function () { fallbackCopy(txt); });
      } else fallbackCopy(txt);
    };
    var a = $('#actAgain');
    if (a) a.onclick = function () {
      S.result = null;
      S.question = '';
      var q = $('#qInput');
      if (q) q.value = '';
      $('#resultBox').innerHTML = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (S.method === 'rand') setTimeout(doCast, 420);
      else if (S.method === 'num') { S.nums = ['', '', '']; renderMethodPanel(); }
      else updateTimeDisplay();
    };
  }

  function fallbackCopy(txt) {
    var ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('已复制课式'); } catch (e) { toast('复制失败'); }
    document.body.removeChild(ta);
  }

  /* ==========================================================
     课录页
     ========================================================== */
  function historyPageHTML() {
    if (!S.history.length) {
      return '<div class="empty"><div class="glyph">空</div><p>尚无课录。<br>起一课后，此处自留痕迹。</p></div>';
    }
    var list = S.history.map(function (h) {
      if (h.art === 'meihua') {
        var m = h.mh || {};
        var rr = m.a
          ? MH.castByNumbers(m.a, m.b)
          : MH.castByTime(m.zhi || 1, m.month || 1, m.day || 1, m.shichen || 1);
        return '<div class="rec" data-id="' + h.id + '">'
          + '<div class="rec-seal mh">' + rr.ben.short + '</div>'
          + '<div class="rec-body">'
          + '  <div class="rec-q">' + (h.q ? esc(h.q) : '<span style="color:#6f7676">未记所问</span>') + '</div>'
          + '  <div class="rec-meta">' + fmtDate(h.ts) + ' · 梅花 · ' + h.mode + ' · ' + rr.verdict.tone.label + '</div>'
          + '</div>'
          + '<div class="rec-arrow">›</div>'
          + '</div>';
      }
      if (h.art === 'qimen') {
        var qr = QM.cast(new Date(h.qmTime || h.ts));
        return '<div class="rec" data-id="' + h.id + '">'
          + '<div class="rec-seal qm">局</div>'
          + '<div class="rec-body">'
          + '  <div class="rec-q">' + (h.q ? esc(h.q) : '<span style="color:#6f7676">未记所问</span>') + '</div>'
          + '  <div class="rec-meta">' + fmtDate(h.ts) + ' · 奇门 · ' + qr.juText + ' · 值符' + qr.zhiFuStar + '</div>'
          + '</div>'
          + '<div class="rec-arrow">›</div>'
          + '</div>';
      }
      if (h.art === 'liuyao') {
        var lr = LY.cast((h.ly || []).map(function (k) {
          return LYD.yaoStates.filter(function (s) { return s.key === k; })[0] || LYD.yaoStates[2];
        }), { date: new Date(h.ts), yongshen: h.lyYong });
        return '<div class="rec" data-id="' + h.id + '">'
          + '<div class="rec-seal ly">' + lr.ben.short + '</div>'
          + '<div class="rec-body">'
          + '  <div class="rec-q">' + (h.q ? esc(h.q) : '<span style="color:#6f7676">未记所问</span>') + '</div>'
          + '  <div class="rec-meta">' + fmtDate(h.ts) + ' · 六爻 · ' + lr.palaceText
          + (lr.moving.length ? ' · 动' + lr.moving.length : ' · 静') + '</div>'
          + '</div>'
          + '<div class="rec-arrow">›</div>'
          + '</div>';
      }
      var r = R.castFromCounts(h.counts);
      return '<div class="rec" data-id="' + h.id + '">'
        + '<div class="rec-seal">' + r.main.name + '</div>'
        + '<div class="rec-body">'
        + '  <div class="rec-q">' + (h.q ? esc(h.q) : '<span style="color:#6f7676">未记所问</span>') + '</div>'
        + '  <div class="rec-meta">' + fmtDate(h.ts) + ' · ' + h.mode + ' · ' + r.main.luck.label + '</div>'
        + '</div>'
        + '<div class="rec-arrow">›</div>'
        + '</div>';
    }).join('');

    return '<div class="section-title">共 ' + S.history.length + ' 课</div>'
      + list
      + '<p class="foot-note">课录仅存于本机，不上传、不联网。</p>';
  }

  function openRecord(id) {
    var h = S.history.filter(function (x) { return x.id === id; })[0];
    if (!h) return;
    S.ts = h.ts;
    var body;
    if (h.art === 'meihua') {
      var m = h.mh || {};
      var rr = m.a
        ? MH.castByNumbers(m.a, m.b)
        : MH.castByTime(m.zhi || 1, m.month || 1, m.day || 1, m.shichen || 1);
      body = mhResultHTML(rr, h.basis, h.q);
    } else if (h.art === 'qimen') {
      var qres = QM.cast(new Date(h.qmTime || h.ts));
      lastQmRes = qres;
      body = qmResultHTML(qres, h.basis, h.q);
    } else if (h.art === 'liuyao') {
      var lres = LY.cast((h.ly || []).map(function (k) {
        return LYD.yaoStates.filter(function (s) { return s.key === k; })[0] || LYD.yaoStates[2];
      }), { date: new Date(h.ts), yongshen: h.lyYong });
      S.ts = h.ts;
      body = lyResultHTML(lres);
    } else {
      body = resultHTML(R.castFromCounts(h.counts), h.basis, h.q);
    }
    openSheet('课 录', fmtDate(h.ts),
      '<div>' + body.replace('<div class="row-actions">', '<div class="row-actions" style="display:none">') + '</div>'
      + '<button class="danger-btn" id="delRec" style="margin-top:16px">删除此课</button>');
    // 弹层内仍可从历史课直接开罗盘
    var ob2 = $('#sheet #openCmp');
    if (ob2) ob2.onclick = function () { openCompass(lastQmRes); };
    var del = $('#delRec');
    if (del) del.onclick = function () {
      S.history = S.history.filter(function (x) { return x.id !== id; });
      saveStore();
      closeSheet();
      if (S.page === 'history') renderPage();
      toast('已删除');
    };
  }

  /** 小六壬白话解 */
  function lrBaiHTML(res) {
    var m = res.main;
    var lines = [];
    var lvl = m.luck.level;

    lines.push('<b>一句话</b>：这一课落在「' + m.name + '」，'
      + (lvl >= 4 ? '是六个宫位里最好的两个之一，事情大体顺遂。'
        : lvl >= 3 ? '属吉，事情能成，但要看火候。'
        : lvl === -2 ? '偏滞，事情会拖，急不得。'
        : lvl <= -3 ? '属凶，眼下不适合推进，宜守。'
        : '平中带变，成败在人为。'));

    lines.push('<b>为什么</b>：三宫从起因走到结果，'
      + '起于「' + res.stops[0].palace.name + '」，'
      + (res.stops.length === 3 ? '经过「' + res.stops[1].palace.name + '」，' : '')
      + '落在「' + m.name + '」。'
      + (lvl >= 3 ? '末宫为吉，所以断为好。'
        : lvl < 0 ? '末宫不利，所以断为阻。' : '末宫平常，全看自己怎么做。'));

    var item = m.items['谋事'] || '';
    lines.push('<b>该怎么做</b>：' + esc(item.replace(/。$/, '')) + '。'
      + (lvl >= 3 ? '可以着手去办，但别求一步到位。' : '先别急着下重注，留条退路。'));

    return '<div class="card bai-card" style="margin-top:14px">'
      + '<div class="bai-head"><span class="bai-tag">白 话 解</span>'
      + '<span class="bai-sub">这一课怎么看</span></div>'
      + lines.map(function (t) { return '<p class="bai-text" style="margin:0 0 10px">' + t + '</p>'; }).join('')
      + '</div>';
  }

  /* ==========================================================
     梅花易数
     ========================================================== */
  function bindMethodCards() {
    $$('.mcard[data-art]').forEach(function (el) {
      el.onclick = function () {
        var a = el.getAttribute('data-art');
        if (S.art === a) { S.page = 'cast'; window.scrollTo(0, 0); renderPage(); return; }
        S.art = a;
        S.page = 'cast';
        S.question = '';
        S.result = null;
        S.mhResult = null;
        saveStore();
        window.scrollTo(0, 0);
        renderPage();
      };
    });
  }

  function mhCastPageHTML() {
    return ''
      + '<div class="segment" id="segMh">'
      + '  <button data-m="time">时间起卦</button>'
      + '  <button data-m="num">数字起卦</button>'
      + '  <button data-m="rand">随机起卦</button>'
      + '</div>'
      + '<div id="mhMethodBox"></div>'
      + '<div id="mhResultBox"></div>';
  }

  function mhTimePanelHTML() {
    return ''
      + '<div class="card gold-line">'
      + '  <div class="now-block">'
      + '    <div class="now-lunar" id="mhLunarBig">—</div>'
      + '    <div class="now-solar" id="mhSolarLine">—</div>'
      + '    <div class="now-shichen" id="mhSumTip">—</div>'
      + '  </div>'
      + '  <div class="mini-row">'
      + '    <button class="mini-btn on" id="mhBtnNow">用此刻</button>'
      + '    <button class="mini-btn" id="mhBtnManual">另择时刻</button>'
      + '  </div>'
      + '  <div id="mhManualBox"></div>'
      + '</div>'
      + '<input class="q-input" id="mhQ" maxlength="40" placeholder="所问何事（可略，如：此事可否成）">'
      + '<button class="cast-btn" id="mhCastBtn">起　卦</button>';
  }

  function mhManualHTML() {
    var v = S.mhManualVals || (function () {
      var t = L.fromDate(new Date(), S.settings);
      return { zhi: zhiIndexOf(t.ganzhi), month: t.month, day: t.day, shichen: t.hour };
    })();
    var zOpts = '', mOpts = '', dOpts = '', hOpts = '';
    for (var i = 1; i <= 12; i++) zOpts += '<option value="' + i + '"' + (i === v.zhi ? ' selected' : '') + '>' + L.SHICHEN[i - 1] + '</option>';
    for (var j = 1; j <= 12; j++) mOpts += '<option value="' + j + '"' + (j === v.month ? ' selected' : '') + '>' + L.monthName(j, false) + '</option>';
    for (var k = 1; k <= 30; k++) dOpts += '<option value="' + k + '"' + (k === v.day ? ' selected' : '') + '>' + L.dayName(k) + '</option>';
    for (var n = 1; n <= 12; n++) hOpts += '<option value="' + n + '"' + (n === v.shichen ? ' selected' : '') + '>' + L.SHICHEN[n - 1] + '时</option>';

    return ''
      + '<div class="manual">'
      + '  <div class="three">'
      + '    <div class="field"><label>年支</label><select id="mhZhi">' + zOpts + '</select></div>'
      + '    <div class="field"><label>农历月</label><select id="mhM">' + mOpts + '</select></div>'
      + '    <div class="field"><label>农历日</label><select id="mhD">' + dOpts + '</select></div>'
      + '  </div>'
      + '  <div class="field"><label>时辰</label><select id="mhH">' + hOpts + '</select></div>'
      + '  <p class="hint" id="mhRange"></p>'
      + '</div>';
  }

  function mhNumPanelHTML() {
    return ''
      + '<div class="card gold-line">'
      + '  <div class="num-grid" style="grid-template-columns:1fr 1fr">'
      + '    <div class="num-cell"><span>上 卦 数</span><input id="mhn0" inputmode="numeric" maxlength="4" placeholder="—" value="' + esc(S.mhNums[0]) + '"></div>'
      + '    <div class="num-cell"><span>下 卦 数</span><input id="mhn1" inputmode="numeric" maxlength="4" placeholder="—" value="' + esc(S.mhNums[1]) + '"></div>'
      + '  </div>'
      + '  <p class="hint" style="margin-top:12px">心中默事，随口报两数。上卦以<b>一数÷8</b>取余，下卦以<b>二数÷8</b>取余，动爻以<b>两数之和÷6</b>取余（余 0 则取满数）。</p>'
      + '</div>'
      + '<input class="q-input" id="mhQ" maxlength="40" placeholder="所问何事（可略）">'
      + '<button class="cast-btn" id="mhCastBtn">起　卦</button>';
  }

  function mhRandPanelHTML() {
    return ''
      + '<div class="card gold-line">'
      + '  <p class="hint">不必取数。凝神静气，将所问之事默念三遍，按下起卦。<br>随机取年月日时之数，与时间起卦同法。</p>'
      + '  <p class="hint" style="margin-top:10px;color:#6f7576">一卦只问一事，一事不可重问。心诚则灵，疑则勿卜。</p>'
      + '</div>'
      + '<input class="q-input" id="mhQ" maxlength="40" placeholder="所问何事（可略）">'
      + '<button class="cast-btn" id="mhCastBtn">起　卦</button>';
  }

  function zhiIndexOf(ganzhi) {
    if (!ganzhi) return 1;
    var z = ganzhi.charAt(1);
    var i = L.SHICHEN.indexOf(z);
    return i >= 0 ? i + 1 : 1;
  }

  function renderMeihuaPage() {
    var view = $('#view');
    view.innerHTML = mhCastPageHTML();
    setSubtitle('梅花易数 · 体用生克');

    $$('#segMh button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-m') === S.mhMethod);
      b.onclick = function () {
        if (S.mhMethod === b.getAttribute('data-m')) return;
        S.mhMethod = b.getAttribute('data-m');
        $$('#segMh button').forEach(function (x) { x.classList.toggle('on', x === b); });
        renderMhPanel();
        $('#mhResultBox').innerHTML = '';
      };
    });
    renderMhPanel();
  }

  function renderMhPanel() {
    var box = $('#mhMethodBox');
    if (!box) return;
    if (S.mhMethod === 'time') box.innerHTML = mhTimePanelHTML();
    else if (S.mhMethod === 'num') box.innerHTML = mhNumPanelHTML();
    else box.innerHTML = mhRandPanelHTML();

    if (S.mhMethod === 'time') {
      updateMhTime();
      if (S.mhManual) showMhManual();
      $('#mhBtnNow').onclick = function () {
        S.mhManual = false;
        S.mhManualVals = null;
        $$('.mini-btn').forEach(function (b) { b.classList.toggle('on', b.id === 'mhBtnNow'); });
        $('#mhManualBox').innerHTML = '';
        updateMhTime();
      };
      $('#mhBtnManual').onclick = function () { S.mhManual = true; showMhManual(); };
    }

    if (S.mhMethod === 'num') {
      ['mhn0', 'mhn1'].forEach(function (id, i) {
        var el = $('#' + id);
        if (!el) return;
        el.oninput = function () {
          var v = this.value.replace(/[^\d]/g, '').slice(0, 4);
          if (v !== this.value) this.value = v;
          S.mhNums[i] = v;
        };
      });
    }

    if ($('#mhCastBtn')) $('#mhCastBtn').onclick = mhDoCast;
  }

  function showMhManual() {
    var box = $('#mhManualBox');
    box.innerHTML = mhManualHTML();
    $$('.mini-btn').forEach(function (b) { b.classList.toggle('on', b.id === 'mhBtnManual'); });
    var v = S.mhManualVals || (function () {
      var t = L.fromDate(new Date(), S.settings);
      return { zhi: zhiIndexOf(t.ganzhi), month: t.month, day: t.day, shichen: t.hour };
    })();
    $('#mhZhi').value = v.zhi; $('#mhM').value = v.month; $('#mhD').value = v.day; $('#mhH').value = v.shichen;

    function sync() {
      S.mhManualVals = {
        zhi: +$('#mhZhi').value, month: +$('#mhM').value,
        day: +$('#mhD').value, shichen: +$('#mhH').value
      };
      var r = $('#mhRange');
      if (r) r.textContent = '此时段：' + L.SHICHEN_RANGE[S.mhManualVals.shichen - 1];
      updateMhTime();
    }
    ['#mhZhi', '#mhM', '#mhD', '#mhH'].forEach(function (s) {
      var el = $(s); if (el) el.onchange = sync;
    });
    var r0 = $('#mhRange');
    if (r0) r0.textContent = '此时段：' + L.SHICHEN_RANGE[v.shichen - 1];
    updateMhTime();
  }

  function updateMhTime() {
    if (S.art !== 'meihua' || S.page !== 'cast' || S.mhMethod !== 'time') return;
    var big = $('#mhLunarBig');
    if (!big) return;

    var v, zhi;
    if (S.mhManual && S.mhManualVals) {
      v = S.mhManualVals;
      zhi = v.zhi;
      big.innerHTML = esc(L.monthName(v.month, false) + L.dayName(v.day)) + '<small> ' + L.SHICHEN[v.shichen - 1] + '时</small>';
      $('#mhSolarLine').textContent = '手动选定 · 年支 ' + L.SHICHEN[zhi - 1] + '、月 ' + v.month + '、日 ' + v.day + '、时 ' + v.shichen;
    } else {
      var t = L.fromDate(new Date(), S.settings);
      if (!t) return;
      zhi = zhiIndexOf(t.ganzhi);
      v = { month: t.month, day: t.day, shichen: t.hour };
      big.innerHTML = esc(t.ganzhi + '年 ' + t.monthName + t.dayName) + '<small> ' + t.shichen + '时</small>';
      $('#mhSolarLine').textContent = t.solar.y + '年' + t.solar.m + '月' + t.solar.d + '日 ' + pad(t.solar.h) + ':' + pad(t.solar.mi) + ' · 公历';
    }

    var s1 = zhi + v.month + v.day;
    var s2 = s1 + v.shichen;
    var tip = $('#mhSumTip');
    if (tip) tip.textContent = s1 + '÷8 余 ' + MH.mod(s1, 8) + ' · ' + s2 + '÷8 余 ' + MH.mod(s2, 8) + ' · ÷6 余 ' + MH.mod(s2, 6);
  }

  function mhDoCast() {
    var q = $('#mhQ');
    S.question = q ? q.value.trim() : '';
    var now = new Date();
    var res, basis, modeNice;

    if (S.mhMethod === 'time') {
      var zhi, mo, dy, sh;
      if (S.mhManual && S.mhManualVals) {
        var v = S.mhManualVals;
        zhi = v.zhi; mo = v.month; dy = v.day; sh = v.shichen;
        basis = '年支' + L.SHICHEN[zhi - 1] + '（' + zhi + '）· 农历' + L.monthName(mo, false) + L.dayName(dy)
          + ' · ' + L.SHICHEN[sh - 1] + '时（' + sh + '）· 手动择时';
      } else {
        var t = L.fromDate(now, S.settings);
        if (!t) { toast('时间换算失败'); return; }
        zhi = zhiIndexOf(t.ganzhi);
        mo = t.month; dy = t.day; sh = t.hour;
        basis = t.ganzhi + '年（' + L.SHICHEN[zhi - 1] + '）' + t.monthName + t.dayName + ' ' + t.shichen + '时'
          + ' · ' + t.solar.y + '年' + t.solar.m + '月' + t.solar.d + '日 ' + pad(t.solar.h) + ':' + pad(t.solar.mi);
      }
      res = MH.castByTime(zhi, mo, dy, sh);
      modeNice = '时间起卦';
    } else if (S.mhMethod === 'num') {
      var a = parseInt(String(S.mhNums[0]).trim(), 10);
      var b = parseInt(String(S.mhNums[1]).trim(), 10);
      if (!isFinite(a) || a < 1) a = 1;
      if (!isFinite(b) || b < 1) b = 1;
      res = MH.castByNumbers(a, b);
      basis = '报数 ' + a + ' · ' + b + '　上卦 ' + a + '÷8 余 ' + MH.mod(a, 8) + ' 取' + res.up.name
        + '，下卦 ' + b + '÷8 余 ' + MH.mod(b, 8) + ' 取' + res.low.name
        + '，动爻 (' + a + '+' + b + ')÷6 余 ' + MH.mod(a + b, 6);
      modeNice = '数字起卦';
    } else {
      res = MH.castRandom();
      var m = res.meta;
      basis = '随机得数：年支' + m.zhiIndex + ' · 月' + m.month + ' · 日' + m.day + ' · 时' + m.shichen
        + '　（' + m.zhiIndex + '+' + m.month + '+' + m.day + '=' + m.sum1 + '，再加' + m.shichen + '=' + m.sum2 + '）';
      modeNice = '随机起卦';
    }

    S.mhResult = res;
    S.basis = basis;
    S.ts = now.getTime();

    S.history.unshift({
      id: String(S.ts) + Math.random().toString(36).slice(2, 6),
      art: 'meihua',
      ts: S.ts,
      q: S.question,
      mode: modeNice,
      basis: basis,
      mh: { zhi: res.meta.zhiIndex, month: res.meta.month, day: res.meta.day, shichen: res.meta.shichen, a: res.meta.a, b: res.meta.b }
    });
    if (S.history.length > 60) S.history.length = 60;
    saveStore();

    var box = $('#mhResultBox');
    box.innerHTML = mhResultHTML(res, basis, S.question);
    bindMhActions(res);
    setTimeout(function () {
      var y = box.getBoundingClientRect().top + window.scrollY - 74;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }, 60);
  }

  /* ---------------- 卦象 SVG ---------------- */
  function hexSVG(lines, dong, opt) {
    opt = opt || {};
    var W = 150, H = 138;
    var cx = 75, barW = 92, halfW = 40, gap = 12;
    var bh = 9, step = 20, top = 15;
    var out = '';
    for (var i = 0; i < 6; i++) {      // i=0 初爻（最下）
      var y = top + (5 - i) * step;
      var isDong = dong === i + 1;
      var col = opt.mono ? (opt.dim ? '#9c968a' : '#b6b0a4') : (isDong ? '#e6cf92' : '#a9a49a');
      var op = opt.dim ? '0.9' : '1';
      if (lines[i]) {
        out += '<rect x="' + (cx - barW / 2) + '" y="' + y + '" width="' + barW + '" height="' + bh
          + '" rx="1.5" fill="' + col + '" opacity="' + op + '"/>';
      } else {
        out += '<rect x="' + (cx - barW / 2) + '" y="' + y + '" width="' + halfW + '" height="' + bh
          + '" rx="1.5" fill="' + col + '" opacity="' + op + '"/>';
        out += '<rect x="' + (cx - barW / 2 + halfW + gap) + '" y="' + y + '" width="' + halfW + '" height="' + bh
          + '" rx="1.5" fill="' + col + '" opacity="' + op + '"/>';
      }
      if (isDong && !opt.mono && !opt.dim) {
        var mk = lines[i] ? '○' : '×';
        out += '<text x="' + (cx + barW / 2 + 11) + '" y="' + (y + bh / 2 + 1) + '" fill="#e2564a"'
          + ' font-size="11" text-anchor="middle" dominant-baseline="central">' + mk + '</text>';
      }
    }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + (opt.w || 110) + '" height="' + Math.round((opt.w || 110) * H / W) + '"'
      + ' aria-label="卦象">' + out + '</svg>';
  }

  /* ---------------- 白话解 ---------------- */
  function baiCardHTML(r) {
    var b = BAI[r.ben.n];
    if (!b) return '';
    return '<div class="card bai-card" style="margin-top:14px">'
      + '<div class="bai-head"><span class="bai-tag">白 话 解</span>'
      + '<span class="bai-sub">' + esc(r.ben.name) + ' · 第 ' + r.ben.n + ' 卦</span></div>'
      + '<p class="bai-text">' + esc(b.bai) + '</p>'
      + '<div class="bai-use"><span>怎 么 用</span>' + esc(b.yong) + '</div>'
      + '</div>';
  }

  function mhResultHTML(r, basis, question) {
    var rel = r.verdict.rel;
    var tone = r.verdict.tone;
    var posName = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'][r.dong - 1];

    var trios = ''
      + '<div class="mh-trio">'
      + '  <div class="mh-mini"><div class="mm-label">本卦</div>' + hexSVG(r.lines, 0, { mono: true, w: 62 })
      + '    <div class="mm-name">' + r.ben.short + '</div></div>'
      + '  <div class="mh-mini"><div class="mm-label">互卦</div>' + hexSVG(MH.hexLines(r.hu), 0, { mono: true, dim: true, w: 62 })
      + '    <div class="mm-name">' + r.hu.short + '</div></div>'
      + '  <div class="mh-mini"><div class="mm-label">变卦</div>' + hexSVG(r.bianLines, 0, { mono: true, dim: true, w: 62 })
      + '    <div class="mm-name">' + (r.bian ? r.bian.short : '—') + '</div></div>'
      + '</div>';

    var relChips = ''
      + '<div class="chips">'
      + '  <span class="chip">体 <b>' + r.ti.name + '</b>' + r.ti.wuxing + '（' + r.tiPos + '）</span>'
      + '  <span class="chip">用 <b>' + r.yong.name + '</b>' + r.yong.wuxing + '（' + r.yongPos + '）</span>'
      + '  <span class="chip">动爻 <b>' + posName + '</b></span>'
      + '</div>';

    var lines = r.verdict.lines.filter(Boolean).map(function (t) {
      return '<p class="meaning" style="margin:0 0 9px">' + esc(t) + '</p>';
    }).join('');

    var items = ''
      + '<div class="items">'
      + '  <div class="item"><div class="k">体卦</div><div class="v">' + r.ti.name + '（' + r.ti.nature + '·' + r.ti.wuxing + '）　' + r.ti.xiang + '。主己身、主体、主内。</div></div>'
      + '  <div class="item"><div class="k">用卦</div><div class="v">' + r.yong.name + '（' + r.yong.nature + '·' + r.yong.wuxing + '）　' + r.yong.xiang + '。主所占之事、对方、主外。</div></div>'
      + '  <div class="item"><div class="k">互卦</div><div class="v">' + r.hu.name + '　事之中程、过程曲折。' + r.huUp.nature + '上' + r.huLow.nature + '下。</div></div>'
      + '  <div class="item"><div class="k">变卦</div><div class="v">' + (r.bian ? r.bian.name + '　事之终局、最终所归。' : '—') + '</div></div>'
      + '</div>';

    return ''
      + '<div class="result">'

      + '  <div class="card gold-line" style="margin-top:16px">'
      + '    <div class="mh-head">'
      + '      <div class="mh-svg">' + hexSVG(r.lines, r.dong, { w: 116 }) + '</div>'
      + '      <div class="mh-info">'
      + '        <div class="palace-name-row" style="margin-bottom:2px">'
      + '          <h2 style="font-size:25px;letter-spacing:2px">' + r.ben.name + '</h2>'
      + '        </div>'
      + '        <p class="palace-hint" style="margin:4px 0 8px">第 ' + r.ben.n + ' 卦 · 上' + r.up.name + '下' + r.low.name + '</p>'
      + '        <span class="luck-tag ' + tone.cls + '">' + tone.label + ' · ' + rel.label + '</span>'
      + '      </div>'
      + '    </div>'
      + relChips
      + '    <p class="meaning" style="margin-top:14px">' + esc(r.verdict.rel.text) + '</p>'
      + '  </div>'

      + '  <div class="verse-card">'
      + '    <div class="v-label">卦　辞</div>'
      + '    <div class="v-text" style="font-size:15px;line-height:1.95">' + esc(r.ben.duan) + '</div>'
      + '    <div class="verse-seal">梅花<br>易数</div>'
      + '  </div>'

      + baiCardHTML(r)

      + '  <div class="section-title">本 互 变 三 卦</div>'
      + trios

      + '  <div class="section-title">体 用 断 卦</div>'
      + '  <div class="card">' + lines
      + '    <p class="meaning" style="margin-top:4px;color:var(--gold)">' + esc(r.verdict.advice) + '</p>'
      + '  </div>'

      + '  <div class="section-title">卦 象 详 解</div>'
      + items

      + termsSectionHTML(r.ben.duan + ' ' + r.verdict.lines.join(' ') + ' ' + r.verdict.rel.text
        + ' 体卦 用卦 互卦 变卦 动爻 先天数 五行 相生 相克')

      + '  <div class="basis" style="margin-top:14px">'
      + '    <b>起卦依据</b>　' + esc(basis) + '<br>'
      + '    <b>所问</b>　' + (question ? esc(question) : '未填') + '<br>'
      + '    <b>记时</b>　' + fmtDate(S.ts)
      + '  </div>'

      + '  <div class="row-actions">'
      + '    <button id="mhCopy">复制此卦</button>'
      + '    <button id="mhAgain">再起一卦</button>'
      + '  </div>'

      + '</div>';
  }
  function bindMhActions(r) {
    var c = $('#mhCopy');
    if (c) c.onclick = function () {
      var txt = '【梅花易数】' + (S.question ? S.question + '\n' : '')
        + '本卦：' + r.ben.name + '（第' + r.ben.n + '卦）\n'
        + '动爻：' + ['初', '二', '三', '四', '五', '上'][r.dong - 1] + '爻\n'
        + '体：' + r.ti.name + '（' + r.ti.wuxing + '）　用：' + r.yong.name + '（' + r.yong.wuxing + '）\n'
        + '关系：' + r.verdict.rel.label + '　' + r.verdict.tone.label + '\n'
        + '互卦：' + r.hu.name + '　变卦：' + (r.bian ? r.bian.name : '—') + '\n'
        + '卦辞：' + r.ben.duan + '\n'
        + r.verdict.lines.filter(Boolean).join('\n')
        + '\n—— 掐指神通 · ' + S.basis;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () { toast('已复制卦式'); }, function () { fallbackCopy(txt); });
      } else fallbackCopy(txt);
    };

    var a = $('#mhAgain');
    if (a) a.onclick = function () {
      S.mhResult = null;
      S.question = '';
      var q = $('#mhQ');
      if (q) q.value = '';
      $('#mhResultBox').innerHTML = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (S.mhMethod === 'rand') setTimeout(mhDoCast, 420);
      else if (S.mhMethod === 'num') { S.mhNums = ['', '']; renderMhPanel(); }
      else updateMhTime();
    };
  }

  /* ==========================================================
     奇门遁甲（时家·转盘·拆补法）
     ========================================================== */
  function renderQimenPage() {
    var view = $('#view');
    view.innerHTML = ''
      + '<div class="card gold-line">'
      + '  <div class="now-block">'
      + '    <div class="now-lunar" id="qmBig">—</div>'
      + '    <div class="now-solar" id="qmSolar">—</div>'
      + '    <div class="now-shichen" id="qmTip">—</div>'
      + '  </div>'
      + '  <div class="mini-row">'
      + '    <button class="mini-btn on" id="qmNow">用此刻</button>'
      + '    <button class="mini-btn" id="qmManual">另择时刻</button>'
      + '  </div>'
      + '  <div id="qmManualBox"></div>'
      + '</div>'
      + '<input class="q-input" id="qmQ" maxlength="40" placeholder="所问何事（可略，如：今日往何方求财）">'
      + '<button class="cast-btn" id="qmCastBtn">起　局</button>'
      + '<div id="qmResultBox"></div>';
    setSubtitle('奇门遁甲 · 时家转盘');

    S.qmManual = false;
    S.qmVals = null;
    updateQimenTime();

    $('#qmNow').onclick = function () {
      S.qmManual = false; S.qmVals = null;
      $('#qmManualBox').innerHTML = '';
      $$('.mini-btn').forEach(function (b) { b.classList.toggle('on', b.id === 'qmNow'); });
      updateQimenTime();
    };
    $('#qmManual').onclick = function () {
      S.qmManual = true;
      $('#qmManualBox').innerHTML = ''
        + '<div class="manual">'
        + '  <div class="field"><label>起局时刻（公历，按北京时间）</label>'
        + '    <input type="datetime-local" id="qmDt"></div>'
        + '  <p class="hint">奇门以<b>时辰</b>起局，同一时辰内盘面相同。</p>'
        + '</div>';
      $$('.mini-btn').forEach(function (b) { b.classList.toggle('on', b.id === 'qmManual'); });
      var t = S.qmVals || new Date();
      $('#qmDt').value = t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate())
        + 'T' + pad(t.getHours()) + ':' + pad(t.getMinutes());
      $('#qmDt').onchange = function () {
        var v = this.value;
        if (!v) return;
        var dp = v.split('T'), a = dp[0].split('-').map(Number), b = (dp[1] || '00:00').split(':').map(Number);
        S.qmVals = new Date(a[0], a[1] - 1, a[2], b[0], b[1]);
        updateQimenTime();
      };
      updateQimenTime();
    };
    $('#qmCastBtn').onclick = qmDoCast;
  }

  function qmCurrentDate() {
    return (S.qmManual && S.qmVals) ? S.qmVals : new Date();
  }

  function updateQimenTime() {
    if (S.art !== 'qimen' || S.page !== 'cast') return;
    var big = $('#qmBig');
    if (!big) return;
    var d = qmCurrentDate();
    var r = QM.cast(d);
    var l = L.fromDate(d, S.settings);
    big.innerHTML = esc(r.term.name + ' ' + r.yuanName) + '<small> ' + r.juText + '</small>';
    $('#qmSolar').textContent = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 '
      + pad(d.getHours()) + ':' + pad(d.getMinutes()) + (S.qmManual ? ' · 手动择时' : ' · 公历');
    $('#qmTip').textContent = '日' + r.dayGz + '　时' + r.hourGz + '　旬首' + r.xun;
    var q = $('#qmQ');
    if (q) S.question = q.value.trim();
  }

  function qmDoCast() {
    var q = $('#qmQ');
    S.question = q ? q.value.trim() : '';
    var d = qmCurrentDate();
    var r = QM.cast(d);
    S.qmResult = r;
    S.ts = d.getTime();
    S.basis = r.term.name + ' ' + r.yuanName + ' ' + r.juText
      + '　日' + r.dayGz + ' 时' + r.hourGz
      + '　符头' + r.futou + '（' + r.yuanName + '）'
      + '　旬首' + r.xun + '遁' + r.xunYi
      + '　' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
      + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());

    S.history.unshift({
      id: String(S.ts) + Math.random().toString(36).slice(2, 6),
      art: 'qimen',
      ts: S.ts,
      q: S.question,
      mode: '奇门起局',
      basis: S.basis,
      qmTime: d.getTime()
    });
    if (S.history.length > 60) S.history.length = 60;
    saveStore();

    var box = $('#qmResultBox');
    lastQmRes = r;
    box.innerHTML = qmResultHTML(r, S.basis, S.question);
    var cp = $('#qmCopy');
    if (cp) cp.onclick = function () {
      var txt = '【奇门遁甲】' + (S.question ? S.question + '\n' : '')
        + r.term.name + ' ' + r.yuanName + ' ' + r.juText + '\n'
        + '日' + r.dayGz + '　时' + r.hourGz + '　旬首' + r.xun + '（遁' + r.xunYi + '）\n'
        + '值符' + r.zhiFuStar + '　值使' + r.zhiShiDoor + '\n'
        + '三吉门：' + r.goodDoors.map(function (g) { return g.door + '→' + g.dir; }).join('　') + '\n'
        + '—— 掐指神通 · ' + S.basis;
      if (navigator.clipboard && navigator.clipboard.writeText)
        navigator.clipboard.writeText(txt).then(function () { toast('已复制局式'); }, function () { fallbackCopy(txt); });
      else fallbackCopy(txt);
    };
    var ag = $('#qmAgain');
    if (ag) ag.onclick = function () {
      $('#qmResultBox').innerHTML = '';
      if (q) q.value = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      updateQimenTime();
    };

    setTimeout(function () {
      var y = box.getBoundingClientRect().top + window.scrollY - 74;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }, 60);
  }

  function qmResultHTML(r, basis, question) {
    // 九宫格
    var cellsHTML = '';
    QMD.grid.forEach(function (row) {
      row.forEach(function (n) {
        var c = r.cells[n];
        var isGood = QMD.goodDoors.indexOf(c.door) >= 0;
        cellsHTML += '<div class="qm-cell' + (isGood ? ' good' : '') + (n === 5 ? ' center' : '') + '">'
          + '<div class="qc-dir">' + c.info.dir + '<span>' + c.info.gua + n + '</span></div>'
          + '<div class="qc-god">' + (c.god || '·') + '</div>'
          + '<div class="qc-star">' + (c.star || '·') + '</div>'
          + '<div class="qc-door">' + (c.door || '·') + '</div>'
          + '<div class="qc-gans">'
          + '<span class="tg">' + (c.tianGan || '·') + '</span>'
          + '<span class="dg">' + (c.gan || '·') + '</span>'
          + (c.jiGan ? '<span class="jg">' + c.jiGan + '</span>' : '')
          + '</div>'
          + '</div>';
      });
    });

    var goodList = r.goodDoors.map(function (g) {
      return '<div class="item"><div class="k">' + g.door + '</div><div class="v">'
        + '<span style="color:var(--gold-hi);font-size:15px">' + g.dir + '</span>'
        + '（' + g.gua + '宫·' + QMD.palaces[g.palace].wuxing + '）</div></div>';
    }).join('');

    var zfDir = r.zhiFuPalace ? QMD.palaces[r.zhiFuPalace].dir : '—';
    var zfGua = r.zhiFuPalace ? QMD.palaces[r.zhiFuPalace].gua : '';

    return ''
      + '<div class="result">'
      + '  <div class="card gold-line" style="margin-top:16px">'
      + '    <div class="palace-name-row"><h2 style="font-size:24px;letter-spacing:2px">' + r.juText + '</h2>'
      + '      <span class="luck-tag ' + (r.yang ? 'luck-ji2' : 'luck-xiong') + '" style="margin-left:auto">'
      + (r.yang ? '阳遁' : '阴遁') + ' · ' + r.yuanName + '</span></div>'
      + '    <p class="palace-hint">' + r.term.name + '　日' + r.dayGz + '　时' + r.hourGz + '　旬首' + r.xun + '</p>'
      + '    <div class="chips">'
      + '      <span class="chip">值符 <b>' + r.zhiFuStar + '</b></span>'
      + '      <span class="chip">值使 <b>' + r.zhiShiDoor + '</b></span>'
      + '      <span class="chip">符头 <b>' + r.futou + '</b></span>'
      + '    </div>'
      + '    <p class="hint" style="margin-top:12px">奇门以九宫定方位，盘成即可读方，<b>不需要罗盘起局</b>。'
      + '若要实地方位，再用手机指南针定北向对照。</p>'
      + '  </div>'

      + qmBaiHTML(r, zfDir, zfGua)

      + '  <div class="section-title">九 宫 盘</div>'
      + '  <div class="qm-grid">' + cellsHTML + '</div>'
      + '  <p class="hint" style="text-align:center;margin-top:8px;line-height:1.75">'
      + '上南下北 · 左东右西<br>每宫自上而下：八神 / 九星 / 八门 / 天盘干·地盘干</p>'
      + '  <p class="hint" style="text-align:center;margin-top:4px;color:#5f6667">'
      + '中五宫寄坤二宫，坤宫末位小字即寄宫之干</p>'

      + '  <div class="section-title">吉 门 方 位</div>'
      + '  <div class="items">' + goodList + '</div>'
      + '  <button class="cmp-btn" id="openCmp">开 罗 盘 · 找 方 位</button>'
      + '  <p class="hint" style="text-align:center;margin-top:8px;color:#6f7576">'
      + '用手机方位传感器实时指向，不必另外查方向</p>'

      + '  <div class="section-title">取 用</div>'
      + '  <div class="card">'
      + '    <p class="meaning">值符落<b style="color:var(--gold-hi)">' + zfDir + '（' + zfGua + '宫）</b>，'
      + '为当时气机所聚；临此方办事，得势得助。</p>'
      + '    <p class="meaning" style="margin-top:10px">三吉门者，开、休、生也。'
      + esc(r.goodDoors.map(function (g) { return g.door + '在' + g.dir; }).join('，'))
      + '。求财谋事宜向生门，出行谒贵宜向开门，休养安居宜向休门。</p>'
      + '    <p class="basis" style="margin-top:12px">本盘采时家奇门·转盘·拆补法。'
      + '另有置闰法、飞盘法、阴盘奇门等，起局与排布皆有出入，不可混用。</p>'
      + '  </div>'

      + termsSectionHTML('值符 值使 旬首 三奇 六仪 阳遁 阴遁 局数 寄宫 天盘 地盘 '
        + r.goodDoors.map(function (g) { return g.door; }).join(' ')
        + ' ' + Object.keys(r.cells).map(function (k) { return r.cells[k].star + ' ' + r.cells[k].god; }).join(' '))

      + '  <div class="basis" style="margin-top:14px">'
      + '    <b>起局依据</b>　' + esc(basis) + '<br>'
      + '    <b>所问</b>　' + (question ? esc(question) : '未填') + '<br>'
      + '    <b>记时</b>　' + fmtDate(S.ts)
      + '  </div>'

      + '  <div class="row-actions">'
      + '    <button id="qmCopy">复制局式</button>'
      + '    <button id="qmAgain">再起一局</button>'
      + '  </div>'
      + '</div>';
  }

  /** 奇门白话解：把盘说成人话 */
  function qmBaiHTML(r, zfDir, zfGua) {    var goodNames = r.goodDoors.map(function (g) { return g.door; });
    // 三吉门各主何事
    var uses = {
      '生门': '求财、谈生意、找机会',
      '开门': '见人、求职、开业、出门办事',
      '休门': '休息、养病、托人说和'
    };
    var lines = [];

    lines.push('<b>一句话</b>：这是一个「' + (r.yang ? '阳遁' : '阴遁') + '」的盘，'
      + '当下气机集中在<b style="color:var(--gold-hi)">' + zfDir + '</b>方向。');

    var usable = goodNames.filter(function (n) { return uses[n]; });
    if (usable.length) {
      lines.push('<b>能往哪走</b>：' + usable.map(function (n) {
        var g = r.goodDoors.filter(function (x) { return x.door === n; })[0];
        return '往<b style="color:var(--gold-hi)">' + g.dir + '</b>办' + uses[n];
      }).join('；') + '，比往别的方向顺。');
    }

    // 忌方：死门、惊门所在
    var bad = [];
    r.goodDoors.forEach(function () {});
    Object.keys(r.cells).forEach(function (k) {
      var c = r.cells[k];
      if (c.door === '死门' || c.door === '惊门') {
        bad.push(c.door + '在' + c.info.dir);
      }
    });
    if (bad.length) {
      lines.push('<b>哪里别去</b>：' + bad.join('，') + '。这些方向主停滞与惊扰，'
        + '谈事、签约、出行尽量绕开。');
    }

    lines.push('<b>要注意</b>：奇门看的是「方位」与「时机」，'
      + '不是吉凶判决书。同一时辰内盘面不变，换个时辰再起，答案就不同了。');

    return '<div class="card bai-card" style="margin-top:14px">'
      + '<div class="bai-head"><span class="bai-tag">白 话 解</span>'
      + '<span class="bai-sub">九宫盘怎么看</span></div>'
      + lines.map(function (t) { return '<p class="bai-text" style="margin:0 0 10px">' + t + '</p>'; }).join('')
      + '</div>';
  }

  /* ==========================================================
     罗盘
     ========================================================== */
  var GUA_ANGLE = { '坎': 0, '艮': 45, '震': 90, '巽': 135, '离': 180, '坤': 225, '兑': 270, '乾': 315 };
  var DIR8 = [
    { dir: '正北', angle: 0, gua: '坎' }, { dir: '东北', angle: 45, gua: '艮' },
    { dir: '正东', angle: 90, gua: '震' }, { dir: '东南', angle: 135, gua: '巽' },
    { dir: '正南', angle: 180, gua: '离' }, { dir: '西南', angle: 225, gua: '坤' },
    { dir: '正西', angle: 270, gua: '兑' }, { dir: '西北', angle: 315, gua: '乾' }
  ];

  var cmpState = null;
  var lastQmRes = null;

  function openCompass(qmRes) {
    if ($('#cmpLayer')) return;

    // 取九宫方向与门
    var cells = [];
    for (var i = 0; i < DIR8.length; i++) {
      var d8 = DIR8[i];
      var pn = null;
      for (var k = 1; k <= 9; k++) {
        if (QMD.palaces[k].gua === d8.gua) { pn = k; break; }
      }
      var cell = pn && qmRes ? qmRes.cells[pn] : null;
      cells.push({
        dir: d8.dir, angle: d8.angle, gua: d8.gua, n: pn,
        door: cell ? cell.door : '',
        star: cell ? cell.star : '',
        good: cell ? QMD.goodDoors.indexOf(cell.door) >= 0 : false
      });
    }

    var layer = document.createElement('div');
    layer.id = 'cmpLayer';
    layer.className = 'cmp-layer';
    layer.innerHTML = ''
      + '<div class="cmp-top">'
      + '  <button class="cmp-x" id="cmpClose" aria-label="关闭">✕</button>'
      + '  <div class="cmp-title">罗　盘</div>'
      + '  <button class="cmp-x" id="cmpToggle" aria-label="切换模式" style="font-size:12px;letter-spacing:1px">切换</button>'
      + '</div>'
      + '<div class="cmp-hint" id="cmpHint">正在启用方位传感器…</div>'
      + '<div class="cmp-dial-wrap" id="cmpWrap">'
      + '  <svg viewBox="0 0 300 300" id="cmpSvg"></svg>'
      + '</div>'
      + '<div class="cmp-readout" id="cmpReadout"></div>'
      + '<div class="cmp-list" id="cmpList"></div>'
      + '<p class="cmp-note" id="cmpNote"></p>';
    document.body.appendChild(layer);
    cmpState = { res: qmRes, cells: cells, unsub: null, manual: false };

    buildDial();
    $('#cmpClose').onclick = closeCompass;
    $('#cmpToggle').onclick = function () {
      cmpState.manual = !cmpState.manual;
      if (cmpState.manual) {
        CP.setManual(CP.state.heading);
        $('#cmpHint').textContent = '手动模式：拖动表盘转动，使「正北」对准实际北方';
      } else {
        tryStartSensor();
      }
    };
    var note = $('#cmpNote');
    if (note) {
      note.innerHTML = '手机罗盘用磁力计测向，受金属、车辆、磁性手机壳干扰时误差可达 ±15°。'
        + '判断大致方位够用，若要精确到山向请用专业罗盘。<br>'
        + (location.protocol === 'https:' ? '' : '非 https 环境无法读取方位传感器。');
    }
    bindDialDrag();
    tryStartSensor();
  }

  function closeCompass() {
    var layer = $('#cmpLayer');
    if (cmpState && cmpState.unsub) cmpState.unsub();
    CP.stop();
    if (layer) layer.remove();
    cmpState = null;
  }

  function tryStartSensor() {
    CP.start().then(function (r) {
      if (!cmpState) return;
      if (!r.ok) {
        cmpState.manual = true;
        $('#cmpHint').textContent = r.reason === 'denied'
          ? '未授权方位权限。可拖动表盘手动对齐。'
          : '此设备无方位传感器。拖动表盘手动对齐。';
      } else {
        $('#cmpHint').textContent = '转动手机，表盘随之转动　·　红针指向你正前方';
      }
      subscribe();
    });
  }

  function subscribe() {
    if (cmpState.unsub) cmpState.unsub();
    cmpState.unsub = CP.on(function (h) {
      updateDial(h);
    });
  }

  /* ---------------- 表盘 ---------------- */
  function buildDial() {
    var svg = $('#cmpSvg');
    if (!svg) return;
    var out = '';

    // 刻度环（随朝向旋转）
    out += '<g id="cmpRing">';
    out += '<circle cx="150" cy="150" r="144" fill="none" stroke="rgba(201,169,97,.18)" stroke-width="1"/>';
    for (var t = 0; t < 72; t++) {
      var a = t * 5 * Math.PI / 180;
      var major = t % 9 === 0;
      var r1 = major ? 132 : 138, r2 = 144;
      var x1 = 150 + r1 * Math.sin(a), y1 = 150 - r1 * Math.cos(a);
      var x2 = 150 + r2 * Math.sin(a), y2 = 150 - r2 * Math.cos(a);
      out += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1)
        + '" y2="' + y2.toFixed(1) + '" stroke="' + (major ? 'rgba(201,169,97,.55)' : 'rgba(201,169,97,.18)')
        + '" stroke-width="' + (major ? 1.6 : 1) + '"/>';
    }
    out += '</g>';

    // 每宫的高亮背景（JS 定位）
    out += '<g id="cmpGlow"></g>';

    // 方位文字（JS 定位，保持正立）
    out += '<g id="cmpLabels"></g>';

    // 中心
    out += '<circle cx="150" cy="150" r="56" fill="rgba(13,16,18,.94)" stroke="rgba(201,169,97,.28)"/>';
    out += '<text id="cmpDeg" x="150" y="146" text-anchor="middle" fill="#e6cf92"'
      + ' font-family="var(--serif)" font-size="30" letter-spacing="1">0°</text>';
    out += '<text id="cmpDirName" x="150" y="170" text-anchor="middle" fill="#9b9488"'
      + ' font-size="11" letter-spacing="3">正北</text>';

    // 固定指针（手机正前方）——放在刻度环外侧，避免压住方位文字
    out += '<g id="cmpPointer">'
      + '<path d="M150 2 L157.5 20 L142.5 20 Z" fill="#b23a30"/>'
      + '<circle cx="150" cy="2" r="2" fill="#e2564a"/>'
      + '</g>';

    svg.innerHTML = out;

    // 生成文字标签
    var glow = $('#cmpGlow'), lab = $('#cmpLabels');
    cmpState.cells.forEach(function (c, idx) {
      if (c.good) {
        var ga = c.angle * Math.PI / 180;
        var gx = 150 + 112 * Math.sin(ga), gy = 150 - 112 * Math.cos(ga);
        glow.innerHTML += '<circle class="cmp-glow" data-i="' + idx + '" cx="' + gx.toFixed(1)
          + '" cy="' + gy.toFixed(1) + '" r="24" fill="rgba(201,169,97,.10)" stroke="rgba(201,169,97,.34)" stroke-width="1"/>';
      }
    });

    cmpState.cells.forEach(function (c, idx) {
      lab.innerHTML += '<g class="cmp-lab" data-i="' + idx + '">'
        + '<text class="cl-dir' + (c.good ? ' good' : '') + '" font-size="11" text-anchor="middle"'
        + ' fill="' + (c.good ? '#ffd98a' : '#8b9294') + '" letter-spacing="1">' + c.dir + '</text>'
        + '<text class="cl-gua" font-size="9" text-anchor="middle" fill="#6d7476" letter-spacing=".5">'
        + c.gua + (c.n || '') + '</text>'
        + '<text class="cl-door" font-size="10.5" text-anchor="middle"'
        + ' fill="' + (c.good ? '#e6cf92' : '#9a9488') + '" letter-spacing=".5">' + (c.door || '') + '</text>'
        + '</g>';
    });

    updateDial(CP.state.heading || 0);
  }

  function updateDial(h) {
    if (!cmpState) return;
    var svg = $('#cmpSvg');
    if (!svg) return;

    var ring = $('#cmpRing');
    if (ring) ring.setAttribute('transform', 'rotate(' + (-h).toFixed(2) + ' 150 150)');

    // 文字随方位移动但保持正立
    cmpState.cells.forEach(function (c, idx) {
      var a = (c.angle - h - 90) * Math.PI / 180;
      var lab = svg.querySelector('.cmp-lab[data-i="' + idx + '"]');
      if (!lab) return;
      // 标签锚点收在刻度环内侧，避免压住吉门高亮圈与刻度
      var lx = 150 + 112 * Math.cos(a), ly = 150 + 112 * Math.sin(a);
      lab.setAttribute('transform', 'translate(' + lx.toFixed(1) + ',' + ly.toFixed(1) + ')');
      // 三行固定为「方向 / 卦数 / 门」，整体上下移动以避开边界
      var t1 = lab.querySelector('.cl-dir'), t2 = lab.querySelector('.cl-gua'), t3 = lab.querySelector('.cl-door');
      // 靠近顶部时整组下移，靠近底部时整组上移，行序始终不变
      var shift = Math.sin(a) < -0.5 ? 20 : (Math.sin(a) > 0.5 ? -20 : 0);
      [t1, t2, t3].forEach(function (tx, i) {
        if (!tx) return;
        tx.setAttribute('x', 0);
        tx.setAttribute('y', shift + i * 12);
      });

      var glow = svg.querySelector('.cmp-glow[data-i="' + idx + '"]');
      if (glow) {
        var gx = 150 + 112 * Math.cos(a), gy = 150 + 112 * Math.sin(a);
        glow.setAttribute('cx', gx.toFixed(1));
        glow.setAttribute('cy', gy.toFixed(1));
      }
    });

    // 中心读数
    var deg = Math.round(CP.norm(h));
    var near = DIR8[Math.round(deg / 45) % 8];
    var dg = $('#cmpDeg'), dn = $('#cmpDirName');
    if (dg) dg.textContent = deg + '°';
    if (dn) dn.textContent = near ? near.dir : '';

    // 方位提示
    renderReadout(h);
  }

  function renderReadout(h) {
    var list = $('#cmpList');
    var ro = $('#cmpReadout');
    if (!list) return;

    var goods = cmpState.cells.filter(function (c) { return c.good; });
    if (!goods.length) { list.innerHTML = ''; return; }

    // 最近的吉门
    var best = null;
    goods.forEach(function (c) {
      var d = Math.abs(CP.deltaTo(c.angle, h));
      if (!best || d < best.abs) best = { c: c, abs: d, delta: CP.deltaTo(c.angle, h) };
    });

    if (best) {
      var turn = Math.round(best.delta);
      var txt;
      if (Math.abs(turn) <= 6) txt = '<b>已对准</b>　' + best.c.dir + '　　朝这个方向走';
      else if (turn > 0) txt = '向右转 <b>' + Math.abs(turn) + '°</b>　→　' + best.c.dir + '（' + best.c.door + '）';
      else txt = '向左转 <b>' + Math.abs(turn) + '°</b>　→　' + best.c.dir + '（' + best.c.door + '）';
      if (ro) ro.innerHTML = txt;
    }

    list.innerHTML = goods.map(function (c) {
      var d = Math.round(CP.deltaTo(c.angle, h));
      var arrow = Math.abs(d) <= 6 ? '●' : (d > 0 ? '↻' : '↺');
      return '<div class="cmp-item">'
        + '<span class="ci-door">' + c.door + '</span>'
        + '<span class="ci-dir">' + c.dir + '</span>'
        + '<span class="ci-deg">' + c.angle + '°</span>'
        + '<span class="ci-turn">' + arrow + ' ' + (Math.abs(d) <= 6 ? '对准' : Math.abs(d) + '°') + '</span>'
        + '</div>';
    }).join('');
  }

  /* ---------------- 手动拖动 ---------------- */
  function bindDialDrag() {
    var wrap = $('#cmpWrap');
    if (!wrap) return;
    var dragging = false, startAng = 0, startH = 0;

    function ang(e) {
      var r = wrap.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - (r.left + r.width / 2);
      var y = (e.touches ? e.touches[0].clientY : e.clientY) - (r.top + r.height / 2);
      return Math.atan2(x, -y) * 180 / Math.PI; // 0=上，顺时针为正
    }

    function down(e) {
      if (!cmpState.manual) return;
      dragging = true;
      startAng = ang(e);
      startH = CP.state.heading;
      var hint = $('#cmpHint');
      if (hint) hint.textContent = '拖动表盘转动，使「正北」对准实际北方';
    }
    function move(e) {
      if (!dragging) return;
      e.preventDefault();
      var d = ang(e) - startAng;
      while (d > 180) d -= 360;
      while (d < -180) d += 360;
      CP.setManual(startH - d);
    }
    function up() { dragging = false; }

    wrap.addEventListener('touchstart', down, { passive: true });
    wrap.addEventListener('touchmove', move, { passive: false });
    wrap.addEventListener('touchend', up);
    wrap.addEventListener('mousedown', down);
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  /* ==========================================================
     六爻纳甲
     ========================================================== */
  function renderLiuyaoPage() {
    var view = $('#view');
    var states = S.lyStates || [];
    var tossed = states.filter(Boolean).length;

    view.innerHTML = ''
      + '<div class="card gold-line ly-toss-card">'
      + '  <p class="ly-tip" id="lyTip">'
      + (tossed === 6 ? '六爻已备，可成卦' : '心中默念所问之事，由初爻起，自下而上逐爻摇之')
      + '</p>'
      + '  <div class="ly-slots" id="lySlots">' + lySlotsHTML(states) + '</div>'
      + '  <button class="cast-btn" id="lyTossBtn">'
      + (tossed === 6 ? '重 新 摇 卦' : (tossed === 0 ? '摇　初　爻' : '摇　第 ' + LY_CN[tossed] + '　爻'))
      + '</button>'
      + '  <div class="row-actions" style="margin-top:10px">'
      + '    <button id="lyAll">一次摇完</button>'
      + '    <button id="lyReset">清空重来</button>'
      + '  </div>'
      + '</div>'
      + '<div id="lyResultBox"></div>';

    setSubtitle('六爻纳甲 · 铜钱摇卦');

    $('#lyTossBtn').onclick = function () {
      if ((S.lyStates || []).filter(Boolean).length === 6) { S.lyStates = []; }
      lyTossOne();
    };
    $('#lyAll').onclick = function () {
      S.lyStates = [];
      for (var i = 0; i < 6; i++) S.lyStates.push(LY.toss());
      S.ts = Date.now();
      refreshLySlots();
      setTimeout(function () { lyBuild(); }, 260);
    };
    $('#lyReset').onclick = function () {
      S.lyStates = [];
      $('#lyResultBox').innerHTML = '';
      renderLiuyaoPage();
    };
  }

  var LY_CN = ['初', '二', '三', '四', '五', '上'];

  function lySlotsHTML(states) {
    var out = '';
    for (var p = 6; p >= 1; p--) {   // 上爻在上，初爻在下
      var s = states[p - 1];
      out += '<div class="ly-slot' + (s ? ' filled' : '') + (s && s.moving ? ' moving' : '') + '">'
        + '<div class="ls-pos">' + LY_CN[p - 1] + '爻</div>'
        + '<div class="ls-bar">' + (s ? lyBarHTML(s.yin, s.moving) : '<span class="ls-empty">— —</span>') + '</div>'
        + '<div class="ls-state">' + (s ? s.name + '<i>' + s.mark + '</i>' : '') + '</div>'
        + '</div>';
    }
    return out;
  }

  function lyBarHTML(yin, moving) {
    var cls = 'yb' + (moving ? ' yb-move' : '');
    if (yin) {
      return '<span class="' + cls + ' yin"><i></i><i></i></span>';
    }
    return '<span class="' + cls + ' yang"><i></i></span>';
  }

  function refreshLySlots() {
    var el = $('#lySlots');
    if (el) el.innerHTML = lySlotsHTML(S.lyStates || []);
    var n = (S.lyStates || []).filter(Boolean).length;
    var tip = $('#lyTip');
    if (tip) tip.textContent = n === 6 ? '六爻已备，可成卦' : '心中默念所问之事，由初爻起，自下而上逐爻摇之';
    var btn = $('#lyTossBtn');
    if (btn) btn.textContent = n === 6 ? '重 新 摇 卦' : (n === 0 ? '摇　初　爻' : '摇　第 ' + LY_CN[n] + '　爻');
  }

  function lyTossOne() {
    if (!S.lyStates) S.lyStates = [];
    var n = S.lyStates.filter(Boolean).length;
    if (n >= 6) return;
    var r = LY.toss();
    S.lyStates[n] = r;
    tick(560 + r.coins * 90);
    buzz(12);
    refreshLySlots();
    // 摇满六爻即成卦
    if (S.lyStates.filter(Boolean).length === 6) {
      S.ts = Date.now();
      setTimeout(function () { lyBuild(); }, 320);
    }
  }

  function lyBuild() {
    if (!S.lyStates || S.lyStates.filter(Boolean).length < 6) return;
    var date = new Date(S.ts || Date.now());
    S.lyYong = S.lyYong || null;
    var r = LY.cast(S.lyStates, { date: date, yongshen: S.lyYong });
    S.lyResult = r;

    S.history.unshift({
      id: String(S.ts) + Math.random().toString(36).slice(2, 6),
      art: 'liuyao',
      ts: S.ts,
      q: S.question,
      mode: '六爻摇卦',
      basis: r.ben.name + '　' + r.palaceText + '　日' + r.dayGanZhi + '　月建' + r.monthZhi,
      ly: S.lyStates.map(function (s) { return s.key; }),
      lyYong: S.lyYong
    });
    if (S.history.length > 60) S.history.length = 60;
    saveStore();

    var box = $('#lyResultBox');
    box.innerHTML = lyResultHTML(r);
    bindLyActions(r);
    setTimeout(function () {
      var y = box.getBoundingClientRect().top + window.scrollY - 74;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }, 60);
  }

  /* ---------------- 卦盘渲染 ---------------- */
  function lyResultHTML(r) {
    var rows = '';
    for (var p = 6; p >= 1; p--) {
      var y = r.yao[p - 1];
      var isYao = r.yongshen && y.liuqin === r.yongshen;
      var fu = y.fushen;
      rows += '<div class="ly-row' + (y.moving ? ' is-move' : '') + (isYao ? ' is-yong' : '') + '">'
        + '<div class="lr-shen">' + y.liushen + '</div>'
        + '<div class="lr-main">'
        + (fu ? '<div class="lr-fu">伏 ' + fu.liuqin + ' ' + fu.ganZhi + '</div>' : '')
        + '<div class="lr-line">'
        + '<span class="lr-qin">' + y.liuqin + '</span>'
        + '<span class="lr-gz">' + y.ganZhi + '<i>' + y.wuxing + '</i></span>'
        + lyBarHTML(y.yin, y.moving)
        + '<span class="lr-sy">' + (y.shi ? '世' : (y.ying ? '应' : '')) + '</span>'
        + '</div>'
        + '</div>'
        + '<div class="lr-bian">'
        + (y.moving
          ? '<div class="lrb-qin">' + y.bianLiqin + '</div><div class="lrb-gz">' + y.bianGanZhi + '</div>'
          : '')
        + '</div>'
        + '</div>';
    }

    var head = ''
      + '<div class="ly-head">'
      + '  <div class="lh-main"><span>本　卦</span><b>' + r.ben.name + '</b></div>'
      + '  <div class="lh-bian"><span>变　卦</span><b>' + (r.bian ? r.bian.hex.name : '无') + '</b></div>'
      + '</div>'
      + '<div class="ly-meta">'
      + '  <span class="chip">' + r.palaceText + '</span>'
      + '  <span class="chip">' + (r.bian ? '动爻 ' + r.moving.length : '六爻安静') + '</span>'
      + '  <span class="chip">日 <b>' + r.dayGanZhi + '</b></span>'
      + '  <span class="chip">月建 <b>' + r.monthZhi + '</b></span>'
      + '  <span class="chip">旬空 <b>' + r.kong.join('') + '</b></span>'
      + '</div>';

    // 伏神汇总
    var fuBox = '';
    if (r.fushen.length) {
      fuBox = '<div class="ly-fu-list">'
        + r.fushen.map(function (f) {
          return '<span>' + f.liuqin + ' ' + f.ganZhi + ' 伏第' + f.pos + '爻</span>';
        }).join('') + '</div>';
    }

    // 用神选择
    var yongChips = LYD.yongshen.map(function (y) {
      var on = r.yongshen === y.key ? ' on' : '';
      var inGua = r.yao.some(function (yy) { return yy.liuqin === y.key; });
      var hasFu = r.fushen.some(function (f) { return f.liuqin === y.key; });
      return '<button class="ly-yong' + on + '" data-yong="' + y.key + '">' + y.key
        + '<i>' + (inGua ? '上卦' : (hasFu ? '伏藏' : '不上卦')) + '</i></button>';
    }).join('');

    var yongDesc = r.yongshen ? (LYD.yongshen.filter(function (x) { return x.key === r.yongshen; })[0] || {}).desc : '';

    var analysis = '';
    if (r.analysis) {
      analysis = '<div class="section-title">用 神 分 析</div>'
        + '<div class="card">'
        + '  <div class="ly-tone"><span class="luck-tag ' + r.analysis.tone.cls + '">'
        + r.analysis.tone.label + '</span>'
        + '<span class="ly-yongname">用神 · ' + r.yongshen + '</span></div>'
        + r.analysis.lines.map(function (t) {
          return '<p class="meaning" style="margin:9px 0 0">' + esc(t) + '</p>';
        }).join('')
        + '</div>';
    }

    return ''
      + '<div class="result">'
      + '  <div class="card gold-line" style="margin-top:16px">'
      + head
      + '    <div class="ly-pan">' + rows + '</div>'
      + fuBox
      + '    <p class="hint" style="margin-top:10px;line-height:1.75">'
      + '自下而上为初至六爻　｜　左列六神，中列本卦六亲干支，右列变卦'
      + (r.moving.length ? '，加粗者为动爻' : '') + '</p>'
      + '  </div>'

      + '  <div class="section-title">取 用 神</div>'
      + '  <div class="card">'
      + '    <p class="hint" style="margin-bottom:10px">六爻断卦先定用神。按所问之事，点选相应六亲</p>'
      + '    <div class="ly-yong-wrap">' + yongChips + '</div>'
      + (yongDesc ? '<p class="hint" style="margin-top:10px">用神含义：' + esc(yongDesc) + '</p>' : '')
      + '  </div>'

      + analysis

      + lyBaiHTML(r)

      + termsSectionHTML('六爻 纳甲 六亲 六神 世应 用神 伏神 旬空 月建 日辰 旺相休囚死 动爻 '
        + '父母 兄弟 子孙 妻财 官鬼 青龙 朱雀 勾陈 腾蛇 白虎 玄武 '
        + (r.yongshen || ''))

      + '  <div class="basis" style="margin-top:14px">'
      + '    <b>卦体</b>　' + r.ben.name + '（' + r.palaceText + '）'
      + (r.bian ? '　变 ' + r.bian.hex.name : '') + '<br>'
      + '    <b>干支</b>　日' + r.dayGanZhi + '　月建' + r.monthZhi + '　旬空' + r.kong.join('') + '<br>'
      + '    <b>动爻</b>　' + (r.moving.length
        ? r.moving.map(function (y) { return LY_CN[y.pos - 1] + '爻'; }).join('、')
        : '无（静卦）') + '<br>'
      + '    <b>记时</b>　' + fmtDate(S.ts)
      + '  </div>'

      + '  <div class="row-actions">'
      + '    <button id="lyCopy">复制卦式</button>'
      + '    <button id="lyAgain">再摇一卦</button>'
      + '  </div>'
      + '</div>';
  }

  /** 六爻白话解 */
  function lyBaiHTML(r) {
    var lines = [];
    var mv = r.moving.length;

    lines.push('<b>一句话</b>：得「' + r.ben.name + '」，属' + r.palaceText + '。'
      + (mv === 0 ? '六爻安静，事态平稳，短期内不会有大的变动。'
        : mv === 1 ? '一爻独动，事情的变数集中在一处，方向比较明确。'
        : mv <= 3 ? mv + ' 爻发动，事情正在变动之中，头绪较多。'
        : mv + ' 爻乱动，事情纷乱，牵涉面广，宜先理清主次。'));

    if (r.bian) {
      lines.push('<b>会变成什么</b>：由「' + r.ben.short + '」变为「' + r.bian.hex.short
        + '」。本卦是眼下，变卦是后势——'
        + (r.bian.hex.fortune === '吉' ? '后势转好，值得等下去。'
          : r.bian.hex.fortune === '凶' ? '后势转差，宜早作打算，别拖到坏的时候。'
          : '后势平顺，成败主要看人为。'));
    }

    if (!r.yongshen) {
      lines.push('<b>下一步</b>：先在下面「取用神」里点选你所问之事（问财点妻财、问工作点官鬼、问文书点父母……），'
        + '我再据此断吉凶。六爻不看用神是断不了的。');
    } else if (r.analysis) {
      var tn = r.analysis.tone.label;
      lines.push('<b>结论</b>：所问之事取「' + r.yongshen + '」为用神，'
        + (tn === '大吉' ? '用神旺相得力，事情可成，可以着手去办。'
          : tn === '吉' ? '用神有气，事可为，但要借力，不宜独自硬扛。'
          : tn === '平' ? '用神平平，成败在人，守正待时为宜。'
          : tn === '小凶' ? '用神力弱受制，事多阻碍，宜缓图。'
          : tn === '无着' ? '卦中无用神也无伏神，此事一时无着落。'
          : '用神衰绝，事情难成，宜止宜改图。'));
    }

    return '<div class="card bai-card" style="margin-top:14px">'
      + '<div class="bai-head"><span class="bai-tag">白 话 解</span>'
      + '<span class="bai-sub">这一卦怎么看</span></div>'
      + lines.map(function (t) { return '<p class="bai-text" style="margin:0 0 10px">' + t + '</p>'; }).join('')
      + '</div>';
  }

  function bindLyActions(r) {
    $$('#lyResultBox .ly-yong').forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-yong');
        S.lyYong = (S.lyYong === k) ? null : k;
        lyBuild();
      };
    });

    var c = $('#lyCopy');
    if (c) c.onclick = function () {
      var t = '【六爻】' + (S.question ? S.question + '\n' : '')
        + r.ben.name + '（' + r.palaceText + '）' + (r.bian ? ' 变 ' + r.bian.hex.name : '') + '\n'
        + '日' + r.dayGanZhi + ' 月建' + r.monthZhi + ' 旬空' + r.kong.join('') + '\n';
      for (var p = 6; p >= 1; p--) {
        var y = r.yao[p - 1];
        t += y.liushen + ' ' + y.liuqin + y.ganZhi
          + (y.shi ? ' 世' : (y.ying ? ' 应' : ''))
          + (y.moving ? ' 动→' + y.bianLiqin + y.bianGanZhi : '') + '\n';
      }
      if (r.yongshen && r.analysis) t += '用神' + r.yongshen + '：' + r.analysis.tone.label + '\n';
      t += '—— 掐指神通';
      if (navigator.clipboard && navigator.clipboard.writeText)
        navigator.clipboard.writeText(t).then(function () { toast('已复制卦式'); }, function () { fallbackCopy(t); });
      else fallbackCopy(t);
    };

    var a = $('#lyAgain');
    if (a) a.onclick = function () {
      S.lyStates = [];
      S.lyYong = null;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      renderLiuyaoPage();
    };
  }

  /* ==========================================================
     术法页
     ========================================================== */
  var METHODS = [
    { id: 'liuren', name: '小六壬', desc: '掐指神通。六宫轮转，三步断事，最便最速。', ready: true },
    { id: 'meihua', name: '梅花易数', desc: '以数起卦，体用生克，互卦变卦观终始。', ready: true },
    { id: 'qimen', name: '奇门遁甲', desc: '时家转盘，九宫八门，择时择方。', ready: true },
    { id: 'liuyao', name: '六爻纳甲', desc: '铜钱摇卦，装卦纳甲，六亲六神断吉凶。', ready: true },
    { id: 'taiyi', name: '太乙神数', desc: '三式之首，推演国运岁计。' },
    { id: 'zhuge', name: '诸葛神数', desc: '三字数定签，占断人事。' }
  ];

  function methodsPageHTML() {
    var grid = METHODS.map(function (m) {
      var on = m.ready && S.art === m.id;
      return '<div class="mcard ' + (m.ready ? (on ? 'active' : 'ready') : 'locked') + '"'
        + (m.ready ? ' data-art="' + m.id + '" role="button"' : '') + '>'
        + '<div class="m-tag">' + (m.ready ? (on ? '使用中' : '可用') : '筹备') + '</div>'
        + '<div class="m-name">' + m.name + '</div>'
        + '<div class="m-desc">' + m.desc + '</div>'
        + '</div>';
    }).join('');

    return ''
      + '<div class="section-title">术 法</div>'
      + '<div class="mgrid">' + grid + '</div>'
      + '<p class="hint" style="margin-top:10px;text-align:center">点击「可用」的术法即切换，演算页随之更换</p>'

      + '<div class="section-title">小 六 壬 法 要</div>'
      + '<div class="card">'
      + '  <p class="meaning" style="font-size:12.5px">六宫次序，顺行不逆：<span style="color:var(--gold-hi)">大安 → 留连 → 速喜 → 赤口 → 小吉 → 空亡</span>，至空亡复归大安。</p>'
      + '  <div class="items" style="margin-top:12px">'
      + '    <div class="item"><div class="k">时间课</div><div class="v">大安起正月，顺数至当月；月宫起初一，顺数至当日；日宫起子时，顺数至当下时辰。所落之宫，即断。三步者，天时、地利、人和也。</div></div>'
      + '    <div class="item"><div class="k">报数课</div><div class="v">心中默事，随口报数。一数落天时，二数落地利，三数落人和；单数直断，两数首尾并参。</div></div>'
      + '    <div class="item"><div class="k">取用</div><div class="v">以末宫（人和）定成败，以首宫观起因；三宫皆宜则事顺，首尾相克则先难后易或先吉后凶。</div></div>'
      + '  </div>'
      + '</div>'

      + '<div class="section-title">梅 花 易 数 法 要</div>'
      + '<div class="card">'
      + '  <p class="meaning" style="font-size:12.5px">取卦不用蓍草，因<em style="font-style:normal;color:var(--gold-hi)">数</em>起卦，观象断事。八卦先天数：乾一、兑二、离三、震四、巽五、坎六、艮七、坤八。</p>'
      + '  <div class="items" style="margin-top:12px">'
      + '    <div class="item"><div class="k">时间起卦</div><div class="v">上卦＝（年支序＋月＋日）÷8 取余；下卦＝（年支序＋月＋日＋时）÷8 取余；动爻＝（年支序＋月＋日＋时）÷6 取余。余 0 则取满数（8 或 6）。</div></div>'
      + '    <div class="item"><div class="k">数字起卦</div><div class="v">心中默事报两数：一数÷8 为上卦，二数÷8 为下卦，两数之和÷6 为动爻。</div></div>'
      + '    <div class="item"><div class="k">体用</div><div class="v">动爻所在之卦为「用」，另一卦为「体」。体主己身，用主所占之事。动爻在下卦（初二三），则下卦为用、上卦为体；反之亦然。</div></div>'
      + '    <div class="item"><div class="k">生克</div><div class="v">用生体、体用比和为吉；体克用吉而费力；体生用为耗；用克体为凶。此为断卦之要。</div></div>'
      + '    <div class="item"><div class="k">互变</div><div class="v">互卦取本卦二三四爻为下、三四五爻为上，观事之中程；变卦为动爻阴阳互易，观事之终局。</div></div>'
      + '  </div>'
      + '</div>'

      + '<div class="section-title">奇 门 遁 甲 法 要</div>'
      + '<div class="card">'
      + '  <p class="meaning" style="font-size:12.5px">本作采<b style="color:var(--gold-hi)">时家奇门 · 转盘 · 拆补法</b>。'
      + '以时辰起局，九宫定方位——盘成即可读方，<b>不需罗盘起局</b>。</p>'
      + '  <div class="items" style="margin-top:12px">'
      + '    <div class="item"><div class="k">定局</div><div class="v">按太阳黄经定节气，再以当日符头（甲、己日）支定上中下元，查表得阳遁或阴遁几局。冬至后阳遁顺行，夏至后阴遁逆行。</div></div>'
      + '    <div class="item"><div class="k">地盘</div><div class="v">按局数布三奇六仪（戊己庚辛壬癸丁丙乙），阳遁顺九宫、阴遁逆九宫。</div></div>'
      + '    <div class="item"><div class="k">天盘</div><div class="v">取旬首所遁之仪为值符，值符加时干落宫，其余八星依次随转。天禽寄坤二，随天芮同宫。</div></div>'
      + '    <div class="item"><div class="k">八门</div><div class="v">旬首原宫之门为值使，自值使起按阳顺阴逆数至时支，落宫后八门依次排布。</div></div>'
      + '    <div class="item"><div class="k">八神</div><div class="v">值符起于值符落宫，阳遁顺布、阴遁逆布：值符、腾蛇、太阴、六合、白虎、玄武、九地、九天。</div></div>'
      + '    <div class="item"><div class="k">取方</div><div class="v">三吉门为要：开门宜出行谒贵、生门宜求财谋事、休门宜安居休养。值符所落之方为气机所聚。</div></div>'
      + '  </div>'
      + '  <p class="hint" style="margin-top:12px;color:#6f7576">\u7248\u672c\u8bf4\u660e\uff1a\u53e6\u6709\u7f6e\u95f0\u6cd5\u3001\u98de\u76d8\u6cd5\u3001\u9634\u76d8\u5947\u95e8\u7b49\uff0c\u8d77\u5c40\u4e0e\u6392\u5e03\u5747\u6709\u51fa\u5165\uff0c\u4e0d\u53ef\u6df7\u7528\u3002</p>'
      + '</div>'

      + '<div class="section-title">六 爻 纳 甲 法 要</div>'
      + '<div class="card">'
      + '  <p class="meaning" style="font-size:12.5px">三枚铜钱摇六次，自初爻而上。'
      + '三背为<b style="color:var(--gold-hi)">老阳</b>（重，动），两背一字为<b style="color:var(--gold-hi)">少阴</b>（拆，静），'
      + '一背二字为<b style="color:var(--gold-hi)">少阳</b>（单，静），三字为<b style="color:var(--gold-hi)">老阴</b>（交，动）。</p>'
      + '  <div class="items" style="margin-top:12px">'
      + '    <div class="item"><div class="k">八宫</div><div class="v">以八纯卦为首，逐爻变而上：本宫、一世至五世、游魂（复变四爻）、归魂（下卦复归）。一卦属何宫，即以该宫五行为「我」。</div></div>'
      + '    <div class="item"><div class="k">世应</div><div class="v">本宫世六应三，一世世初应四，二世世二应五，三世世三应六，四世世四应初，五世世五应二，游魂世四应初，归魂世三应上。世为己，应为彼。</div></div>'
      + '    <div class="item"><div class="k">纳甲</div><div class="v">乾纳甲壬、坤纳乙癸、震纳庚、巽纳辛、坎纳戊、离纳己、艮纳丙、兑纳丁。阳卦顺行阳支，阴卦逆行阴支。</div></div>'
      + '    <div class="item"><div class="k">六亲</div><div class="v">同我者兄弟、生我者父母、我生者子孙、克我者官鬼、我克者妻财。</div></div>'
      + '    <div class="item"><div class="k">用神</div><div class="v">问财取妻财、问工作取官鬼、问文书房产取父母、问子女取子孙、问同辈取兄弟。用神取错则整卦皆歪，故本作须先点选用神再断。</div></div>'
      + '    <div class="item"><div class="k">伏神</div><div class="v">本卦六亲不全时，缺者取本宫首卦同位之爻为伏神，压于飞神之下，须得日月生扶或飞神提拔方能出伏。</div></div>'
      + '  </div>'
      + '</div>'

      + '<div class="section-title">装 到 iPhone</div>'
      + '<div class="card">'
      + '  <div class="steps-guide">'
      + '    <div class="guide-item">用 <b>Safari</b> 打开本页（须 Safari，微信内打开不能安装）。</div>'
      + '    <div class="guide-item">点底部中间的 <b>分享</b> 按钮（方框带向上箭头）。</div>'
      + '    <div class="guide-item">在弹出菜单中选 <b>「添加到主屏幕」</b>，再点右上角「添加」。</div>'
      + '    <div class="guide-item">主屏即出现「掐指神通」图标，点开全屏运行，<b>断网亦可用</b>。</div>'
      + '  </div>'
      + '</div>'

      + '<p class="foot-note">小六壬属道家民间掌诀，梅花易数本于邵雍《梅花易数》，奇门遁甲采时家转盘拆补法，六爻纳甲依《增删卜易》通行法。<br>所出断语为传统文化推演，非科学预测，仅供参详与自省，勿据以决大事、代医疗。</p>';
  }

  /* ==========================================================
     设置弹层
     ========================================================== */
  function openSettings() {
    var s = S.settings;
    var html = ''
      + '<h3>设 置</h3>'
      + '<p class="sheet-sub">演算细则</p>'
      + '<div class="opt"><div class="o-t"><b>晚子时计次日</b><span>23:00–23:59 起课，农历日进一位。传统多从此法。</span></div>'
      + '<button class="switch ' + (s.lateZi ? 'on' : '') + '" data-k="lateZi"></button></div>'
      + '<div class="opt"><div class="o-t"><b>掐指音效</b><span>循宫时轻声一点，助凝神。</span></div>'
      + '<button class="switch ' + (s.sound ? 'on' : '') + '" data-k="sound"></button></div>'
      + '<div class="opt"><div class="o-t"><b>触感反馈</b><span>支持的设备上，循宫时轻微震动。</span></div>'
      + '<button class="switch ' + (s.haptic ? 'on' : '') + '" data-k="haptic"></button></div>'
      + '<button class="danger-btn" id="clearAll">清空全部课录（' + S.history.length + ' 条）</button>';
    openSheet(null, null, html);

    $$('#sheet .switch').forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-k');
        S.settings[k] = !S.settings[k];
        b.classList.toggle('on', S.settings[k]);
        saveStore();
        if (k === 'lateZi') updateTimeDisplay();
      };
    });
    $('#clearAll').onclick = function () {
      if (!S.history.length) { toast('课录已是空的'); return; }
      S.history = [];
      saveStore();
      closeSheet();
      if (S.page === 'history') renderPage();
      toast('课录已清空');
    };
  }

  /* ---------------- 弹层控制 ---------------- */
  function openSheet(title, sub, body) {
    var sheet = $('#sheet');
    var inner = (title ? '<div class="grab"></div><h3>' + title + '</h3>' + (sub ? '<p class="sheet-sub">' + esc(sub) + '</p>' : '') : '<div class="grab"></div>')
      + body;
    sheet.innerHTML = inner;
    sheet.classList.add('on');
    $('#mask').classList.add('on');
  }
  function closeSheet() {
    $('#sheet').classList.remove('on');
    $('#mask').classList.remove('on');
  }
  $('#mask').addEventListener('click', closeSheet);

  // 弹层内下拖关闭
  (function () {
    var sheet = $('#sheet'), sy = 0, dy = 0, dragging = false;
    sheet.addEventListener('touchstart', function (e) {
      if (sheet.scrollTop > 2) return;
      sy = e.touches[0].clientY; dragging = true; dy = 0;
      sheet.style.transition = 'none';
    }, { passive: true });
    sheet.addEventListener('touchmove', function (e) {
      if (!dragging) return;
      dy = e.touches[0].clientY - sy;
      if (dy > 0) sheet.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: true });
    sheet.addEventListener('touchend', function () {
      if (!dragging) return;
      dragging = false;
      sheet.style.transition = '';
      sheet.style.transform = '';
      if (dy > 90) closeSheet();
    });
  })();

  /* ==========================================================
     路由
     ========================================================== */
  function renderPage() {
    var view = $('#view');
    if (S.page === 'cast') {
      if (S.art === 'meihua') { renderMeihuaPage(); gotoBottomFix(); return; }
      if (S.art === 'qimen') { renderQimenPage(); gotoBottomFix(); return; }
      if (S.art === 'liuyao') { renderLiuyaoPage(); gotoBottomFix(); return; }
      view.innerHTML = castPageHTML();
      setSubtitle();
      $$('#segMethod button').forEach(function (b) {
        b.classList.toggle('on', b.getAttribute('data-m') === S.method);
        b.onclick = function () {
          if (S.method === b.getAttribute('data-m')) return;
          S.method = b.getAttribute('data-m');
          $$('#segMethod button').forEach(function (x) { x.classList.toggle('on', x === b); });
          S.question = '';
          renderMethodPanel();
          $('#resultBox').innerHTML = '';
          setSubtitle();
        };
      });
      renderMethodPanel();
    } else if (S.page === 'history') {
      view.innerHTML = historyPageHTML();
      setSubtitle('课 录');
      $$('.rec').forEach(function (el) {
        el.onclick = function () { openRecord(el.getAttribute('data-id')); };
      });
    } else {
      view.innerHTML = methodsPageHTML();
      setSubtitle('术 法');
      bindMethodCards();
    }
    $$('.tab').forEach(function (t) { t.classList.toggle('on', t.getAttribute('data-page') === S.page); });
  }

  function gotoBottomFix() {
    $$('.tab').forEach(function (t) { t.classList.toggle('on', t.getAttribute('data-page') === S.page); });
  }

  $$('.tab').forEach(function (t) {
    t.onclick = function () {
      var p = t.getAttribute('data-page');
      if (p === S.page) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      S.page = p;
      window.scrollTo(0, 0);
      renderPage();
    };
  });

  $('#btnSettings').onclick = openSettings;

  /* ---------------- 术语点击（委托，覆盖结果与弹层） ---------------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('.term[data-term], .gl-item[data-term]') : null;
    if (el) {
      e.preventDefault();
      openTerm(el.getAttribute('data-term'));
      return;
    }
    if (e.target.closest && e.target.closest('#openGlossary')) {
      e.preventDefault();
      openGlossary();
      return;
    }
    if (e.target.closest && e.target.closest('#openCmp')) {
      e.preventDefault();
      if (lastQmRes) openCompass(lastQmRes);
    }
  });

  /* ---------------- 启动 ---------------- */
  loadStore();
  renderPage();
  setInterval(function () {
    if (S.page !== 'cast') return;
    if (S.art === 'meihua') {
      if (S.mhMethod === 'time' && !S.mhManual) updateMhTime();
    } else if (S.method === 'time' && !S.manual) {
      updateTimeDisplay();
    }
  }, 20000);

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

})();
