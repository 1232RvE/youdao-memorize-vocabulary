版本号更新至 1.1.1。

## 安装

```powershell
adb push 8000000000765868.1_1_1.amr /data/local/tmp/w.amr
adb shell "miniapp_cli uninstall 8000000000765868"
adb shell "miniapp_cli install /data/local/tmp/w.amr"
adb shell "miniapp_cli start 8000000000765868"
```

## 说明

- 适用于有道词典笔 Falcon / QuickJS 运行环境（PenOS）
- 三本离线词库：四级 1635 / 高考 2123 / 高中词组 249，合计 4007 条
- 全部尺寸用 vh/vw 视口单位，跨机型自适应
- 学习 / 巩固 / 结算 / 续学 全流程，深色现代界面