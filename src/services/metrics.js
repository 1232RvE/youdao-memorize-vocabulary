// metrics.js - 跨机型自适应单位
//
// 所有尺寸都按「屏幕短边」的百分比换算，不假设任何具体分辨率
// （本机 936x280，但同类词典笔有 854x320 / 1024x300 等不同屏幕）。
// base = min(width, height)；u(n) 返回短边的 n%。
// app.js 在 onLaunch 里把真实视口写进来，页面用 u(n) 生成内联样式。

var VP = { width: 0, height: 0 };
var FALLBACK = { width: 936, height: 280 };

export function setViewport(w, h) {
  if (w > 0 && h > 0) {
    VP.width = w;
    VP.height = h;
  }
}

export function viewport() {
  if (VP.width > 0 && VP.height > 0) return { width: VP.width, height: VP.height };
  return { width: FALLBACK.width, height: FALLBACK.height };
}

// 短边：横屏机上就是屏幕高度，竖屏机上就是宽度
export function base() {
  var v = viewport();
  return Math.min(v.width, v.height);
}

// u(n) = 短边的 n%，返回可直接赋给样式表的长度字符串
export function u(n) {
  return (base() * n / 100) + 'px';
}

// 常用排版样式工厂
export function text(n, extra) {
  var s = { fontSize: u(n) };
  if (extra) {
    Object.keys(extra).forEach(function (k) { s[k] = extra[k]; });
  }
  return s;
}

export default { setViewport: setViewport, viewport: viewport, base: base, u: u, text: text };
