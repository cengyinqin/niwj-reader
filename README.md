# 倪柝声文集 · 阅读器

跨平台阅读 App，收录倪柝声全部著作（3 系列 · 62 册 · 1,325 章）。支持 H5、Android、iOS。

**技术栈**: React 18 + Vite + TypeScript + Capacitor 5

## 功能

**阅读**
- 沉浸式全屏阅读，点击中间切换控制栏，左右边缘翻章
- 三种主题：白天 / 夜间 / 护眼（sepia）
- 四档字号：小(16px) · 中(18px) · 大(22px) · 特大(26px)
- 阅读进度自动保存，首页「继续阅读」快速接续
- 右侧垂直滚动进度指示器

**搜索**
- 全局全文搜索，覆盖 1,325 章标题和内容
- 关键词高亮，按 系列 → 书 → 章节 层级展示结果
- 三层独立导航：搜索结果 → 书卷筛选 → 文本定位
- 定位页「下一处/上一处」跳转，浮动按钮辅助
- 📂 书卷选择器，仅展示含匹配结果的书名
- 搜索不计入阅读进度和历史

**统计与历史**
- 阅读统计：累计时长、已读章节、连续天数、今日阅读
- 阅读历史：最近 50 条按日期分组，点击续读
- 阅读计时：页面可见时计时，后台自动暂停

**导航**
- 底部 Tab 栏：📚 文集 / 🔍 搜索 / 👤 我的
- 阅读器全屏时自动隐藏 Tab
- 「我的」页面集成设置：主题 / 字号调整

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
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# APK 输出: android/app/build/outputs/apk/debug/app-debug.apk
```

### CI 自动构建（GitHub Actions）

Push 到 `main` 分支自动触发，在仓库 **Actions** 页下载 APK artifact（保留 30 天）。

## iOS 支持

需要 macOS 环境：

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
│   │   ├── Reader.tsx         # 全屏阅读器（计时/进度/历史）
│   │   ├── Search.tsx         # 全局搜索（L1结果→L2筛选→L3定位）
│   │   └── Profile.tsx        # 我的（统计 + 历史 + 设置）
│   ├── store/
│   │   ├── settings.ts        # 主题/字号/阅读进度
│   │   └── reading.ts         # 阅读统计/历史记录
│   ├── hooks/useBook.ts       # 数据加载与缓存
│   └── styles/app.css         # 全局样式
├── public/data/
│   ├── index.json             # 目录索引 (~219KB)
│   ├── search-index.json      # 搜索索引 (~5.4MB)
│   └── books/                 # 62 本书 JSON (~24MB)
├── android/                   # Capacitor Android 原生项目
├── capacitor.config.ts        # Capacitor 配置
└── .github/workflows/         # CI 构建脚本
```

## 数据更新

```bash
# 1. 爬取最新内容
python3 crawler.py

# 2. 重建索引和搜索数据
python3 -c "
import json, os, re
# 重新生成 public/data/index.json 和 search-index.json
"
```

## License

内容版权归原作者所有。代码 MIT。
