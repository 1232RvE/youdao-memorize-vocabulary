/**
 * App - 生命周期入口（ESM，aiot-vue-cli 构建）
 *
 * 与 lx_falcon / chat/falcon_dt 同构（本固件已验证的 App 契约）：
 *   - class App extends $falcon.App；jsfm 会 new __AppClazz()
 *   - onLaunch 里设 viewPort（属性名必须是 viewPort）
 *   - app.js 里不要 import 'vue'（设备 js_modules 没有 vue）
 *   - 原生模块的静态 import 只能放在**页面 chunk**（本文件由原生加载器解析）
 */
import { resolveViewport, applyViewport } from './profile.js';
import { setViewport } from './services/metrics.js';
import { BasePage } from './base-page.js';

class App extends $falcon.App {
  onLaunch() {
    try {
      var v = resolveViewport();
      var res = applyViewport(v);
      // 记录真实视口，页面所有尺寸按短边百分比换算
      setViewport(res.width, res.height);
      this.viewPort = { width: res.width, height: res.height };
      console.warn('[App] viewport ' + res.width + 'x' + res.height +
                   ' source=' + res.source + ' ok=' + res.ok);
    } catch (e) {
      console.warn('[App] onLaunch err: ' + e.message);
    }
    try {
      $falcon.useDefaultBasePageClass(BasePage);
    } catch (e2) {
      console.warn('[App] useDefaultBasePageClass err: ' + e2.message);
    }
  }
}

export default App;
