# 纸间 · 本地电子书阅读器

一个只属于这台手机的书架：导入 EPUB / TXT，离线阅读，进度和设置都留在本机，不需要账号。

这是 **MVP（P0）**，目标是把「导入 → 书架 → 阅读 → 续读」这条闭环做扎实，而不是堆功能。

## 这一版有什么

- **书架**：两列封面网格、最近阅读优先、书名/作者/进度、删除二次确认、空态引导。
- **导入**：一次多选 `.epub` / `.txt`；自动读取书名、作者、封面；同名同大小判重；单本 ≤ 100 MB；失败会给原因。
- **阅读**：全屏分页阅读，点左右 1/3 或横向滑动翻页，中间点切换工具栏；支持纵向滚动模式。
- **目录**：两级缩进、当前章高亮、点击跳转。
- **阅读设置**：字号 16–26px、行高 1.5 / 1.7 / 1.9、系统字体 / 宋体 / 黑体、纸白 / 米黄 / 夜间、三档页边距、翻页 / 滚动。
- **进度**：基于 EPUB CFI 记录，翻页防抖保存，切后台立即落盘，重新打开自动续读；底部进度条可拖动跳转。
- **离线**：Service Worker 预缓存应用外壳，断网刷新仍能打开；书架数据存在 IndexedDB。
- **样章**：首次打开可先读一段内置公版短文，不用先找书。

明确不在这一版：书签、划线笔记、全文搜索、阅读统计、云同步、账号、书城、TTS、PDF / MOBI / AZW3、DRM 破解。

## 技术栈

React 19 + TypeScript + Vite 8，阅读渲染用 [epub.js](https://github.com/futurepress/epub.js)，本地数据用 Dexie / IndexedDB，TXT 导入时在浏览器里转换成 EPUB，和原生 EPUB 共用同一套渲染、目录和进度逻辑。样式是 CSS Modules + 设计变量，没有引入 UI 框架。

## 本地运行

要求 Node.js ≥ 20.19，包管理器 pnpm。

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

生产构建与预览：

```bash
pnpm build
pnpm preview      # http://localhost:4173
```

> 本机 Node 是 hardened runtime，加载不了未签名的原生 `.node` 模块，因此构建做了两处适配：
> `build.cssMinify: false`（不加载 lightningcss 原生绑定），以及用 `@rolldown/binding-wasm32-wasi` 跑 Vite 8 的 rolldown。
> 功能不受影响，只是 CSS 没有压缩。

### 手机上验收

1. 手机与电脑连同一个 Wi-Fi，电脑执行 `pnpm dev`（已监听 `0.0.0.0`）。
2. 手机浏览器打开 `http://<电脑局域网 IP>:5173`。
3. 依次走一遍：导入一本 EPUB 或 TXT → 打开阅读 → 翻几页 → 回书架 → 再打开确认续读 → 改主题/字号 → 刷新确认设置还在 → 删除。
4. 断网与「添加到主屏幕」需要 HTTPS（Service Worker 只在安全上下文生效）；局域网 HTTP 只用于功能验收。部署到任意静态托管后即可完整离线。

`/demo` 是开发环境专用路由，会种入内置样章并直接打开阅读器，方便调试排版。

## 测试

```bash
pnpm typecheck    # tsc --noEmit
pnpm test         # Vitest：TXT 编码/切章/转 EPUB、EPUB 解析、进度、设置、Dexie
pnpm e2e          # 构建后用 Playwright 跑真实 Chrome
pnpm verify       # typecheck + 单测 + 构建 + E2E
```

E2E 覆盖：内置样章阅读与目录、TXT 导入 + 目录跳转 + 主题持久化、删除确认、Service Worker 离线刷新。Playwright 使用系统 Chrome（`channel: 'chrome'`），并已带 `--no-sandbox` 等参数适应当前环境。

## 目录结构

```text
src/
  lib/
    db/           Dexie 表结构、书架/进度/设置/目录缓存
    epub/         EPUB 元数据与封面解析
    txt/          TXT 解码、切章、TXT → EPUB
    import/       导入管线（校验、判重、落库）
    reader/       epub.js 封装（渲染、手势、定位、主题注入）
  pages/          书架 / 阅读器 / 开发用样章路由
  components/     封面、弹层、Toast、目录、阅读设置
  styles/         设计变量与全局样式
public/
  icons/          PWA 图标
  samples/        内置样章
  sw.js           离线 Service Worker
scripts/          图标与样章生成脚本
tests/            单元测试与 Playwright E2E
```

## 数据与隐私

所有内容只存在浏览器的 IndexedDB 里：原书 Blob、封面、TXT 转换出的 EPUB、目录缓存、阅读进度、阅读设置。没有后端，没有登录，也不会把书上传到任何地方。首次使用会请求持久化存储（`navigator.storage.persist()`），但 iOS 在长期不用或存储紧张时仍可能清理站点数据，重要书请保留原文件。

## 已知取舍

- **自研 Service Worker**：原计划用 `vite-plugin-pwa`，但它的 workbox 依赖 rollup 原生绑定，在本机签名策略下无法加载。现在由构建插件生成 `precache-manifest.json`，`public/sw.js` 负责预缓存和导航回退，行为等价。
- **`pnpm install` 可能以非零码结束**：core-js / es5-ext 的安装脚本被 pnpm 拦截（`ERR_PNPM_IGNORED_BUILDS`），依赖本身已完整安装，不影响开发与构建。
- TXT 的章节识别基于常见标题格式；识别不到时按约 4 万字切节。开头的「书名：/作者：」会被当作元信息移除。
- 阅读器的工具栏是覆盖层，显示时会盖住正文首行，4.5 秒后自动隐藏；阅读区上下预留了工具栏高度，隐藏后是正常页边距。

## 下一步（P1 / P2）

P1：书签、划线笔记、全文搜索、书架搜索、导出/备份、阅读统计、自定义字体。

P2：账号与多端同步、书城/书源、TTS、PDF / MOBI / AZW3、分享与原生安装包。

永久不做：DRM 破解。
