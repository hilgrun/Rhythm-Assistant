# 呼吸练习 PWA

基于 4-7-8 呼吸法的膈肌呼吸训练器，从 Kivy 迁移到 PWA，支持 PC 和 Android 离线使用。

## 功能

- **4-7-8 呼吸循环**：吸气 → 屏息 → 呼气，时长可自定义
- **实时音频合成**：Web Audio API 生成滑音提示（吸气升调、呼气降调）
- **振动反馈**：阶段切换和完成时手机振动（需支持 Vibration API）
- **呼吸动画**：SVG 圆圈大小与颜色随呼吸节奏变化
- **设置记忆**：所有参数自动保存到 localStorage
- **深色主题**：护眼暗色界面，自动适配各种屏幕
- **键盘快捷键**：空格键 开始/暂停/恢复，Esc 键 结束

## 文件结构

```
breathing-pwa/
├── index.html       # 主页面
├── style.css        # 深色主题样式
├── app.js           # 呼吸逻辑 + Web Audio 合成
├── manifest.json    # PWA 清单
├── sw.js            # Service Worker 离线缓存
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── README.md
```

## 本地运行

```bash
cd breathing-pwa
python -m http.server 8000
```

浏览器打开 `http://localhost:8000`

## 离线测试

Chrome DevTools → Application → Service Workers → 勾选 Offline，刷新页面应能正常使用。

## 安装

- **PC**：Chrome/Edge 地址栏右侧点击 ➕ 安装图标
- **Android**：Chrome 菜单 → "安装应用" 或 "添加到主屏幕"
- **iOS**：Safari 分享 → "添加到主屏幕"

## 与原 Kivy 程序对比

| 功能 | Kivy 原版 | PWA 版 |
|------|----------|--------|
 音频合成 | numpy + wave 文件 | Web Audio API 实时合成 |
| 振动 | Android JNI | Navigator.vibrate |
| 动画 | OpenGL Ellipse | SVG + JS |
| 存储 | 无 | localStorage 持久化 |
| 跨平台 | 需 Buildozer 打包 | 浏览器直接运行 |
| 包体积 | 10MB+ | < 100KB |
