// 学习/复习状态机 - 移植自 words_plugin 的 StudyPage/ReviewPage/HomePage 交互。
// 原插件把调度算法编译进了 libwords_plugin.so（无源码），这里按原 QML 可见行为与用户口述规则重建：
//   - 学习阶段：先选「认识 / 不认识」，露出释义后再点「继续」提交（原 QML 双段式）。
//   - 提交后：认识 -> 本次会话内需答对 2 次；不认识 -> 需答对 4 次（用户口述规则）。
//     未达标就把该词随机插回剩余队列，达标则移出队列。
//   - 兜底：同一个词在本次会话内最多出现 target + 3 次，避免一直选错导致会话无法结束。
//   - 巩固阶段：四选一，答对 850ms 后自动进入下一题，答错标红并留在本题继续点。
//   - 复习模式：0 混合（英选中）/ 1 中选英 / 2 英选中，与 HomePage 的三个模式 chip 对应。
//   - 统计：今日学习 / 今日复习 / 连续天数，按自然日重置；会话可持久化以便续学。

function shuffle(list) {
  var a = list.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

function dayKey(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function dayShiftKey(offset) {
  var d = new Date();
  d.setDate(d.getDate() + offset);
  return dayKey(d);
}

function stateFor(progress, id) {
  return progress[String(id)] || { box: 0, correct: 0, wrong: 0, seen: 0 };
}

// 认识 -> 2 次；不认识 -> 4 次
function targetFor(known) {
  return known ? 2 : 4;
}

export function createEngine(dicts, state, onSave) {
  if (!state.progressByDict || typeof state.progressByDict !== 'object') state.progressByDict = {};
  if (state.progress && Object.keys(state.progress).length && !state.progressByDict[state.dictId]) {
    state.progressByDict[state.dictId] = state.progress;
  }
  delete state.progress;
  if (!state.today || typeof state.today !== 'object') state.today = { date: '', learned: 0, reviewed: 0 };
  if (!state.streak || typeof state.streak !== 'object') state.streak = { days: 0, last: '' };
  if (typeof state.reviewMode !== 'number') state.reviewMode = 0;
  if (state.session === undefined) state.session = null;

  var e = {
    dicts: dicts,
    state: state,
    page: 'home',
    current: null,
    queue: [],
    index: 0,
    result: { correct: 0, wrong: 0 },
    currentChoices: null,
    dirCache: 0,
    dirForId: null,
    revealed: false,
    selectedRating: -1,
    wrongPicks: [],
    correctPick: -1,
    firstPick: -1,
    choicesFor: null,
    rounds: {},
    targets: {},
    seenCount: {}
  };

  e.dict = function () {
    return e.dicts.find(function (d) { return d.id === e.state.dictId; }) || e.dicts[0];
  };

  e.progress = function () {
    var id = e.dict().id;
    if (!e.state.progressByDict[id]) e.state.progressByDict[id] = {};
    return e.state.progressByDict[id];
  };

  e.learnedIn = function (dict) {
    var p = e.state.progressByDict[dict.id] || {};
    var n = 0;
    Object.keys(p).forEach(function (k) {
      if ((p[k].box || 0) >= 3) n++;
    });
    return n;
  };

  e.dictList = function () {
    return e.dicts.map(function (d) {
      return {
        id: d.id,
        name: d.name,
        description: d.description,
        wordCount: d.words.length,
        learnedCount: e.learnedIn(d),
        current: d.id === e.state.dictId,
        progress: d.words.length ? e.learnedIn(d) / d.words.length : 0
      };
    });
  };

  e.todayStats = function () {
    var t = e.state.today;
    var k = dayKey();
    if (t.date !== k) { t.date = k; t.learned = 0; t.reviewed = 0; }
    return { learned: t.learned, reviewed: t.reviewed };
  };

  e.stats = function () {
    var p = e.progress();
    var learned = 0;
    var due = 0;
    Object.keys(p).forEach(function (kk) {
      var box = p[kk].box || 0;
      if (box >= 3) learned++;
      if (box > 0 && box < 5) due++;
    });
    var t = e.todayStats();
    return {
      totalWords: e.dict().words.length,
      learned: learned,
      due: due,
      seen: Object.keys(p).length,
      todayLearned: t.learned,
      todayReviewed: t.reviewed,
      streakDays: e.state.streak.days || 0
    };
  };

  e.persist = function () { if (onSave) onSave(e.state); };

  e.bumpToday = function (kind) {
    var t = e.todayStats();
    if (kind === 'learned') t.learned++;
    else t.reviewed++;
    var s = e.state.streak;
    var k = dayKey();
    if (s.last !== k) {
      if (s.last === dayShiftKey(-1)) s.days = (s.days || 0) + 1;
      else s.days = 1;
      s.last = k;
    }
  };

  e.resetCard = function () {
    e.revealed = false;
    e.selectedRating = -1;
    e.wrongPicks = [];
    e.correctPick = -1;
    e.firstPick = -1;
    e.currentChoices = null;
    e.choicesFor = null;
    e.dirForId = null;
  };

  e.selectDict = function (id) {
    e.state.dictId = id;
    e.state.progressByDict[id] = e.state.progressByDict[id] || {};
    e.state.session = null;
    e.current = null;
    e.persist();
  };

  e.setReviewMode = function (v) {
    e.state.reviewMode = v;
    e.resetCard();
    e.persist();
  };

  e.pickQueue = function (filterFn) {
    var words = shuffle(e.dict().words);
    var p = e.progress();
    if (e.state.highDifficulty) {
      words.sort(function (a, b) {
        var wa = (p[String(a.id)] && p[String(a.id)].wrong) || 0;
        var wb = (p[String(b.id)] && p[String(b.id)].wrong) || 0;
        return wb - wa;
      });
    }
    var picked = words.filter(filterFn).slice(0, e.state.batchSize);
    if (!picked.length) picked = words.slice(0, e.state.batchSize);
    e.index = 0;
    e.result = { correct: 0, wrong: 0 };
    e.rounds = {};
    e.targets = {};
    e.seenCount = {};
    e.queue = picked;
    e.current = picked[0] || null;
    e.resetCard();
    return !!e.current;
  };

  e.startStudy = function () {
    var p = e.progress();
    var ok = e.pickQueue(function (w) {
      return !p[String(w.id)] || p[String(w.id)].box < 5;
    });
    e.page = 'study';
    e.state.session = null;
    e.saveSession();
    return ok;
  };

  e.startReview = function () {
    var p = e.progress();
    var ok = e.pickQueue(function (w) {
      return p[String(w.id)] && p[String(w.id)].box < 5;
    });
    e.page = 'review';
    e.state.session = null;
    e.saveSession();
    return ok;
  };

  // ---- 会话持久化（对应原 QML 的 hasUnfinishedSession / resumeSession）----
  e.saveSession = function () {
    if ((e.page === 'study' || e.page === 'review') && e.current) {
      e.state.session = {
        page: e.page,
        dictId: e.state.dictId,
        ids: e.queue.map(function (w) { return w.id; }),
        index: e.index,
        result: { correct: e.result.correct, wrong: e.result.wrong },
        rounds: e.rounds,
        targets: e.targets,
        seenCount: e.seenCount
      };
    } else {
      e.state.session = null;
    }
  };

  e.hasResume = function () {
    var s = e.state.session;
    return !!(s && s.ids && s.ids.length > (s.index || 0));
  };

  e.resumeSession = function () {
    var s = e.state.session;
    if (!s) return false;
    var byId = {};
    e.dict().words.forEach(function (w) { byId[String(w.id)] = w; });
    var words = [];
    (s.ids || []).forEach(function (id) {
      var w = byId[String(id)];
      if (w) words.push(w);
    });
    if (words.length <= (s.index || 0)) { e.state.session = null; e.persist(); return false; }
    e.page = s.page === 'review' ? 'review' : 'study';
    e.queue = words;
    e.index = s.index || 0;
    e.result = { correct: (s.result && s.result.correct) || 0, wrong: (s.result && s.result.wrong) || 0 };
    e.rounds = s.rounds || {};
    e.targets = s.targets || {};
    e.seenCount = s.seenCount || {};
    e.current = words[e.index] || null;
    e.resetCard();
    return !!e.current;
  };

  e.discardSession = function () {
    e.state.session = null;
    e.persist();
  };

  // 第一步：选「认识 / 不认识」，只记录并露出释义
  e.chooseStudyRating = function (rating) {
    if (!e.current || e.selectedRating >= 0) return;
    e.selectedRating = rating;
    e.revealed = true;
  };

  // 第二步：点「继续」提交，后端更新进度并按需把单词插回队列
  e.submitStudy = function () {
    if (!e.current || e.selectedRating < 0) return;
    var id = String(e.current.id);
    var p = e.progress();
    var s = stateFor(p, id);
    var known = e.selectedRating === 0;

    s.seen++;
    if (known) {
      s.correct++;
      s.box = Math.min(5, s.box + 1);
    } else {
      s.wrong++;
      s.box = 0;
    }
    p[id] = s;
    e.result[known ? 'correct' : 'wrong']++;
    e.bumpToday('learned');

    var target = e.targets[id] || targetFor(known);
    e.targets[id] = target;
    e.rounds[id] = known ? (e.rounds[id] || 0) + 1 : 0;
    e.seenCount[id] = (e.seenCount[id] || 0) + 1;

    var needsAgain = e.rounds[id] < target && e.seenCount[id] < target + 3;

    e.index++;
    if (needsAgain) {
      var span = e.queue.length - e.index + 1;
      var pos = e.index + Math.floor(Math.random() * Math.max(1, span));
      e.queue.splice(pos, 0, e.current);
    } else {
      delete e.targets[id];
      delete e.rounds[id];
    }

    e.current = e.queue[e.index] || null;
    e.resetCard();
    if (!e.current) {
      if (e.page === 'study' && e.startReviewFromStudy()) e.page = 'review';
      else e.page = 'summary';
    }
    e.saveSession();
    e.persist();
  };

  // 巩固阶段：四选一。已答对或已标红的选项不再响应。
  e.answer = function (idx) {
    if (!e.current || e.correctPick >= 0 || e.wrongPicks.indexOf(idx) >= 0) return false;
    var choices = e.choices();
    var ok = choices[idx] && choices[idx].id === e.current.id;

    if (e.firstPick < 0) {
      e.firstPick = idx;
      var p = e.progress();
      var s = stateFor(p, String(e.current.id));
      s.seen++;
      if (ok) {
        s.correct++;
        s.box = Math.min(5, s.box + 1);
      } else {
        s.wrong++;
        s.box = 0;
      }
      p[String(e.current.id)] = s;
      e.result[ok ? 'correct' : 'wrong']++;
      e.bumpToday('reviewed');
      e.persist();
    }

    if (ok) {
      e.correctPick = idx;
      return true;
    }
    e.wrongPicks.push(idx);
    return false;
  };

  // 学习阶段结束后进入巩固：用本次会话里出现过的词（去重）作为复习队列
  e.startReviewFromStudy = function () {
    var seen = {};
    var words = [];
    e.queue.forEach(function (w) {
      var k = String(w.id);
      if (!seen[k]) { seen[k] = 1; words.push(w); }
    });
    if (!words.length) return false;
    e.index = 0;
    e.rounds = {};
    e.targets = {};
    e.seenCount = {};
    e.queue = words;
    e.current = words[0];
    e.resetCard();
    return true;
  };

  e.advanceReview = function () {
    if (e.page !== 'review' || e.correctPick < 0) return;
    e.index++;
    e.current = e.queue[e.index] || null;
    e.resetCard();
    if (!e.current) e.page = 'summary';
    e.saveSession();
    e.persist();
  };

  // 复习方向：0 英选中（给单词选释义），1 中选英（给释义选单词）。混合模式下按卡片随机。
  e.direction = function () {
    if (!e.current) return 0;
    var k = e.current.id + '#' + e.index;
    if (e.dirForId !== k) {
      var m = e.state.reviewMode;
      e.dirCache = m === 1 ? 1 : (m === 2 ? 0 : (Math.random() < 0.5 ? 1 : 0));
      e.dirForId = k;
    }
    return e.dirCache;
  };

  // 选项只在进入新卡片时生成一次并缓存，避免每次调用都重新洗牌（会导致点到的项与实际显示不一致）
  e.choices = function () {
    if (!e.current) return [];
    if (e.choicesFor !== e.current.id) {
      var all = e.dict().words.filter(function (w) { return w.id !== e.current.id; });
      e.currentChoices = shuffle([e.current].concat(shuffle(all).slice(0, 3)));
      e.choicesFor = e.current.id;
    }
    return e.currentChoices;
  };

  e.home = function () {
    e.page = 'home';
    e.current = null;
    e.state.session = null;
    e.resetCard();
    e.persist();
  };

  return e;
}
