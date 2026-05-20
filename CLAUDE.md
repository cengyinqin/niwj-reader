# CLAUDE.md — 倪柝声文集阅读器

## 项目结构

```
neebooks/
├── crawler.py              # Python 爬虫（stdlib only）
├── output/                 # 爬取原始数据
│   ├── niwj_full.json      # 23MB 全量
│   ├── series_*.json       # 系列目录
│   └── books/              # 62 本单书 JSON
└── niwj-reader/            # React App
    ├── src/                # 源码
    ├── public/data/        # 静态数据文件
    ├── android/            # Capacitor Android
    └── docs/               # 产品 + 技术文档
```

## App 架构

- **框架**: React 18 + Vite + TypeScript
- **路由**: HashRouter（6 条路由）/reader 可带 `?from=search`
- **状态**: Zustand 5 + persist（settings / reading 两个独立 store）
- **跨平台**: Capacitor 5（Android 已配置，iOS 架构预留）
- **图标**: 内联 SVG 组件 `src/components/Icons.tsx`（currentColor）
- **样式**: CSS Variables 三级主题 `[data-theme='light|dark|sepia']`

## 关键命令

```bash
cd niwj-reader
export PATH="$HOME/.n/bin:$PATH"  # Node 22
npm run dev       # H5 开发
npm run build     # 生产构建
npx cap sync android
cd android && ./gradlew assembleDebug
```

## 搜索架构（Search.tsx）

三层内部导航（非路由，用 `level` state 切换）：
- **L1** 搜索首页：allResults（200 条上限），按系列→书分组
- **L2** 书卷筛选：l2Results / l2BrowseChapters（无关键词浏览模式）
- **L3** 文本定位：fetchBook() 加载章节，HighlightedText 关键词高亮
- 竞态保护：`goL3ReqId` 递增守卫丢弃过期异步响应
- 返回键：pushState 仅推一条 + popstate/Capacitor backButton 双监听
- `goBack`: L3 检测 l2 是否存在，不存在直接回 L1（防空白页）

## Reader 核心逻辑

- 阅读计时：setInterval(1s) + visibilityState 控制，30s 批量写入
- 进度保存：800ms 防抖，滚动停止后写入
- 章节切换：URL 路由导航，React Router 参数变化触发数据加载
- 点击控制栏：点击屏幕任意位置 toggle
- `?from=search`: 跳过计时、历史记录、章节标记

## 主题系统

- `ThemeSync` 组件（App 层）：监听 theme → 更新 `<html data-theme>` + `<meta name="theme-color">`
- `index.html` 内联脚本：挂载前读取 localStorage 防闪烁
- CSS Variables：`:root` / `[data-theme='dark']` / `[data-theme='sepia']`

## 数据文件

- `public/data/index.json` — 219KB 目录（启动加载，内存缓存）
- `public/data/search-index.json` — 5.4MB 搜索索引（首次搜索懒加载）
- `public/data/books/*.json` — 62 本（按需加载，Map 缓存）
- `crawler.py` — stdlib only，GB2312→UTF-8

## 全面屏

- CSS Variables: `--safe-top/bottom/left/right` = `env(safe-area-inset-*)`
- `.app-shell` 四边安全区 padding
- `.reader-top/bottom-bar` 左右下安全区
- `.app-content` 底部安全区

## Git

- 仓库: `cengyinqin/niwj-reader`
- CI: `.github/workflows/build-apk.yml`（push main 自动构建 APK）
- pre-push hook 已禁用（`/home/ai/.git-hooks/pre-push` → `exit 0`）
- Co-Authored-By: zengyinqin <zengyinqin@gmail.com>
