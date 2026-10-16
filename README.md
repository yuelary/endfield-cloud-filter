# 云终末地滤镜 · Endfield Cloud Filter

> 给**《云·终末地》网页版**（以及其它网页云游戏）叠一层类似 NVIDIA Freestyle 的后处理：锐化 · 对比 S 曲线 · 饱和度 · 暗部提亮 · 色温。
> **纯 CSS/SVG，零额外帧延迟**；`<video>` 和 **canvas 渲染**的流都管；参数按站点自动记忆。

> ### ⚠️ 先说清楚：这是 **AI 写的**（vibe coded）
> 需求、取舍、验收是人提的，**代码、审计、文档是 AI agent（DeepSeek Harness）写的**。
> 用之前**请自己看一遍代码** —— 就 `endfield-cloud-filte.user.js` 一个文件，500 行出头，没有混淆、没有压缩、没有外链。
> 我们宁可把这句话放在第一屏，也不藏在角落。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.6.1-blue.svg)](CHANGELOG.md)
[![Userscript](https://img.shields.io/badge/userscript-Tampermonkey%20%7C%20ScriptCat%20%7C%20Violentmonkey-green.svg)](#快速开始)
[![Zero telemetry](https://img.shields.io/badge/telemetry-none-brightgreen.svg)](#安全与隐私)

**同一个画面，关掉 / 开着滤镜的实机对比**（《云·终末地》网页版；右上角那个小圆球就是收起后的悬浮球）：

![开/关滤镜对比](docs/before-after.png)

<details>
<summary>面板长这样（点开看）</summary>

![面板截图](docs/panel.png)

</details>

## 它是什么

网页云游戏的画面是**一路视频流**。为了省带宽，服务端把它压得很软、颜色发灰；而浏览器里**既用不了** NVIDIA 控制面板的游戏滤镜，也**装不上** ReShade。

这个脚本补的就是这一层：**在浏览器本地**给游戏画面加滤镜 —— 不经过服务端、不重新编码、**不增加延迟**。

## 为什么不用现成的（这才是它存在的理由）

现成的视频增强扩展基本只盯 `<video>` 元素；而云游戏的**新渲染路径是 WebCodecs 解码 → WebGL canvas 上屏**，这时它们**整个失效**。本项目把两条路都覆盖了。

|  | 本项目 | 通用视频增强扩展 | 桌面端 ReShade / N 卡滤镜 |
| --- | --- | --- | --- |
| 网页云游戏 | ✅ 专门处理 | ⚠️ 只盯 `<video>`，canvas 流失效 | ❌ 注入不进浏览器 |
| canvas 渲染的流 | ✅ | ❌ | — |
| 额外延迟 | **零**（合成器直接吃滤镜） | 放大 / 插帧类**必然多一帧** | 零 |
| 可调参数 | 5 滑杆 + 5 预设 + **按住对比** | 视项目而定 | 最全 |

> 顺带说清楚：同类项目**早就有人做过**（`optimizer-plus` 就带 Sharpness / contrast / saturation；`better-xcloud` 是纯优化）。
> 我们没有发明任何新技术（SVG filter 是 2003 年的东西）。差异只在"**把 canvas 这条路也覆盖了**"以及零延迟这条取舍。

## 核心能力

| 能力 | 说明 |
| --- | --- |
| 后处理滤镜 | 锐化（非锐化掩模）· 对比 S 曲线 · 饱和度 · 暗部提亮 · 色温 |
| 5 个预设 | 默认 / 轻度 / 锐利 / 影院 / 夜间护眼（可自行改默认值） |
| **按住对比** | 按住按钮 = 临时关掉滤镜，1 秒判断"到底有没有用" |
| 悬浮球 | 收起后面板缩成一个小圆球，**可拖到任意位置**、位置记住、点一下展开（`Alt+G` 同效） |
| 参数记忆 | 按站点存（`localStorage`），每个云游戏各存各的 |
| 覆盖面 | `<video>`（含 **shadow DOM** 里的）+ **≥200×150 的 canvas**（最多两个，避免误伤 UI 小画布） |
| 抗干扰 | 站点自己的 `filter` 会被 `!important` 压过；换通道/重连重建元素后自动重挂 |

## 实测数据

不是"看着差不多"，是**暂停在同一帧**后做的 A/B，用 OpenCV 量化（锐度 = 拉普拉斯方差）：

| 区域 | 平均像素差 | 变化像素 | 锐度变化 |
| --- | --- | --- | --- |
| 整幅 | 5.41 | 49.8% | 545 → 631（**+15.7%**） |
| shadow DOM 里的 `<video>` | 6.94 | 63.6% | 171 → 304（**+77.8%**） |
| 普通 `<video>` | 3.87 | 36.0% | 920 → 959（**+4.2%**） |

复现方法见 [开发与自测](#开发与自测)（仓库里带测试台 `test/video-test.html`）。

## 快速开始

### 需要什么（前置条件）

| 需要 | 是否必须 | 说明 |
| --- | --- | --- |
| 一个用户脚本管理器 | **必须** | [Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/iikmkjmpaadaobahmlepeloendndfphd) 或 [脚本猫 ScriptCat](https://microsoftedge.microsoft.com/addons/detail/scriptcat/liilgpjgabokdklappibcjfablkpcekh) 或 Violentmonkey（Edge / Chrome / Firefox 都行） |
| 一个网页云游戏 | **必须** | 默认支持《云·终末地》网页版（`*.hypergryph.com` / `*.hypergryph.net` / `*.hycdn.cn`）与 B站 视频页；别的云游戏站加一行 `@match` 即可 |
| 登录 / 账号 | 不需要 | 脚本**不读 cookie、不碰账号**，装完即用 |
| Node.js | 不需要 | 只有想自己改代码、跑本地测试台时才要 |
| 付费 | 不需要 | 免费，MIT |

### 方式一：GreasyFork（推荐）

打开 GreasyFork 页面 → 点「安装此脚本」。（`yuelary`：发布后把链接填这里）

### 方式二：GitHub 直装

点这个链接，管理器会弹安装页：

```
https://raw.githubusercontent.com/yuelary/endfield-cloud-filte/main/endfield-cloud-filte.user.js
```

### 方式三：本地 / 自建

```bash
git clone https://github.com/yuelary/endfield-cloud-filte.git
cd endfield-cloud-filte
node tools/serve.mjs      # 起个只监听 127.0.0.1:8899 的静态服务
# 浏览器打开 http://127.0.0.1:8899/ → 点安装
```

### 支持其它云游戏站

在脚本头部加一行 `@match`，例如：

```js
// @match  *://cloud.example.com/*
```

## 用法

1. 进游戏 → **右上角出现面板**（若没有，看下面的已知限制）
2. 拖滑杆实时调；点预设一键切换
3. **拿不准有没有效果**：按住「按住对比」不放 —— 松开恢复
4. 不想看面板：点「收起」→ 变成小圆球（可拖动）→ 点球展开；`Alt+G` 也可以

## 已知限制

- **全屏时面板看不见**：全屏只渲染那个画面元素，**但滤镜照样生效** ⇒ 建议窗口模式调好参数再全屏
- **游戏锁鼠标时点不到面板** ⇒ 用 `Alt+G`
- **不做放大 / 插帧**：这是有意取舍 —— 插帧必然多一帧延迟，对云游戏是负收益
- **不改码率 / 不降延迟**：它只做画质后处理（那类优化是别的项目的活）
- canvas 只处理**最大的两个**且尺寸 ≥200×150，UI 上的小画布不动

## 安全与隐私

- ❌ **不读 cookie**、不读账号、不碰 `localStorage` 里别人的东西
- ❌ **不连任何外网**：脚本里没有一处外部请求
- ✅ 默认**零上报**：公开版连"往本机发调试信息"都是 opt-in（`localStorage['cgf-debug']='1'` 才开）
- ✅ `@grant none`、没有 `eval`、没有远程代码
- ⚠️ 它会给页面元素加 CSS `filter`，并劫持 `Element.prototype.attachShadow`（为了覆盖 shadow DOM 里的播放器）—— 这两件事都是可被页面检测到的，这是原理决定的，不是隐藏行为

## 项目构成

```
endfield-cloud-filte.user.js   脚本本体（唯一产物，直接就是可安装文件）
README.md  LICENSE  CHANGELOG.md
AGENTS.md                   给 AI 协作者的说明（含三个踩过的坑）
docs/                       截图
test/video-test.html        测试台：shadow DOM video + 普通 video + canvas
tools/serve.mjs             本地静态服务（装脚本用，只监听 127.0.0.1）
tools/cdp.mjs               调试工具：list / eval / inject / shot（需要浏览器开调试口）
.github/workflows/ci.yml    语法 + 元数据 + 版本一致性检查
```

## 开发与自测

```bash
node --check endfield-cloud-filte.user.js        # 语法
node tools/ci-check.mjs                       # 元数据 / 版本 / 危险 API 检查
node tools/serve.mjs                          # 本地安装页
```

**做 A/B 量化**（README 那张表就是这么来的）：

1. 起一个带调试口的 Chromium（**独立 `--user-data-dir`**，别用日常配置）：`--remote-debugging-port=9222`
2. `node tools/cdp.mjs inject video-test endfield-cloud-filte.user.js` 注入测试台
3. 暂停视频在同一帧 → `__cgf.on = false` 截图 → 打开截图 → 用 OpenCV 比 `mean|Δ|` 与拉普拉斯方差

## 常见问题

**Q：进游戏没反应？**
点面板里的「诊断」：会列出页面上找到的 `<video>` / `canvas` 以及**滤镜挂没挂**。如果两者都是 0，说明播放器在别的域名的 iframe 里 ⇒ 加一行对应的 `@match`。

**Q：会不会被云游戏平台判定为作弊？**
它只改显示层的 CSS，不注入游戏内容、不自动化操作、不改网络数据。但**任何第三方脚本都存在被平台策略覆盖的可能**，自行判断风险。

**Q：为什么不做成扩展？**
扩展要过商店审核、装起来更重；用户脚本对用户更透明（打开就是 400 行可读的代码）。

## 贡献与反馈

- 觉得有用 → 给个 ⭐
- Bug / 新平台支持 → [Issues](https://github.com/yuelary/endfield-cloud-filte/issues)
- 提 PR 前请跑一遍 `tools/ci-check.mjs`

## 许可与致谢

**MIT** © 2026 yuelary

- 灵感与同类：[optimizer-plus](https://github.com/optimizerplus/optimizer-plus)（云游戏 + 滤镜）、[better-xcloud](https://github.com/redphx/better-xcloud)（云游戏优化的标杆）、[video-enhancer](https://github.com/treeks12/video-enhancer)（FSR/RCAS + 插帧）
- 技术：SVG `feGaussianBlur` + `feComposite`（非锐化掩模）、`feColorMatrix`、`feComponentTransfer`、`Element.prototype.attachShadow` 劫持
- 感谢 Anthropic/OpenAI/… 那些把 AGENTS.md 变成事实标准的项目（[agents.md](https://agents.md/)）

## AI 声明

**本项目是 AI 协作完成的**：需求、取舍、验收由使用者提出，代码、审计与文档由 AI agent（DeepSeek Harness）写。

⇒ **用之前请自己看一遍代码**（就 `endfield-cloud-filte.user.js` 一个文件，400 行出头，没有混淆、没有外链）。我们知道这句话该说，就写在 README 里，而不是藏在角落。
