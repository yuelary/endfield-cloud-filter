# AGENTS.md

> 这是**给 AI 协作者的 README**（人类请看 [README.md](README.md)）。
> 格式遵循 [agents.md](https://agents.md/)：纯 Markdown，写在仓库根目录，离被改的文件最近的这份优先。

## 项目概览

一个**单文件用户脚本**：给网页云游戏叠一层类似 NVIDIA Freestyle 的后处理滤镜。
唯一产物就是 `endfield-cloud-filte.user.js`（无构建、无依赖、无打包）。改完直接就是可安装文件。

**不可动摇的三条约束：**

1. **零额外延迟** —— 只用 CSS/SVG filter（合成器直接吃）。不许引入每帧拷贝、插帧、canvas 中转。
2. **零依赖、零构建** —— 脚本必须能直接 `node --check`，不许有 import/npm。
3. **默认零外联** —— 不许出现任何外部请求；调试上报必须 opt-in 且只发 `127.0.0.1`。

## 改动前必读：这四个坑都真踩过

1. **不能往 `document` 直接 `appendChild`**
   一个 Document 只允许一个元素子节点（`<html>`），塞 `<svg>/<style>` 会抛 `HierarchyRequestError`。
   若被 `try/catch` 吞掉，**文档级注入会静默失效**，表现为"游戏里完全没效果"。
   ⇒ 一律挂到 `document.head || document.documentElement`。

2. **画面不一定在 `<video>` 上**
   云游戏新路径是 **WebCodecs 解码 → WebGL canvas**（`texImage2D(..., VideoFrame)`），此时页面上可能压根没有在播的 `<video>`。
   ⇒ 必须同时处理 `canvas`（只挑够大的、最多两个，避免误伤 UI 小画布）。

3. **3×3 卷积锐化会被裁切吃掉**
   `feConvolveMatrix` 在亮画面/高对比处会被 `[0,1]` 钳位，实测"像素差很大但拉普拉斯方差几乎不涨"。
   ⇒ 用**非锐化掩模**：`feGaussianBlur` + `feComposite arithmetic`（`k2 = 1+amt, k3 = -amt`，和为 1 保证不整体提亮）。

4. **别用 `getContext()` 探测 canvas 类型**
   对还没初始化的 canvas 调 `getContext('webgl2')` 会**把它创建成 WebGL**，可能直接搞坏站点的 2D canvas。
   ⇒ 诊断里只报尺寸和"有没有吃到滤镜"。

## 构建与测试

```bash
node --check endfield-cloud-filte.user.js     # 语法（CI 也会跑）
node tools/ci-check.mjs                    # 元数据 / 版本一致性 / 危险 API
node tools/serve.mjs                       # 起 http://127.0.0.1:8899 的安装页
```

**行为验证**（改渲染相关代码后请做一遍，别只看代码）：

1. 用一个**独立 `--user-data-dir`** 的 Chromium 起调试口：`--remote-debugging-port=9222`
   （⚠️ 绝不要拿使用者的日常浏览器配置去开调试口，也不要把它复制出去 —— 那里面是 cookie）
2. `node tools/cdp.mjs inject video-test endfield-cloud-filte.user.js` 注入 `test/video-test.html`
   （测试台里刻意放了：shadow DOM 里的 video、普通 video、一个 2D canvas）
3. 期望：三者 `getComputedStyle(el).filter` 都等于 `url("#cgf-filter")`
4. 量化：暂停在同一帧 → `__cgf.on = false` 截图 → 打开截图 → 用 OpenCV 比 `mean|Δ|` 与拉普拉斯方差

## 代码风格

- 中文注释解释**为什么**（踩过什么坑、为什么不能用另一种写法），不复述代码在做什么
- DOM 注入一律走 `head` / shadow root；面板放 shadow DOM，避免与站点 CSS 互相污染
- 面板里给用户看的文案**不要出现英文单词**（`canvas` → 画布）
- 新增功能默认必须**关闭或无害**：新增上报/日志类功能默认 opt-in

## 安全红线

- ❌ 不读 `document.cookie`、不碰账号信息、不引入 `GM_*`（`@grant none` 是我们的隐私卖点，加 grant 会改变执行上下文）
- ❌ 任何外部请求；`fetch` 只允许指向 `127.0.0.1`
- ❌ 不用 `eval` / `new Function` / 远程代码
- ✅ 改完必须同步更新 `CHANGELOG.md` 与头部 `@version`（CI 会校验一致）

## 发布

1. 改 `@version` + `CHANGELOG.md`（两者必须一致）
2. `git tag vX.Y.Z && git push --tags`（GitHub Release 附上 `.user.js`）
3. GreasyFork 会按 raw 链接里的 `@version` **自动同步**，不需要手动重传
4. 发布前把 `@namespace` / `@homepageURL` / `@supportURL` / `@updateURL` / `@downloadURL` 里的 `yuelary` 换成真仓库路径
   （`tools/ci-check.mjs` 会检查这几项，且会**拒绝**指到 localhost 的更新地址）
