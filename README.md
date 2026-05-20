# 倪柝声文集 · 阅读器

跨平台阅读 App，收录倪柝声全部著作（3 系列 · 62 册 · 1,325 章）。支持 H5、Android、iOS。

**技术栈**: React 18 + Vite + TypeScript + Capacitor 5

## 功能

**阅读**
- 沉浸式全屏阅读，点击屏幕切换控制栏
- 三种主题：白天 / 夜间 / 护眼（sepia），全局实时切换，同步状态栏颜色
- 四档字号：小(16px) · 中(18px) · 大(22px) · 特大(26px)
- 阅读进度自动保存（800ms 防抖），首页「继续阅读」快速接续
- 右侧垂直滚动进度指示器（滚动时显示，1.2s 后淡出）
- 计时器：页面可见时计时，后台自动暂停
- 全面屏适配：顶部状态栏 + 底部导航栏 + 左右安全区
- 扁平 SVG 图标，currentColor 跟随主题

**搜索**
- 全局全文搜索，覆盖 1,325 章标题和内容（首 1,500 字）
- 搜索索引懒加载（~5.4MB），首次使用后浏览器缓存
- 三层独立导航：搜索结果(L1) → 书卷筛选(L2) → 文本定位(L3)
- L3 定位页：关键词全文章节高亮，首处自动定位，「下一处/上一处」跳转，浮动按钮辅助
- 竞态保护：快速点击不同结果不会出现内容覆盖
- 书卷选择器：按搜索结果过滤，仅展示含匹配结果的书名
- 系统返回键完整拦截：L3→L2/L1、L2→L1，不退出 app
- 搜索跳转不计入阅读进度、历史、计时

**统计与历史**
- 阅读统计：累计时长、已读章节、连续天数、今日阅读
- 阅读历史：最近 50 条按日期分组（跨年区分），点击续读
- 历史去重 + 跨年标签（今年内不显示年份，往年显示）

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
npm install            # 安装依赖
npm run dev            # H5 开发 → http://localhost:5173
npm run build          # 生产构建 → dist/
npm run preview        # 预览 → http://localhost:4173
```

需要 Node.js >= 22。

## 构建 Android APK

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# APK → android/app/build/outputs/apk/debug/app-debug.apk (~13MB)
```

### CI 自动构建

Push 到 `main` 分支自动触发 GitHub Actions，在仓库 **Actions** 页下载 APK（保留 30 天）。

构建流程: Node 22 → Vite build → Capacitor sync → JDK 17 + Android SDK 34 → Gradle assembleDebug

## iOS 支持

需要 macOS 环境：

```bash
npx cap add ios
npx cap open ios     # Xcode 配置签名 → Archive
```

## 项目结构

```
niwj-reader/
├── src/
│   ├── pages/
│   │   ├── Home.tsx              # 首页：系列列表 + 继续阅读
│   │   ├── BookList.tsx          # 某系列的书目列表
│   │   ├── ChapterList.tsx       # 某书的章节目录
│   │   ├── Reader.tsx            # 全屏阅读器（计时/进度/历史）
│   │   ├── Search.tsx            # 全局搜索（L1→L2→L3 + 书卷选择器）
│   │   └── Profile.tsx           # 我的（统计 + 历史 + 设置）
│   ├── store/
│   │   ├── settings.ts           # 主题/字号/阅读进度
│   │   └── reading.ts            # 阅读统计/历史记录
│   ├── hooks/useBook.ts          # 数据加载与内存缓存
│   ├── components/Icons.tsx      # SVG 图标库（10 个扁平图标）
│   └── styles/app.css            # 全局样式
├── public/data/
│   ├── index.json                # 目录索引 (~219KB)
│   ├── search-index.json         # 搜索索引 (~5.4MB)
│   └── books/                    # 62 本书 JSON (~24MB)
├── docs/
│   ├── 产品设计文档.md
│   └── 技术设计文档.md
├── android/                      # Capacitor Android 原生项目
├── capacitor.config.ts
└── .github/workflows/build-apk.yml
```

## 文档

- [产品设计文档](docs/产品设计文档.md) — 用户画像、信息架构、页面设计、已知修复
- [技术设计文档](docs/技术设计文档.md) — 技术栈、数据架构、状态管理、搜索架构、组件树

## 数据更新

```bash
python3 crawler.py      # 爬取最新内容
# 重新生成 public/data/index.json 和 search-index.json
```

## License

内容版权归原作者所有。代码 MIT。
