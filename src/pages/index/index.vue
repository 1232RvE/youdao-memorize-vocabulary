<template>
  <view class="app">
    <view class="topbar">
      <view v-if="showBack" class="back-wrap" @touchstart="onDown('back')" @touchend="onUp('back', goHome)" @touchcancel="onCancel">
        <image class="back-icon" src="assets/back.png" resize="contain" />
      </view>
      <text class="title">背单词</text>
      <view v-if="page === 'home'" class="dict-wrap" @touchstart="onDown('dict')" @touchend="onUp('dict', openDict)" @touchcancel="onCancel">
        <text class="dict">{{ currentDict.name }}</text>
        <text class="dict-caret">V</text>
      </view>
      <text v-else class="topbar-right">{{ topbarRight }}</text>
    </view>

    <scroller v-if="ready && page === 'home'" class="body-scroll" scroll-direction="vertical">
      <view class="body">
        <view class="hero">
          <text class="hero-title">{{ greeting }}</text>
          <text class="hero-sub">连续 {{ stats.streakDays }} 天 · 累计掌握 {{ stats.learned }} 词</text>
        </view>

        <view class="stats">
          <view class="stat"><text class="stat-num">{{ stats.todayLearned }}</text><text class="stat-label">今日学习</text></view>
          <view class="stat"><text class="stat-num amber">{{ stats.todayReviewed }}</text><text class="stat-label">今日复习</text></view>
          <view class="stat"><text class="stat-num accent">{{ stats.due }}</text><text class="stat-label">待复习</text></view>
          <view class="stat stat-last"><text class="stat-num green">{{ stats.learned }}</text><text class="stat-label">已掌握</text></view>
        </view>

        <view class="actions">
          <view :class="isDown('study') ? 'primary pressed' : 'primary'" @touchstart="onDown('study')" @touchend="onUp('study', beginStudy)" @touchcancel="onCancel">
            <text class="button-text">开始学习</text>
          </view>
          <view :class="isDown('review') ? 'secondary pressed' : 'secondary'" @touchstart="onDown('review')" @touchend="onUp('review', beginReview)" @touchcancel="onCancel">
            <text class="button-text">{{ stats.due > 0 ? '开始复习' : '随机复习' }}</text>
          </view>
        </view>

        <view class="settings">
          <text class="section-label">学习设置</text>
          <view class="setting-row">
            <text class="setting-label">每轮词数</text>
            <view class="chips">
              <view :class="chipClass(5)" @touchstart="onDown('b5')" @touchend="tapBatch(5)" @touchcancel="onCancel"><text class="chip-text">5</text></view>
              <view :class="chipClass(10)" @touchstart="onDown('b10')" @touchend="tapBatch(10)" @touchcancel="onCancel"><text class="chip-text">10</text></view>
              <view :class="chipClass(15)" @touchstart="onDown('b15')" @touchend="tapBatch(15)" @touchcancel="onCancel"><text class="chip-text">15</text></view>
              <view :class="chipClass(20)" @touchstart="onDown('b20')" @touchend="tapBatch(20)" @touchcancel="onCancel"><text class="chip-text">20</text></view>
            </view>
          </view>
          <view class="setting-row">
            <text class="setting-label">选择模式</text>
            <view class="chips">
              <view :class="modeClass(0)" @touchstart="onDown('m0')" @touchend="tapMode(0)" @touchcancel="onCancel"><text class="mode-text">混合</text></view>
              <view :class="modeClass(1)" @touchstart="onDown('m1')" @touchend="tapMode(1)" @touchcancel="onCancel"><text class="mode-text">中选英</text></view>
              <view :class="modeClass(2)" @touchstart="onDown('m2')" @touchend="tapMode(2)" @touchcancel="onCancel"><text class="mode-text">英选中</text></view>
            </view>
          </view>
          <view class="setting-row setting-row-last">
            <text class="setting-label">题目难度</text>
            <view :class="toggleClass()" @touchstart="onDown('hd')" @touchend="tapDifficulty" @touchcancel="onCancel">
              <text class="toggle-text">{{ state.highDifficulty ? '高难' : '普通' }}</text>
            </view>
          </view>
        </view>
        <view class="tail-pad"></view>
      </view>
    </scroller>

    <view v-else-if="page === 'resume'" class="resume-body">
      <view class="resume-card">
        <text class="resume-title">继续上次学习</text>
        <text class="resume-sub">检测到未完成的学习进度</text>
        <view :class="isDown('resume') ? 'resume-btn resume-btn-solid pressed' : 'resume-btn resume-btn-solid'" @touchstart="onDown('resume')" @touchend="onUp('resume', doResume)" @touchcancel="onCancel">
          <text class="resume-btn-text">继续学习</text>
        </view>
        <view :class="isDown('restart') ? 'resume-btn resume-btn-ghost pressed' : 'resume-btn resume-btn-ghost'" @touchstart="onDown('restart')" @touchend="onUp('restart', restartSession)" @touchcancel="onCancel">
          <text class="resume-btn-text">重新开始</text>
        </view>
      </view>
    </view>

    <scroller v-else-if="page === 'dicts'" class="body-scroll" scroll-direction="vertical">
      <view class="body">
        <text class="section-title">选择词库</text>
        <view v-for="d in dictList" :key="d.id" :class="d.current ? 'dict-card dict-card-active' : 'dict-card'" @click="chooseDict(d.id)">
          <view class="dict-main">
            <view class="dict-title-row">
              <text class="dict-name">{{ d.name }}</text>
              <text v-if="d.current" class="badge">当前</text>
            </view>
            <text class="dict-desc">{{ d.description }}</text>
            <view class="dict-track"><view class="dict-fill" :style="{ width: d.percent + '%' }"></view></view>
            <text class="dict-meta">已学 {{ d.learnedCount }} / {{ d.wordCount }}</text>
          </view>
        </view>
        <view class="tail-pad"></view>
      </view>
    </scroller>

    <view v-else-if="page === 'study' || page === 'review'" class="session">
      <view class="progress">
        <text class="progress-text">{{ progressIndex }} / {{ queueLength }}</text>
        <view class="track"><view class="fill" :style="{ width: progressPercent + '%' }"></view></view>
      </view>

      <view v-if="page === 'study'" class="word-panel">
        <text class="word">{{ current.word }}</text>
        <text v-if="current.phonetic" class="phonetic">/ {{ current.phonetic }} /</text>
        <view v-if="revealed" class="reveal-box">
          <text class="translation">{{ current.translation || current.definition }}</text>
        </view>
        <text class="hint">{{ hintText }}</text>
      </view>

      <view v-else class="word-panel">
        <text v-if="direction === 0" class="word">{{ current.word }}</text>
        <text v-if="direction === 0 && current.phonetic" class="phonetic">/ {{ current.phonetic }} /</text>
        <text v-if="direction === 1" class="prompt-cn">{{ current.translation || current.definition }}</text>
        <text class="hint">{{ hintText }}</text>
      </view>

      <view v-if="page === 'study' && !revealed" class="rating">
        <view :class="isDown('unknown') ? 'rate hard rate-left pressed' : 'rate hard rate-left'" @touchstart="onDown('unknown')" @touchend="onUp('unknown', chooseUnknown)" @touchcancel="onCancel">
          <text class="button-text">不认识</text>
        </view>
        <view :class="isDown('known') ? 'rate easy pressed' : 'rate easy'" @touchstart="onDown('known')" @touchend="onUp('known', chooseKnown)" @touchcancel="onCancel">
          <text class="button-text">认识</text>
        </view>
      </view>
      <view v-else-if="page === 'study'" class="rating">
        <view :class="isDown('cont') ? 'rate wide pressed' : 'rate wide'" @touchstart="onDown('cont')" @touchend="onUp('cont', submitStudy)" @touchcancel="onCancel">
          <text class="button-text">{{ isLastOfStudy ? '进入巩固' : '继续' }}</text>
        </view>
      </view>
      <view v-else class="choices">
        <view v-for="(choice, i) in choices" :key="choice.id" :class="choiceClass(i)" @touchstart="onDown('c' + i)" @touchend="onUp('c' + i, pickChoice)" @touchcancel="onCancel">
          <text :class="direction === 0 ? 'choice-text' : 'choice-word'">{{ choiceText(choice) }}</text>
        </view>
      </view>
    </view>

    <view v-else-if="page === 'summary'" class="summary">
      <text class="summary-title">本轮完成</text>
      <text class="summary-sub">完成 {{ summaryTotal }} 个词 · 继续保持</text>
      <view class="result">
        <view class="result-cell"><text class="result-num green">{{ result.correct }}</text><text class="result-label">答对</text></view>
        <view class="result-cell"><text class="result-num bad">{{ result.wrong }}</text><text class="result-label">需加强</text></view>
        <view class="result-cell"><text class="result-num accent">{{ accuracy }}%</text><text class="result-label">正确率</text></view>
      </view>
      <view :class="isDown('home') ? 'home-btn pressed' : 'home-btn'" @touchstart="onDown('home')" @touchend="onUp('home', goHome)" @touchcancel="onCancel">
        <text class="button-text">完成</text>
      </view>
    </view>

    <view v-else class="loading"><text class="button-text">加载中</text></view>

    <view v-if="toast" class="toast"><text class="toast-text">{{ toast }}</text></view>
  </view>
