/* ==========================================================
   lunar.js — 公历 ⇄ 农历 转换（1900–2100）
   仅暴露演算所需：农历月/日、干支年、时辰
   ========================================================== */
(function (global) {
  'use strict';

  // 每年一个 20bit 编码：14-16bit 闰月大小、4-15bit 各月大小、0-3bit 闰月月份
  var lunarInfo = [
    0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
    0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
    0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
    0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
    0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
    0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
    0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
    0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
    0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
    0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
    0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
    0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
    0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
    0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
    0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
    0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
    0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
    0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
    0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
    0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
    0x0d520
  ];

  var MONTH_CN = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
  var DAY_CN = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
                '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
                '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
  var SHICHEN = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var SHICHEN_RANGE = ['23:00–01:00','01:00–03:00','03:00–05:00','05:00–07:00','07:00–09:00','09:00–11:00',
                       '11:00–13:00','13:00–15:00','15:00–17:00','17:00–19:00','19:00–21:00','21:00–23:00'];
  var GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

  function leapMonth(y) { return lunarInfo[y - 1900] & 0xf; }
  function leapDays(y) {
    if (!leapMonth(y)) return 0;
    return (lunarInfo[y - 1900] & 0x10000) ? 30 : 29;
  }
  function monthDays(y, m) {
    return (lunarInfo[y - 1900] & (0x10000 >> m)) ? 30 : 29;
  }
  function yearDays(y) {
    var sum = 348;
    for (var i = 0x8000; i > 0x8; i >>= 1) sum += (lunarInfo[y - 1900] & i) ? 1 : 0;
    return sum + leapDays(y);
  }

  /** 公历 → 农历 */
  function solar2lunar(y, m, d) {
    if (y < 1900 || y > 2100) return null;
    var base = Date.UTC(1900, 0, 31);
    var offset = Math.floor((Date.UTC(y, m - 1, d) - base) / 86400000);
    if (offset < 0) return null;

    var ly = 1900, temp = 0;
    for (; ly < 2101 && offset > 0; ly++) { temp = yearDays(ly); offset -= temp; }
    if (offset < 0) { offset += temp; ly--; }

    var leap = leapMonth(ly);
    var isLeap = false, lm = 1, days;
    for (lm = 1; lm < 13 && offset > 0; lm++) {
      if (leap > 0 && lm === leap + 1 && !isLeap) {
        --lm; isLeap = true; days = leapDays(ly);
      } else {
        days = monthDays(ly, lm);
      }
      if (isLeap && lm === leap + 1) isLeap = false;
      offset -= days;
    }
    if (offset === 0 && leap > 0 && lm === leap + 1) {
      if (isLeap) { isLeap = false; } else { isLeap = true; --lm; }
    }
    if (offset < 0) {
      offset += (isLeap ? leapDays(ly) : monthDays(ly, --lm));
    }
    return { y: ly, m: lm, d: offset + 1, isLeap: isLeap };
  }

  /** 时辰序号 1–12（子=1 … 亥=12）。23:00 起为子时 */
  function shichenIndex(hour) {
    return Math.floor(((hour + 1) % 24) / 2) + 1;
  }

  /** 干支纪年（以农历春节换年） */
  function ganzhiYear(y) {
    var n = ((y - 4) % 60 + 60) % 60;
    return GAN[n % 10] + ZHI[n % 12];
  }

  function lunarMonthName(m, isLeap) {
    return (isLeap ? '闰' : '') + MONTH_CN[m - 1] + '月';
  }
  function lunarDayName(d) { return DAY_CN[d - 1]; }

  /**
   * 由公历时间得到完整起课依据
   * opts.lateZi === true 时，23:00–23:59 记为次日（晚子时）
   */
  function fromDate(date, opts) {
    opts = opts || {};
    var y = date.getFullYear(), mo = date.getMonth() + 1, d = date.getDate();
    var h = date.getHours(), mi = date.getMinutes();
    var sc = shichenIndex(h);

    var calDate = new Date(y, mo - 1, d, h, mi);
    var shifted = false;
    if (opts.lateZi && h === 23) {
      calDate = new Date(y, mo - 1, d + 1, h, mi);
      shifted = true;
    }
    var l = solar2lunar(calDate.getFullYear(), calDate.getMonth() + 1, calDate.getDate());
    if (!l) return null;

    return {
      solar: { y: y, m: mo, d: d, h: h, mi: mi },
      lunar: l,
      month: l.m,
      day: l.d,
      isLeap: l.isLeap,
      hour: sc,
      shichen: SHICHEN[sc - 1],
      shichenRange: SHICHEN_RANGE[sc - 1],
      ganzhi: ganzhiYear(l.y),
      shifted: shifted,
      monthName: lunarMonthName(l.m, l.isLeap),
      dayName: lunarDayName(l.d),
      text: ganzhiYear(l.y) + '年 ' + lunarMonthName(l.m, l.isLeap) + lunarDayName(l.d) + ' ' + SHICHEN[sc - 1] + '时'
    };
  }

  global.Lunar = {
    solar2lunar: solar2lunar,
    shichenIndex: shichenIndex,
    ganzhiYear: ganzhiYear,
    fromDate: fromDate,
    SHICHEN: SHICHEN,
    SHICHEN_RANGE: SHICHEN_RANGE,
    MONTH_CN: MONTH_CN,
    DAY_CN: DAY_CN,
    monthName: lunarMonthName,
    dayName: lunarDayName
  };
})(window);
