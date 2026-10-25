// 全局状态存储（storage.getGlobalStorage / storage.setGlobalStorage，兜底 $fs.storage）
// 存盘结构会在加载时做一次归一，兼容旧版本字段（progress 单层 map、reviewMode 字符串）。

var KEY = 'words_penos_state_v1';
var memory = null;

function api() {
  try { return typeof $falcon !== 'undefined' && $falcon.jsapi ? $falcon.jsapi : null; } catch (e) { return null; }
}

function defaults() {
  return {
    dictId: 'cet4',
    batchSize: 10,
    reviewMode: 0,
    highDifficulty: false,
    progressByDict: {},
    today: { date: '', learned: 0, reviewed: 0 },
    streak: { days: 0, last: '' },
    session: null
  };
}

function parse(v) {
  try { return typeof v === 'string' ? JSON.parse(v) : v; } catch (e) { return null; }
}

function merge(saved) {
  var out = defaults();
  if (!saved || typeof saved !== 'object') return out;
  Object.keys(saved).forEach(function (k) {
    if (saved[k] !== undefined && saved[k] !== null) out[k] = saved[k];
  });
  if (typeof out.reviewMode !== 'number') out.reviewMode = 0;
  if (!out.progressByDict || typeof out.progressByDict !== 'object') out.progressByDict = {};
  if (out.progress && typeof out.progress === 'object') {
    var prev = out.progressByDict[out.dictId] || {};
    Object.keys(out.progress).forEach(function (k) { prev[k] = out.progress[k]; });
    out.progressByDict[out.dictId] = prev;
    delete out.progress;
  }
  if (!out.today || typeof out.today !== 'object') out.today = { date: '', learned: 0, reviewed: 0 };
  if (!out.streak || typeof out.streak !== 'object') out.streak = { days: 0, last: '' };
  if (typeof out.batchSize !== 'number') out.batchSize = 10;
  return out;
}

export function init(cb) {
  var j = api();
  var get = j && j['storage.getGlobalStorage'];
  if (typeof get === 'function') {
    try {
      get({ key: KEY }, function (r) {
        memory = merge(parse(r && r.data));
        cb(memory);
      });
      return;
    } catch (e) {}
  }
  try {
    var r = typeof $fs !== 'undefined' && $fs.storage ? $fs.storage.get({ key: KEY }) : null;
    memory = merge(parse(r && r.data));
  } catch (e2) {
    memory = defaults();
  }
  cb(memory);
}

export function save(state) {
  memory = state;
  var data = JSON.stringify(state);
  var j = api();
  var set = j && j['storage.setGlobalStorage'];
  if (typeof set === 'function') {
    try { set({ key: KEY, data: data }); return; } catch (e) {}
  }
  try {
    if (typeof $fs !== 'undefined' && $fs.storage) $fs.storage.set({ key: KEY, data: data });
  } catch (e2) {}
}