</template>

<script>
import { init, save } from '../../services/store.js';
import { createEngine } from '../../services/engine.js';
import cet4 from '../../assets/dicts/cet4.json';
import gk from '../../assets/dicts/gk.json';
import phrases from '../../assets/dicts/gk_wiktionary_phrases.json';

export default {
  data() {
    return {
      ready: false,
      pressed: '',
      page: 'home',
      dicts: [cet4, gk, phrases].map(function (d) {
        return { id: d.id, name: d.name, description: d.description, words: d.words, wordCount: d.words.length };
      }),
      state: {
        dictId: 'cet4',
        batchSize: 10,
        reviewMode: 0,
        highDifficulty: false,
        progressByDict: {},
        today: { date: '', learned: 0, reviewed: 0 },
        streak: { days: 0, last: '' },
        session: null
      },
      engine: null,
      dictList: [],
      current: {},
      choices: [],
      revealed: false,
      direction: 0,
      stats: { learned: 0, due: 0, totalWords: 0, todayLearned: 0, todayReviewed: 0, streakDays: 0 },
      result: { correct: 0, wrong: 0 },
      summaryTotal: 0,
      toast: '',
      timerId: 0
    };
  },
  computed: {
    currentDict() { return this.engine ? this.engine.dict() : this.dicts[0]; },
    showBack() { return this.page !== 'home' && this.page !== 'resume'; },
    topbarRight() {
      if (this.page === 'dicts') return this.dictList.length + ' 本';
      if (this.page === 'study' || this.page === 'review') return this.currentDict.name;
      if (this.page === 'summary') return this.stats.due + ' 个待复习';
      return '';
    },
    greeting() {
      var h = new Date().getHours();
      if (h < 6) return '夜深了';
      if (h < 12) return '早上好';
      if (h < 18) return '下午好';
      return '晚上好';
    },
    progressIndex() { return this.engine ? Math.min(this.engine.index + 1, this.engine.queue.length) : 0; },
    queueLength() { return this.engine ? this.engine.queue.length : 0; },
    progressPercent() {
      if (!this.queueLength) return 0;
      return Math.round((this.progressIndex - 1) * 100 / this.queueLength);
    },
    isLastOfStudy() { return this.engine ? this.engine.index + 1 >= this.engine.queue.length : false; },
    accuracy() {
      var t = this.result.correct + this.result.wrong;
      return t ? Math.round(this.result.correct * 100 / t) : 0;
    },
    hintText() {
      if (this.page === 'study') return this.revealed ? '核对释义后点击继续' : '先回忆释义，再选择';
      if (this.page === 'review') {
        if (this.engine && this.engine.correctPick >= 0) return '答对了';
        return this.direction === 1 ? '选择对应的单词' : '选择正确释义';
      }
      return '';
    }
  },
  mounted() {
    var self = this;
    init(function (state) {
      self.state = state;
      self.engine = createEngine(self.dicts, state, function (s) { save(s); });
      self.refresh();
      self.ready = true;
      if (self.engine.hasResume()) self.page = 'resume';
    });
  },
  methods: {
    refresh() {
      if (!this.engine) return;
      this.page = this.engine.page;
      this.stats = this.engine.stats();
      this.dictList = this.engine.dictList().map(function (d) {
        d.percent = d.wordCount ? Math.round(d.learnedCount * 100 / d.wordCount) : 0;
        return d;
      });
      this.current = this.engine.current || {};
      this.choices = this.engine.choices();
      this.revealed = !!this.engine.revealed;
      this.direction = this.engine.direction();
      this.result = this.engine.result;
      this.summaryTotal = this.engine.queue.length;
    },
    save() { save(this.state); this.refresh(); },
    isDown(name) { return this.pressed === name; },
    onDown(name) { this.pressed = name; },
    onUp(name, fn) {
      var hit = this.pressed === name;
      this.pressed = '';
      if (hit && fn) fn(name);
    },
    onCancel() { this.pressed = ''; },
    chipClass(n) {
      if (this.isDown('b' + n)) return this.state.batchSize === n ? 'chip chip-on pressed' : 'chip pressed';
      return this.state.batchSize === n ? 'chip chip-on' : 'chip';
    },
    modeClass(v) {
      if (this.isDown('m' + v)) return this.state.reviewMode === v ? 'mode-chip mode-chip-on pressed' : 'mode-chip pressed';
      return this.state.reviewMode === v ? 'mode-chip mode-chip-on' : 'mode-chip';
    },
    toggleClass() {
      if (this.isDown('hd')) return this.state.highDifficulty ? 'toggle toggle-on pressed' : 'toggle pressed';
      return this.state.highDifficulty ? 'toggle toggle-on' : 'toggle';
    },
    tapBatch(n) { this.state.batchSize = n; this.save(); this.refresh(); },
    tapMode(v) { this.engine.setReviewMode(v); this.refresh(); },
    tapDifficulty() { this.state.highDifficulty = !this.state.highDifficulty; this.save(); this.refresh(); },
    openDict() { if (this.page === 'home') this.page = 'dicts'; },
    chooseDict(id) { this.engine.selectDict(id); this.goHome(); },
    beginStudy() { if (!this.engine.startStudy()) return this.showToast('当前没有可学习的单词'); this.refresh(); },
    beginReview() { if (!this.engine.startReview()) return this.showToast('暂无可复习的单词'); this.refresh(); },
    restartSession() { this.engine.discardSession(); this.goHome(); },
    doResume() { if (!this.engine.resumeSession()) return this.goHome(); this.refresh(); },
    chooseUnknown() { this.engine.chooseStudyRating(1); this.refresh(); },
    chooseKnown() { this.engine.chooseStudyRating(0); this.refresh(); },
    submitStudy() { this.engine.submitStudy(); this.refresh(); },
    choiceText(choice) { return this.direction === 0 ? (choice.translation || choice.definition) : choice.word; },
    choiceClass(i) {
      if (this.engine && this.engine.correctPick === i) return 'choice choice-correct';
      if (this.engine && this.engine.wrongPicks.indexOf(i) >= 0) return 'choice choice-wrong';
      if (this.isDown('c' + i)) return 'choice pressed';
      return 'choice';
    },
    pickChoice(name) {
      if (typeof name !== 'string' || name.charAt(0) !== 'c') return;
      this.answer(Number(name.slice(1)));
    },
    answer(i) {
      var self = this;
      this.engine.answer(i);
      this.refresh();
      if (this.engine.correctPick >= 0) {
        this.clearTimer();
        this.timerId = setTimeout(function () {
          self.engine.advanceReview();
          self.refresh();
        }, 820);
      }
    },
    goHome() {
      this.clearTimer();
      if (this.engine) this.engine.home();
      this.refresh();
    },
    showToast(v) {
      var self = this;
      this.toast = v;
      this.clearTimer();
      this.timerId = setTimeout(function () { self.toast = ''; }, 1600);
    },
    clearTimer() { if (this.timerId) { clearTimeout(this.timerId); this.timerId = 0; } }
  },
  onUnload() { this.clearTimer(); if (this.state) save(this.state); }
};
</script>

