/**
 * profile.js — 设备 profile 与视口解析
 *
 * 实测来源：penosapp/profiles/youdao-YDP726-buildroot2021.11.md
 *   - $falcon.env 给出 936x280（横条屏，direction 270）
 *   - 物理 280x936；逻辑 936x280
 *
 * 规则：优先运行时探测，兜底值只作最后防线；不写死几何。
 */

var FALLBACK = { width: 936, height: 280, source: 'fallback' };

export function resolveViewport() {
  var chains = [
    function () { return (typeof $falcon !== 'undefined') ? $falcon.env : null; },
    function () { return (typeof $fs !== 'undefined') ? $fs.env : null; }
  ];
  for (var i = 0; i < chains.length; i++) {
    try {
      var env = chains[i]();
      if (!env) continue;
      var w = env.deviceWidth || env.width || 0;
      var h = env.deviceHeight || env.height || 0;
      if (w > 0 && h > 0) {
        return { width: w, height: h, source: i === 0 ? 'falcon.env' : 'fs.env' };
      }
    } catch (e) {}
  }
  return { width: FALLBACK.width, height: FALLBACK.height, source: FALLBACK.source };
}

/** 设置 Falcon 视口。在 App.onLaunch 中调用一次；多级降级。 */
export function applyViewport(viewport) {
  var v = viewport || resolveViewport();
  var ok = false;
  try {
    if (typeof $falcon !== 'undefined' && $falcon.jsapi && $falcon.jsapi.setViewPort) {
      $falcon.jsapi.setViewPort(v.width, v.height);
      ok = true;
    }
  } catch (e) {}
  if (!ok) {
    try {
      if (typeof $falcon !== 'undefined' && $falcon.setViewPort) {
        $falcon.setViewPort(v.width, v.height);
        ok = true;
      }
    } catch (e2) {}
  }
  if (!ok) {
    try {
      if (typeof $fs !== 'undefined' && $fs.setViewPort) {
        $fs.setViewPort(v.width, v.height);
        ok = true;
      }
    } catch (e3) {}
  }
  return { ok: ok, width: v.width, height: v.height, source: v.source };
}

export default { resolveViewport: resolveViewport, applyViewport: applyViewport };
