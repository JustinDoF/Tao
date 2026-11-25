/* ==========================================================
   qimen.js — 奇门遁甲 时家·转盘·拆补法 排盘
   一、太阳黄经 → 节气 / 元
   二、干支纪日纪时
   三、地盘三奇六仪
   四、值符值使 → 天盘九星、八门、八神
   ========================================================== */
(function (global) {
  'use strict';

  var D = global.QimenData;
  var GAN = D.gan, ZHI = D.zhi;

  var D2R = Math.PI / 180;

  /* ========== 一、天文：太阳视黄经 ========== */
  function sunLongitude(jd) {
    var T = (jd - 2451545.0) / 36525;
    var L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    var M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    var Mr = M * D2R;
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
      + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
      + 0.000289 * Math.sin(3 * Mr);
    var trueLong = L0 + C;
    var omega = 125.04 - 1934.136 * T;
    var lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * D2R);
    return ((lambda % 360) + 360) % 360;
  }

  /** 公历 → 儒略日（含小数） */
  function toJD(d) {
    var y = d.getFullYear(), m = d.getMonth() + 1;
    var day = d.getDate() + (d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600) / 24;
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
  }

  /** 由儒略日反推北京时间（UTC+8） */
  function jdToDate(jd) {
    var z = Math.floor(jd + 0.5 + 8 / 24); // 先转东八区
    var f = jd + 0.5 + 8 / 24 - z;
    var alpha = Math.floor((z - 1867216.25) / 36524.25);
    var A = z + 1 + alpha - Math.floor(alpha / 4);
    var B = A + 1524;
    var C = Math.floor((B - 122.1) / 365.25);
    var Dd = Math.floor(365.25 * C);
    var E = Math.floor((B - Dd) / 30.6001);
    var day = B - Dd - Math.floor(30.6001 * E) + f;
    var month = E < 14 ? E - 1 : E - 13;
    var year = month > 2 ? C - 4716 : C - 4715;
    var di = Math.floor(day);
    var frac = day - di;
    var hh = frac * 24;
    var mi = (hh - Math.floor(hh)) * 60;
    return new Date(year, month - 1, di, Math.floor(hh), Math.round(mi));
  }

  /** 某时刻的节气索引与名称 */
  function termOf(date) {
    var lon = sunLongitude(toJD(date));
    var idx = Math.floor(lon / 15) % 24;
    return { idx: idx, name: D.termByIdx[idx], lon: lon, yang: D.isYang(idx) };
  }

  /** 求指定黄经对应的北京时间（用于显示节气交接） */
  function solveLongitude(target, guessDate) {
    var lo = toJD(guessDate) - 20, hi = toJD(guessDate) + 20;
    function f(jd) {
      var d = sunLongitude(jd) - target;
      while (d > 180) d -= 360;
      while (d < -180) d += 360;
      return d;
    }
    if (f(lo) * f(hi) > 0) return null;
    for (var i = 0; i < 60; i++) {
      var mid = (lo + hi) / 2;
      if (f(lo) * f(mid) <= 0) hi = mid; else lo = mid;
    }
    return jdToDate((lo + hi) / 2);
  }

  /* ========== 二、干支 ========== */
  /** 日干支序（0=甲子）。锚点：2000-01-01 为戊午日（序 54） */
  function dayGanzhiIndex(date) {
    var jd = Math.floor(toJD(date) + 0.5); // 当地正午所在 JDN
    return ((54 + (jd - 2451545)) % 60 + 60) % 60;
  }

  /** 时干支序；时支按 23:00 起子时 */
  function hourGanzhiIndex(date, dayIdx) {
    var h = date.getHours();
    var zhiIdx = Math.floor(((h + 1) % 24) / 2); // 0=子
    var dayGan = dayIdx % 10;
    var hourGan = ((dayGan % 5) * 2 + zhiIdx) % 10;
    var n = zhiIdx;
    while (n % 10 !== hourGan) n += 12;
    return n;
  }

  function gz(n) { return GAN[n % 10] + ZHI[n % 12]; }

  /* ========== 三、排盘 ========== */
  function cast(date) {
    date = date || new Date();

    var term = termOf(date);
    var dayIdx = dayGanzhiIndex(date);
    var hourIdx = hourGanzhiIndex(date, dayIdx);

    // 符头：向前找最近的甲/己日（至多 4 天）
    var futouDayIdx = dayIdx;
    var back = 0;
    for (var i = 0; i < 5; i++) {
      var d = new Date(date.getFullYear(), date.getMonth(), date.getDate() - i, 12);
      var idx = dayGanzhiIndex(d);
      if (idx % 10 === 0 || idx % 10 === 5) { futouDayIdx = idx; back = i; break; }
    }
    var futouZhi = ZHI[futouDayIdx % 12];
    var yuan = D.yuanByZhi[futouZhi];
    var ju = D.juTable[term.name][yuan];
    var yang = term.yang;

    // ---- 地盘三奇六仪 ----
    var diPan = {};   // 宫 → 干
    var ganPalace = {}; // 干 → 宫
    for (var k = 0; k < 9; k++) {
      var p = yang
        ? ((ju - 1 + k) % 9) + 1
        : (((ju - 1 - k) % 9) + 9) % 9 + 1;
      diPan[p] = D.yiOrder[k];
      ganPalace[D.yiOrder[k]] = p;
    }

    // ---- 旬首 ----
    var xunStart = Math.floor(hourIdx / 10) * 10;
    var xunName = '甲' + ZHI[xunStart % 12];
    var xunYi = D.xunYi[xunName];
    var xunPalace = ganPalace[xunYi];       // 旬首仪所落之宫 = 值符原宫

    // ---- 值符星 / 值使门 ----
    // 中五宫寄坤二，故五宫值符取天芮（天禽随天芮同宫）
    var qinJi = xunPalace === 5; // 值符原宫在中五
    var zhiFuStar = D.palaces[qinJi ? 2 : xunPalace].star;
    var zhiShiDoor = D.palaces[qinJi ? 2 : xunPalace].door || '死门';

    // ---- 天盘：值符加时干 ----
    var hourGan = GAN[hourIdx % 10];
    var targetYi = hourGan === '甲' ? xunYi : hourGan;
    var targetPalace = ganPalace[targetYi] || xunPalace;

    // 中五宫寄坤二
    function ringOf(p) { return p === 5 ? 2 : p; }
    var tgtRing = ringOf(targetPalace);
    var baseRing = ringOf(xunPalace);
    var baseStarIdx = D.ring.indexOf(baseRing);
    var tgtRingIdx = D.ring.indexOf(tgtRing);
    var rot = tgtRingIdx - baseStarIdx;

    var tianPan = {};   // 宫 → 星
    var tianGan = {};   // 宫 → 天盘干
    for (var s = 0; s < 8; s++) {
      var toRingIdx = ((s + rot) % 8 + 8) % 8;
      var toPalace = D.ring[toRingIdx];
      var star = D.ringStars[s];
      tianPan[toPalace] = star;
      // 天盘干 = 该星本位宫的地盘干
      tianGan[toPalace] = diPan[D.ring[s]];
    }

    // ---- 八门：值使门起，阳顺阴逆数至时支 ----
    var hz = hourIdx % 12;             // 时支序，子=0
    var steps = hz;                    // 从子起数，子为起点不动
    var zsPalace = xunPalace;
    for (var m = 0; m < steps; m++) {
      zsPalace = yang
        ? (zsPalace % 9) + 1
        : ((zsPalace - 2 + 9) % 9) + 1;
    }
    if (zsPalace === 5) zsPalace = 2;  // 寄坤二

    var doorPan = {};  // 宫 → 门
    var doorStart = D.doorOrder.indexOf(zhiShiDoor);
    var zsRingIdx = D.ring.indexOf(zsPalace);
    for (var dI = 0; dI < 8; dI++) {
      var door = D.doorOrder[(doorStart + dI) % 8];
      doorPan[D.ring[(zsRingIdx + dI) % 8]] = door;
    }

    // ---- 八神：值符起，阳顺阴逆 ----
    var godPan = {};
    var godStart = D.ring.indexOf(ringOf(targetPalace));
    for (var g = 0; g < 8; g++) {
      var god = D.godOrder[g];
      var step = yang ? g : -g;
      godPan[D.ring[((godStart + step) % 8 + 8) % 8]] = god;
    }

    // ---- 组装九宫 ----
    // 天禽寄坤二宫，随天芮而行：天芮所在之宫并书「天芮·天禽」
    var ruiPalace = null;
    for (var rp = 1; rp <= 9; rp++) if (tianPan[rp] === '天芮') ruiPalace = rp;

    var cells = {};
    for (var c = 1; c <= 9; c++) {
      var starName = tianPan[c] || '';
      if (c === ruiPalace) starName = '天芮·天禽';
      cells[c] = {
        n: c,
        info: D.palaces[c],
        god: godPan[c] || '',
        star: starName,
        door: doorPan[c] || '',
        gan: diPan[c] || '',
        tianGan: tianGan[c] || ''
      };
    }
    // 中五宫无门无星无神，只列地盘干
    cells[5].god = '';
    cells[5].star = '';
    cells[5].door = '';
    cells[5].tianGan = '';

    // ---- 中五宫寄坤二宫：其地盘干随寄，坤二宫并书 ----
    var jiGan = diPan[5];
    cells[2].jiGan = jiGan;
    cells[5].jiTo = 2;

    // ---- 三吉门方位 ----
    var goodDoors = [];
    D.goodDoors.forEach(function (nm) {
      for (var p = 1; p <= 9; p++) {
        if (doorPan[p] === nm) {
          goodDoors.push({ door: nm, palace: p, dir: D.palaces[p].dir, gua: D.palaces[p].gua });
        }
      }
    });

    // 值符方位
    var zhiFuCell = null;
    for (var p2 = 1; p2 <= 9; p2++) if (godPan[p2] === '值符') zhiFuCell = p2;

    return {
      date: date,
      term: term,
      ju: ju,
      yang: yang,
      yuan: yuan,
      yuanName: D.yuanName[yuan],
      futou: gz(futouDayIdx),
      futouBack: back,
      dayGz: gz(dayIdx),
      hourGz: gz(hourIdx),
      xun: xunName,
      xunYi: xunYi,
      xunPalace: xunPalace,
      zhiFuStar: zhiFuStar,
      zhiFuQinJi: qinJi,
      zhiShiDoor: zhiShiDoor,
      targetPalace: targetPalace,
      hourGan: hourGan,
      cells: cells,
      goodDoors: goodDoors,
      zhiFuPalace: zhiFuCell,
      juText: (yang ? '阳遁' : '阴遁') + ['一', '二', '三', '四', '五', '六', '七', '八', '九'][ju - 1] + '局'
    };
  }

  global.Qimen = {
    cast: cast,
    sunLongitude: sunLongitude,
    toJD: toJD,
    jdToDate: jdToDate,
    termOf: termOf,
    solveLongitude: solveLongitude,
    dayGanzhiIndex: dayGanzhiIndex,
    hourGanzhiIndex: hourGanzhiIndex,
    gz: gz
  };

})(window);
