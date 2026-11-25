/* ==========================================================
   compass.js — 手机罗盘
   优先用磁力计（iOS: webkitCompassHeading / Android: absolute alpha）
   无传感器或未授权时，退回手动拖动模式
   ========================================================== */
(function (global) {
  'use strict';

  var SMOOTH = 0.20;          // 低通滤波系数（越小越稳、越迟钝）
  var SMOOTH_FAST = 0.55;     // 大幅转动时的系数（更跟手）
  var FAST_DEG = 28;          // 超过此偏差视为大幅转动

  var st = {
    heading: 0,
    active: false,
    manual: false,
    source: 'none',           // ios | android-abs | relative | manual
    supported: typeof global.DeviceOrientationEvent !== 'undefined'
  };

  var subs = [];
  var smooth = null;
  var bound = false;
  var usingAbs = false;

  function norm(d) { var r = d % 360; return r < 0 ? r + 360 : r; }
  function emit() { for (var i = 0; i < subs.length; i++) subs[i](st.heading, st); }

  function needPermission() {
    return st.supported
      && typeof global.DeviceOrientationEvent !== 'undefined'
      && typeof global.DeviceOrientationEvent.requestPermission === 'function';
  }

  function handle(e) {
    var h = null, src = '';

    // iOS：方位角已折算为 0=正北、顺时针
    if (typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading)
        && e.webkitCompassHeading >= 0) {
      h = e.webkitCompassHeading;
      src = 'ios';
    } else if (typeof e.alpha === 'number' && !isNaN(e.alpha)) {
      // 已有绝对来源时，忽略相对事件以免抖动
      if (usingAbs && !e.absolute) return;
      if (e.absolute) usingAbs = true;
      h = norm(360 - e.alpha);
      src = e.absolute ? 'android-abs' : 'relative';
    }

    if (h === null) return;

    if (smooth === null) smooth = h;
    else {
      var d = h - smooth;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      // 偏差大时快速追上，偏差小时平滑稳定，避免抖动
      var k = Math.abs(d) > FAST_DEG ? SMOOTH_FAST : SMOOTH;
      smooth = norm(smooth + d * k);
    }

    st.heading = smooth;
    st.manual = false;
    st.source = src;
    emit();
  }

  function bind() {
    if (bound) return;
    bound = true;
    global.addEventListener('deviceorientationabsolute', handle, true);
    global.addEventListener('deviceorientation', handle, true);
  }
  function unbind() {
    if (!bound) return;
    bound = false;
    global.removeEventListener('deviceorientationabsolute', handle, true);
    global.removeEventListener('deviceorientation', handle, true);
  }

  /**
   * 请求授权并开始监听。
   * 必须在用户手势（点击）中调用，iOS 才允许。
   * 返回 Promise<{ok, reason}>
   */
  function start() {
    if (!st.supported) {
      return Promise.resolve({ ok: false, reason: 'unsupported' });
    }
    if (needPermission()) {
      return global.DeviceOrientationEvent.requestPermission()
        .then(function (res) {
          if (res !== 'granted') return { ok: false, reason: 'denied' };
          bind();
          st.active = true;
          return { ok: true };
        })
        .catch(function () { return { ok: false, reason: 'error' }; });
    }
    bind();
    st.active = true;
    // 2 秒内收不到数据，视为无传感器
    return new Promise(function (resolve) {
      var t0 = st.heading;
      var got = false;
      function probe() { if (st.source !== 'none' && st.source !== 'manual') got = true; }
      var iv = setInterval(function () {
        probe();
        if (got) { clearInterval(iv); resolve({ ok: true }); }
      }, 200);
      setTimeout(function () {
        clearInterval(iv);
        resolve(got ? { ok: true } : { ok: false, reason: 'no-sensor' });
      }, 2200);
    });
  }

  function stop() {
    unbind();
    st.active = false;
  }

  /** 手动设定（拖动表盘时用） */
  function setManual(h) {
    st.heading = norm(h);
    st.manual = true;
    st.source = 'manual';
    smooth = st.heading;
    emit();
  }

  function on(cb) {
    subs.push(cb);
    cb(st.heading, st);
    return function () {
      var i = subs.indexOf(cb);
      if (i >= 0) subs.splice(i, 1);
    };
  }

  /** 目标方位相对当前朝向的偏角：正=向右转，负=向左转 */
  function deltaTo(target, heading) {
    var d = norm(target - heading);
    return d > 180 ? d - 360 : d;
  }

  global.Compass = {
    state: st,
    start: start,
    stop: stop,
    setManual: setManual,
    on: on,
    deltaTo: deltaTo,
    needPermission: needPermission,
    norm: norm
  };

})(window);
