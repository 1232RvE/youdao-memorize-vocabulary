# 背单词 · PenOS 移植版

把 PenMods 插件 `words_plugin`（Qt/QML，320x170）移植为有道词典笔 Falcon/QuickJS mini-app。

- appid：`8000000000765868`
- 包名：`8000000000765868.1_1_0.amr`（版本 1.1.0）
- 视口：本机 936x280（横屏），**全部尺寸用 vh / vw 视口单位，不写死像素**，跨机型自适应

## 目录

- `src/app.js` 应用入口，`$falcon.useDefaultBasePageClass(BasePage)`
- `src/pages/index/index.vue` 单页承载 首页 / 续学 / 学习 / 巩固 / 结算 / 词库选择 六个视图
- `src/services/engine.js` 学习与复习状态机（自源插件 QML 交互重建）
- `src/services/store.js` 全局存储（`storage.getGlobalStorage` 优先，旧档自动归一）
- `src/services/metrics.js` 视口尺寸工具（备用）
- `src/assets/dicts/*.json` 三份词库（cet4 1635 / gk 2123 / gk_wiktionary_phrases 249，合计 4007）
- `assets/back.png` 返回图标（**必须放工程根 assets/**，构建脚本只同步 libs / jsworkers / assets 三个目录）
- `tools/export-dicts.js` 从源插件 `dicts/*.db` 导出 JSON（并把字面 \`\\n\` 还原成真换行）
- `tools/check.js` 静态门禁（26 项）
- `shots/` 真机走查截图

## 构建 / 部署

```powershell
cd D:\penmods\words_penos
& 'D:/penos/.tools/node16/node-v16.20.2-win-x64/node.exe' tools/check.js
& 'D:/penos/.tools/node16/node-v16.20.2-win-x64/node.exe' tools/build.js

adb push 8000000000765868.1_1_0.amr /data/local/tmp/w.amr
adb shell "miniapp_cli uninstall 8000000000765868"
adb shell "miniapp_cli install /data/local/tmp/w.amr"
adb shell "miniapp_cli start 8000000000765868"
adb shell "hal-screen on; hal-screen set 100; hal-screen keep"
```

## 真机走查（本项目已验证的通道）

- 截图：`hal-screen on` 点亮屏幕后 `miniapp_cli capture /data/local/tmp/x.png` 才是真实画面；屏幕休眠时只会得到噪点图。
- 点击：`send_event touch press A B` / `release A B`，其中 **A = 截图像素 y，B = 935 - 截图像素 x**（A 不要再减 13；每改一次布局都要用 PIL 重新扫像素带取中心）。
- 一次性跑完流程用设备端脚本：push 到 `/data/local/tmp/`、`chmod 755`，再 `adb shell "hal-screen on; hal-screen keep; sh /data/local/tmp/x.sh"`；点击前先 `miniapp_cli start 8000000000765868` 拉回前台，间隔 0.7~1.0s，过快会误触系统输入法。
- 设备日志：`/userdata/applog/DictPen_<日期>_<时分秒>.log`，本应用的行形如 `(console(8000000000765868).warn.0)`。

### 当前布局实测点位（936x280，press 参数）

| 位置 | A（= 像素 y） | B（= 935 - 像素 x） |
| --- | --- | --- |
| 首页 开始学习 | 142 | 700 |
| 首页 每轮词数 5/10/15/20 | 191 | 588 / 690 / 754 / 858 |
| 首页 选择模式 混合/中选英/英选中 | 216 | 608 / 733 / 859 |
| 首页 题目难度 | 241 | 860 |
| 首页 词库入口 | 13 | 45 |
| 学习页 不认识 / 认识 | 254 | 240 / 700 |
| 学习页 继续 | 245 | 466 |
| 巩固页 四个选项 | 163 / 195 / 226 / 261 | 465 |
| 结算页 完成 | 261 | 465 |
| 顶部返回箭头 | 22 | 917 |
| 续学页 继续学习 | 162 | 465 |

## 交互逻辑（对齐源插件 QML）

1. **学习**：先选「不认识 / 认识」→ 露出释义 → 点「继续」提交。选择「认识」的词需在本次会话内累计答对 2 次，选择「不认识」需答对 4 次；未达标则随机插回剩余队列，达标移出。同一个词最多出现 target+3 次，保证会话必然结束。
2. **巩固**：学习队列走完后自动进入四选一。答对变绿并在 820ms 后进入下一题；答错标红并留在本题可继续点。
3. **结算**：显示答对 / 需加强数量与正确率，点「完成」回首页。
4. **续学**：中途退出时保存会话，下次启动弹出「继续上次学习 / 重新开始」。

## 视觉约定

- 深色底 `#0a0f17`，卡片 `#141d2b`，主色 `#3f6fd8`，成功 `#47b98a`，警示 `#e8b464`，危险 `#4a2f3c`
- 所有可点元素用 `onDown / onUp` 成对事件做按压反馈（`.pressed { opacity: 0.5 }`），不用 CSS `:active`
- 不使用 emoji（设备无 emoji 字体），图标用 PNG
- **Weex 坑**：纵向 flex 容器里再套一层 view 包按钮会得到零高度不渲染 —— 按钮必须是 flex 容器的直接子节点

## 已知限制

- 源插件的调度算法编译在 `libwords_plugin.so`（AArch64/Qt5，无源码），无法复用，学习节奏按源 QML 的可见交互重建。
- 「高难词优先」按历史错误次数排序，语义等同于原插件但实现是重写的。
