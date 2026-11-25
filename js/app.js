/* ==========================================================
   app.js — 界面与交互
   ========================================================== */
(function () {
  'use strict';

  var P = window.LiuRenData.palaces;
  var META = window.LiuRenData.phaseMeta;
  var L = window.Lunar;
  var R = window.LiuRen;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var STORE = 'daoshu.v1';

  var S = {
    page: 'cast',
    method: 'time',
    manual: false,
    nums: ['', '', ''],
    question: '',
    manualVals: null,
    result: null,
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
    } catch (e) { /* 忽略 */ }
  }
  function saveStore() {
    try {
      localStorage.setItem(STORE, JSON.stringify({ history: S.history, settings: S.settings }));
    } catch (e) { /* 忽略 */ }
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
    var res = R.castFromCounts(h.counts);
    S.ts = h.ts;
    openSheet('课 录', fmtDate(h.ts),
      '<div>' + resultHTML(res, h.basis, h.q).replace('<div class="row-actions">', '<div class="row-actions" style="display:none">') + '</div>'
      + '<button class="danger-btn" id="delRec" style="margin-top:16px">删除此课</button>');
    var del = $('#delRec');
    if (del) del.onclick = function () {
      S.history = S.history.filter(function (x) { return x.id !== id; });
      saveStore();
      closeSheet();
      if (S.page === 'history') renderPage();
      toast('已删除');
    };
  }

  /* ==========================================================
     术法页
     ========================================================== */
  var METHODS = [
    { name: '小六壬', desc: '掐指神通。六宫轮转，三步断事，最便最速。', active: true, tag: '已开' },
    { name: '梅花易数', desc: '以数起卦，体用生克，观物取象。', tag: '筹备' },
    { name: '六爻纳甲', desc: '铜钱摇卦，装卦纳甲，六亲六神断吉凶。', tag: '筹备' },
    { name: '奇门遁甲', desc: '九宫八门，时家起局，择时择方。', tag: '筹备' },
    { name: '太乙神数', desc: '三式之首，推演国运岁计。', tag: '筹备' },
    { name: '诸葛神数', desc: '三字数定签，占断人事。', tag: '筹备' }
  ];

  function methodsPageHTML() {
    var grid = METHODS.map(function (m) {
      return '<div class="mcard ' + (m.active ? 'active' : 'locked') + '">'
        + '<div class="m-tag">' + m.tag + '</div>'
        + '<div class="m-name">' + m.name + '</div>'
        + '<div class="m-desc">' + m.desc + '</div>'
        + '</div>';
    }).join('');

    return ''
      + '<div class="section-title">术 法</div>'
      + '<div class="mgrid">' + grid + '</div>'

      + '<div class="section-title">小 六 壬 法 要</div>'
      + '<div class="card">'
      + '  <p class="meaning" style="font-size:12.5px">六宫次序，顺行不逆：<span style="color:var(--gold-hi)">大安 → 留连 → 速喜 → 赤口 → 小吉 → 空亡</span>，至空亡复归大安。</p>'
      + '  <div class="items" style="margin-top:12px">'
      + '    <div class="item"><div class="k">时间课</div><div class="v">大安起正月，顺数至当月；月宫起初一，顺数至当日；日宫起子时，顺数至当下时辰。所落之宫，即断。三步者，天时、地利、人和也。</div></div>'
      + '    <div class="item"><div class="k">报数课</div><div class="v">心中默事，随口报数。一数落天时，二数落地利，三数落人和；单数直断，两数首尾并参。</div></div>'
      + '    <div class="item"><div class="k">取用</div><div class="v">以末宫（人和）定成败，以首宫观起因；三宫皆宜则事顺，首尾相克则先难后易或先吉后凶。</div></div>'
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

      + '<p class="foot-note">小六壬属道家民间掌诀，历代口诀流派互有出入，本作采通行本。<br>所出断语为传统文化推演，非科学预测，仅供参详与自省，勿据以决大事、代医疗。</p>';
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
    }
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

  /* ---------------- 启动 ---------------- */
  loadStore();
  renderPage();
  setInterval(function () {
    if (S.page === 'cast' && S.method === 'time' && !S.manual) updateTimeDisplay();
  }, 20000);

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

})();