<style lang="less" scoped>
@import "../../styles/base.less";

.app {
  width: 100%;
  height: 100%;
  flex: 1;
  flex-direction: column;
  background-color: #0a0f17;
}

/* ---------- 顶栏 ---------- */
.topbar {
  width: 100%;
  height: 13vh;
  flex-direction: row;
  align-items: center;
  padding-left: 1.6vw;
  padding-right: 1.6vw;
  background-color: #101825;
}

.back-wrap {
  width: 7.4vh;
  height: 7.4vh;
  margin-right: 1.6vw;
  align-items: center;
  justify-content: center;
  border-radius: 3.7vh;
  background-color: #1a2434;
}

.back-icon { width: 4.2vh; height: 4.2vh; }

.title { color: #f2f6fb; font-size: 5.2vh; font-weight: bold; }

.topbar-right { margin-left: auto; color: #71829a; font-size: 3.4vh; }

.dict-wrap {
  margin-left: auto;
  height: 8.2vh;
  flex-direction: row;
  align-items: center;
  padding-left: 1.6vw;
  padding-right: 1.4vw;
  border-radius: 4.1vh;
  background-color: #182335;
}

.dict { max-width: 26vw; color: #cfe0f5; font-size: 3.4vh; lines: 1; text-overflow: ellipsis; }

.dict-caret { margin-left: 0.6vw; color: #5d6f87; font-size: 2.8vh; }

/* ---------- 首页 ---------- */
.body-scroll { width: 100%; flex: 1; }

.body { width: 100%; padding-left: 2vw; padding-right: 2vw; padding-top: 1.4vh; }

.hero { width: 100%; }

.hero-title { color: #ffffff; font-size: 5.6vh; font-weight: bold; }

.hero-sub { margin-top: 0.7vh; color: #7d8ea3; font-size: 3.2vh; }

.stats { width: 100%; flex-direction: row; margin-top: 2vh; }

.stat {
  flex: 1;
  height: 13vh;
  margin-right: 1.4vw;
  align-items: center;
  justify-content: center;
  border-radius: 2.2vh;
  background-color: #141d2b;
}

.stat-last { margin-right: 0; }

.stat-num { color: #eef4fb; font-size: 5.6vh; font-weight: bold; }

.stat-label { margin-top: 0.7vh; color: #71829a; font-size: 3.1vh; }

.accent { color: #5b8def; }

.amber { color: #e8b464; }

.green { color: #47b98a; }

.bad { color: #e07a63; }

.actions { width: 100%; height: 13vh; flex-direction: row; margin-top: 2vh; }

.primary {
  flex: 1;
  height: 13vh;
  align-items: center;
  justify-content: center;
  border-radius: 6.5vh;
  background-color: #3f6fd8;
}

.secondary {
  flex: 1;
  height: 13vh;
  margin-left: 1.4vw;
  align-items: center;
  justify-content: center;
  border-radius: 6.5vh;
  background-color: #1a2434;
}

.button-text { color: #ffffff; font-size: 4.2vh; font-weight: bold; }

.pressed { opacity: 0.5; }

/* ---------- 设置 ---------- */
.settings { width: 100%; margin-top: 2.2vh; }

.section-label { color: #71829a; font-size: 3.1vh; }

.section-title { color: #ffffff; font-size: 4.6vh; font-weight: bold; }

.setting-row {
  width: 100%;
  height: 9vh;
  flex-direction: row;
  align-items: center;
  border-bottom-width: 0.25vh;
  border-bottom-color: #1b2534;
}

.setting-row-last { border-bottom-width: 0; }

.setting-label { color: #b9c7d6; font-size: 3.6vh; }

.chips { flex-direction: row; margin-left: auto; align-items: center; }

.chip {
  width: 8vw;
  height: 6.2vh;
  margin-left: 1.4vw;
  align-items: center;
  justify-content: center;
  border-radius: 3.1vh;
  background-color: #182335;
}

.chip-on { background-color: #3f6fd8; }

.chip-text { color: #d6e2f0; font-size: 3.4vh; }

.mode-chip {
  width: 12vw;
  height: 6.2vh;
  margin-left: 1.4vw;
  align-items: center;
  justify-content: center;
  border-radius: 3.1vh;
  background-color: #182335;
}

.mode-chip-on { background-color: #3f6fd8; }

.mode-text { color: #d6e2f0; font-size: 3.2vh; }

.toggle {
  width: 12vw;
  height: 6.2vh;
  margin-left: auto;
  align-items: center;
  justify-content: center;
  border-radius: 3.1vh;
  background-color: #182335;
}

.toggle-on { background-color: #3f6fd8; }

.toggle-text { color: #d6e2f0; font-size: 3.2vh; }

.tail-pad { width: 100%; height: 3vh; }

/* ---------- 词库 ---------- */
.dict-card {
  width: 100%;
  margin-top: 2vh;
  padding: 2.2vh 2vw;
  border-radius: 2.4vh;
  background-color: #141d2b;
}

.dict-card-active { background-color: #16233a; }

.dict-main { width: 100%; }

.dict-title-row { flex-direction: row; align-items: center; }

.dict-name { color: #ffffff; font-size: 4.2vh; font-weight: bold; }

.badge {
  margin-left: 1.4vw;
  padding-left: 1.2vw;
  padding-right: 1.2vw;
  padding-top: 0.3vh;
  padding-bottom: 0.3vh;
  border-radius: 2vh;
  background-color: #3f6fd8;
  color: #ffffff;
  font-size: 2.8vh;
}

.dict-desc { margin-top: 0.8vh; color: #71829a; font-size: 3.1vh; lines: 1; text-overflow: ellipsis; }

.dict-track {
  width: 100%;
  height: 1vh;
  margin-top: 1.4vh;
  border-radius: 0.6vh;
  background-color: #223046;
}

.dict-fill { height: 1vh; border-radius: 0.6vh; background-color: #47b98a; }

.dict-meta { margin-top: 0.8vh; color: #71829a; font-size: 3vh; }

/* ---------- 续学页（纵向容器里的按钮必须是容器的直接子节点） ---------- */
.resume-body {
  width: 100%;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.resume-card {
  width: 62vw;
  padding: 3vh 3vw;
  flex-direction: column;
  align-items: center;
  border-radius: 3vh;
  background-color: #141d2b;
}

.resume-title { color: #ffffff; font-size: 5.6vh; font-weight: bold; }

.resume-sub { margin-top: 1vh; color: #71829a; font-size: 3.4vh; text-align: center; }

.resume-btn {
  width: 100%;
  height: 11vh;
  margin-top: 2vh;
  align-items: center;
  justify-content: center;
  border-radius: 5.5vh;
}

.resume-btn-solid { background-color: #3f6fd8; }

.resume-btn-ghost { background-color: #1a2434; }

.resume-btn-text { color: #ffffff; font-size: 4vh; font-weight: bold; }

/* ---------- 学习 / 复习 ---------- */
.session {
  width: 100%;
  flex: 1;
  flex-direction: column;
  padding-left: 2vw;
  padding-right: 2vw;
  padding-top: 1.4vh;
  padding-bottom: 1.8vh;
  overflow: hidden;
}

.progress { width: 100%; height: 5vh; flex-direction: row; align-items: center; }

.progress-text { color: #71829a; font-size: 3.2vh; }

.track {
  flex: 1;
  height: 1.4vh;
  margin-left: 2vw;
  border-radius: 0.7vh;
  background-color: #1d2839;
}

.fill { height: 1.4vh; border-radius: 0.7vh; background-color: #47b98a; }

.word-panel { width: 100%; flex: 1; align-items: center; justify-content: center; }

.word {
  max-width: 92vw;
  color: #ffffff;
  font-size: 11vh;
  font-weight: bold;
  lines: 1;
  text-overflow: ellipsis;
}

.phonetic { margin-top: 1vh; color: #71829a; font-size: 4.2vh; }

.reveal-box {
  margin-top: 2.2vh;
  padding: 1.8vh 2.4vw;
  border-radius: 1.8vh;
  background-color: #131c2b;
}

.translation {
  max-width: 88vw;
  color: #dbe6f4;
  font-size: 4.2vh;
  lines: 3;
  text-align: center;
}

.prompt-cn {
  max-width: 88vw;
  color: #ffffff;
  font-size: 6vh;
  font-weight: bold;
  lines: 2;
  text-align: center;
}

.hint { margin-top: 1.8vh; color: #5d6f87; font-size: 3.4vh; }

.rating { width: 100%; height: 13vh; flex-direction: row; }

.rate {
  flex: 1;
  height: 13vh;
  align-items: center;
  justify-content: center;
  border-radius: 6.5vh;
}

.rate-left { margin-right: 1.4vw; }

.hard { background-color: #4a2f3c; }

.easy { background-color: #23453a; }

.wide { background-color: #3f6fd8; }

.choices { width: 100%; height: 44vh; }

.choice {
  width: 100%;
  height: 9.6vh;
  margin-bottom: 1.6vh;
  justify-content: center;
  padding-left: 2.4vw;
  padding-right: 2.4vw;
  border-radius: 1.8vh;
  background-color: #16202e;
}

.choice-wrong { background-color: #4a2f3c; }

.choice-correct { background-color: #23453a; }

.choice-text { color: #d6e2f0; font-size: 3.8vh; lines: 1; text-overflow: ellipsis; }

.choice-word { color: #ffffff; font-size: 4.4vh; font-weight: bold; lines: 1; text-overflow: ellipsis; }

/* ---------- 结算 ---------- */
.summary {
  width: 100%;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.summary-title { color: #ffffff; font-size: 7vh; font-weight: bold; }

.summary-sub { margin-top: 1.2vh; color: #71829a; font-size: 3.6vh; }

.result { width: 72vw; height: 15vh; flex-direction: row; margin-top: 3vh; margin-bottom: 3vh; }

.result-cell { flex: 1; align-items: center; justify-content: center; }

.result-num { color: #ffffff; font-size: 6.4vh; font-weight: bold; }

.result-label { margin-top: 0.8vh; color: #71829a; font-size: 3.2vh; }

.home-btn {
  width: 40vw;
  height: 12vh;
  align-items: center;
  justify-content: center;
  border-radius: 6vh;
  background-color: #3f6fd8;
}

.loading { width: 100%; flex: 1; align-items: center; justify-content: center; }

.toast {
  position: absolute;
  bottom: 5vh;
  align-self: center;
  padding: 1.4vh 2.4vw;
  border-radius: 3vh;
  background-color: #22304a;
}

.toast-text { color: #ffffff; font-size: 3.4vh; }
</style>