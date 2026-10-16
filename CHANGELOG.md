# 更新日志

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [语义化版本](https://semver.org/lang/zh-CN/)。
版本号同时出现在 `CHANGELOG.md` 与用户脚本头部的 `@version`（CI 会校验一致）。

## [1.6.3] - 2026-10-16

### 修复

- 补回丢失的 @icon（上一步替换时整行被吃掉），指向仓库里的 icons/icon.png`n
## [1.6.2] - 2026-10-16

### 变更

- 脚本图标改用仓库里的 icons/icon.png（在脚本管理器的列表里显示更清楚）
- README 改成居中版式，并把「不读数据 / 不改文件 / 不连外网」放到最显眼的位置

## [1.6.1] - 2026-10-16

### 变更

- 项目更名为**云终末地滤镜 / Endfield Cloud Filter**（面板标题、悬浮球提示、控制台文案同步）

## [1.6.0] - 2026-10-16

### 新增
- 补全发布用元数据：`@license` / `@copyright` / `@homepageURL` / `@supportURL` / `@icon` / `@namespace`，以及指向 GitHub raw 的 `@updateURL` / `@downloadURL`（旧版指向 `127.0.0.1`，别人装了永远更新不了）
- 新增 `AGENTS.md`（给 AI 协作者的说明）、`tools/ci-check.mjs`、GitHub Actions CI

### 变更
- **默认零上报**：调试上报改为 opt-in（`localStorage['cgf-debug'] = '1'` 才发，且只发本机）
- `@match` 收紧：移除 `file:///*` 与 `*://127.0.0.1/*`
- 发布用文件名改为 `endfield-cloud-filter.user.js`

## [1.5.2] - 2026-10-16

### 修复（安全审计）
- 本地工具服务的路径检查由前缀比较改为 `path.relative`（原写法可被同级目录绕过）
- 回报日志不再对外可读；来源白名单取代 CORS `*`；加 60 条/分限速
- DOM 观察器只在"新出现 video/canvas"时重算（原来每次变动全量遍历，大页面会卡）

## [1.5.0] - 2026-10-16

### 变更
- 诊断信息默认隐藏，点「诊断」才展开；内容从 JSON 换成人话
- 移除「画布也滤」按钮（画布过滤保持默认开启，可通过 `__cgf.set({canvas:false})` 关闭）

## [1.4.x] - 2026-10-16

### 新增
- **收起 = 悬浮球**：可拖动、位置记住、单击展开（`Alt+G` 同效）
- 面板中文化（`canvas` → 画布；诊断项全部中文）

### 修复
- 面板可能一进来就是收起状态

## [1.3.0] - 2026-10-16

### 新增
- **支持 canvas 渲染的流**（云游戏的 WebCodecs → WebGL canvas 路径；此前只处理 `<video>`，在这类游戏里完全无效）

## [1.2.0] - 2026-10-16

### 新增
- 调试上报通道（仅本机，后于 1.6.0 改为 opt-in）

## [1.1.0] - 2026-10-16

### 修复
- **文档级注入从未生效**：`document.appendChild(svg)` 抛 `HierarchyRequestError` 被 catch 吞掉 ⇒ 游戏里（画面在文档中）完全没有效果；改为挂到 `<head>`
- shadow DOM 覆盖：劫持 `attachShadow`，每个 shadow root 单独注入滤镜定义与规则
- 锐化由 3×3 卷积改为**非锐化掩模**（卷积在亮画面上会被 `[0,1]` 裁切吃掉，实测锐度几乎不涨）

### 新增
- 「按住对比」按钮

## [1.0.0] - 2026-10-16

### 新增
- 首版：SVG 滤镜（锐化 + 对比 S 曲线 + 饱和度 + 暗部提亮 + 色温）挂在 `<video>` 上，带可调面板与站点级参数记忆
