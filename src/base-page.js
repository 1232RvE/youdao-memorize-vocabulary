class ResourcePage extends $falcon.Page {
  constructor() { super(); this.timers = []; }
  setTimeout(fn, ms) { var t = setTimeout(() => { this.timers = this.timers.filter(x => x !== t); fn(); }, ms); this.timers.push(t); return t; }
  setInterval(fn, ms) { var t = setInterval(fn, ms); this.timers.push(t); return t; }
  release() { this.timers.forEach(t => { clearTimeout(t); clearInterval(t); }); this.timers = []; }
}
export class BasePage extends ResourcePage {
  onLoad(options) { super.onLoad(options); this.options = options || {}; }
  onNewOptions(options) { super.onNewOptions(options); this.options = options || {}; }
  onShow() { super.onShow(); if (this.$root && this.$root.onShow) this.$root.onShow(); }
  onHide() { super.onHide(); if (this.$root && this.$root.onHide) this.$root.onHide(); }
  onUnload() { try { super.onUnload(); if (this.$root && this.$root.onUnload) this.$root.onUnload(); } finally { this.release(); } }
  beforeVueInstantiate(Vue) { if (super.beforeVueInstantiate) super.beforeVueInstantiate(Vue); }
}
