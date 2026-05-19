# 倪柝声文集 · 阅读器

跨平台阅读 App，收录倪柝声全部著作（3 系列 · 62 册 · 1,325 章）。支持 H5、Android、iOS。

**技术栈**: React 18 + Vite + TypeScript + Capacitor 5

## 功能

- **沉浸式阅读** — 点击屏幕中间切换控制栏，左右边缘翻章
- **三种主题** — 白天 / 夜间 / 护眼（sepia）
- **四档字号** — 小(16px) · 中(18px) · 大(22px) · 特大(26px)
- **阅读进度** — 自动保存，首页「继续阅读」快速接续
- **全文离线** — 所有内容内置，无需网络
- **跨平台** — 一套代码，H5 / Android / iOS 通用

## 内容

| 系列 | 时期 | 册数 | 章节 |
|------|------|------|------|
| 第一辑 · 早期著作 | 1922–1934 | 20 册 | 500+ |
| 第二辑 · 中期著作 | 1935–1942 | 26 册 | 480+ |
| 第三辑 · 晚期著作 | 1943–1952 | 16 册 | 340+ |

数据来源: [爱灵慕圣](http://ailingmusheng.ren/niwj/)

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器 (H5)
npm run dev          # → http://localhost:5173

# 生产构建
npm run build        # → dist/
npm run preview      # → http://localhost:4173
```

### Node.js 版本要求

需要 Node.js >= 22。推荐使用 [n](https://github.com/tj/n) 管理版本：

```bash
n 22
```

## 构建 Android APK

### 本地构建

```bash
# 1. 构建 web 资源
npm run build

# 2. 同步到 Android 项目
npx cap sync android

# 3. 用 Android Studio 打开并构建
npx cap open android
#   Build → Build Bundle(s) / APK(s) → Build APK(s)

# 或命令行构建
cd android && ./gradlew assembleDebug
#   APK 输出: android/app/build/outputs/apk/debug/app-debug.apk
```

### CI 自动构建（GitHub Actions）

Push 到 `main` 分支自动触发 `.github/workflows/build-apk.yml`：

1. 安装依赖 + Vite 构建
2. Capacitor 同步资源
3. Gradle 编译 APK
4. 上传为 Actions artifact（保留 30 天）

在仓库 **Actions** 页下载。

## iOS 支持

架构已预留 iOS 能力，需要 macOS 环境执行：

```bash
npx cap add ios
npx cap open ios
# 在 Xcode 中配置签名后构建
```

## 项目结构

```
niwj-reader/
├── src/
│   ├── pages/
│   │   ├── Home.tsx           # 首页：系列列表 + 继续阅读
│   │   ├── BookList.tsx       # 某系列的书目列表
│   │   ├── ChapterList.tsx    # 某书的章节目录
│   │   └── Reader.tsx         # 全屏阅读器
│   ├── store/settings.ts      # Zustand：主题/字号/进度
│   ├── hooks/useBook.ts       # 数据加载与缓存
│   └── styles/app.css         # 全局样式
├── public/data/
│   ├── index.json             # 目录索引 (~219KB)
│   └── books/                 # 62 本书 JSON (~24MB)
├── android/                   # Capacitor Android 原生项目
├── capacitor.config.ts        # Capacitor 配置
└── .github/workflows/         # CI 构建脚本
```

## 数据更新

数据由项目根目录 `crawler.py` 爬取生成。如需更新内容：

```bash
python3 crawler.py
python3 -c "
import json, os, re
# Rebuild index and copy book files
# See crawler.py for details
"
```

## License

内容版权归原作者所有。代码 MIT。
