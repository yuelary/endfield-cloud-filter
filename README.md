# 云终末地滤镜 · Endfield Cloud Filter

### 《云·终末地》网页版画质增强 —— 一键装，立刻看得出

**画面发灰、边缘发糊、远处的树和房子像一团奶油？**
不是你网络的问题 —— 是云游戏为了省带宽，把画面**压软了**。

这个脚本在你**自己的浏览器里**给它补一层后处理：
**锐化 · 对比 S 曲线 · 饱和度 · 暗部提亮 · 色温**。

**零延迟**（滤镜由合成器直接吃，不经过服务端、不重新编码），
**连 canvas 渲染的画面也管** —— 这一点很关键，下面会讲为什么。

> 装它 30 秒，验证它 1 秒：面板上的「**按住对比**」，按住就前后切换，松开恢复。有用没用，一眼的事。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.6.1-blue.svg)](CHANGELOG.md)
[![Userscript](https://img.shields.io/badge/userscript-Tampermonkey%20%7C%20ScriptCat%20%7C%20Violentmonkey-green.svg)](#30-秒装好)
[![Zero telemetry](https://img.shields.io/badge/telemetry-none-brightgreen.svg)](#安全与隐私它不碰什么)

## 先看差别

同一个画面，关掉 / 开着滤镜（《云·终末地》网页版实机截图 —— 右上角那个小圆球，就是收起后的悬浮球）：

![开/关滤镜对比](docs/before-after.png)

<details>
<summary>面板长这样（点开看）</summary>

![面板截图](docs/panel.png)

</details>

## 它到底做了什么

网页云游戏的画面是**一路视频流**。为了省带宽，服务端把它压得很软、颜色发灰；
而你**既用不了** NVIDIA 控制面板的游戏滤镜，**也装不上** ReShade —— 浏览器里没有这两个东西的位置。

这个脚本补的就是这一层：在浏览器本地，直接给画面加滤镜。
**不经过服务端、不重新编码、不增加延迟**，装完刷新就能看出区别。

## 为什么不用现成的（这才是它存在的理由）

现成的视频增强扩展，基本只盯 `<video>` 这一个标签；
而云游戏**新的渲染路径是 WebCodecs 解码 → WebGL canvas 上屏** ——
这时候页面上可能压根没有在播的 `<video>`，那些扩展**整个失效**。

本项目把两条路都覆盖了。这就是它和"通用视频增强"最大的区别。

|  | 本项目 | 通用视频增强扩展 | 桌面端 ReShade / N 卡滤镜 |
| --- | --- | --- | --- |
| 网页云游戏 | ✅ 专门处理 | ⚠️ 只盯 `<video>`，canvas 流失效 | ❌ 注入不进浏览器 |
| canvas 渲染的流 | ✅ | ❌ | — |
| 额外延迟 | **零**（合成器直接吃） | 放大 / 插帧类**必然多一帧** | 零 |
| 可调参数 | 5 滑杆 + 5 预设 + **按住对比** | 视项目而定 | 最全 |

> 说句实在的：同类东西**早就有人做过**（`optimizer-plus` 就带锐化/对比/饱和度；`better-xcloud` 是纯优化）。
> 我们没发明任何新技术 —— SVG 滤镜是 2003 年的东西。
> 差异只在"**把 canvas 这条路也覆盖了**"，以及"零延迟"这条不将就的取舍。

## 它能做什么（说人话）

| 能力 | 说人话 |
| --- | --- |
| 锐化 | 远景、草叶、UI 文字都立起来，不再糊成一团 |
| 对比 S 曲线 | 去灰开雾：白天不惨白，晚上不发闷 |
| 饱和度 | 颜色更"实"，枫叶红得起来 |
| 暗部提亮 | 山洞、阴影里也看得清路 |
| 色温 | 想偏冷偏青、想偏暖偏黄，拖一下就有 |
| 5 个预设 | 默认 / 轻度 / 锐利 / 影院 / 夜间护眼，懒得调就点一下 |
| **按住对比** | 按住 = 临时关掉滤镜，一秒判断"到底有没有用" |
| 悬浮球 | 收起后变成小圆球，**可拖到任意位置、位置记住**，点一下展开 |
| 参数记忆 | 按站点各存各的，下次进来还是你调好的那套 |

## 实测数据（不是"感觉更清楚"，是量出来的）

暂停在**同一帧**做的 A/B，用 OpenCV 量化（锐度 = 拉普拉斯方差，越高越锐）：

| 区域 | 平均像素差 | 变化像素占比 | 锐度变化 |
| --- | --- | --- | --- |
| 整幅 | 5.41 | 49.8% | 545 → 631（**+15.7%**） |
| shadow DOM 里的 `<video>` | 6.94 | 63.6% | 171 → 304（**+77.8%**） |
| 普通 `<video>` | 3.87 | 36.0% | 920 → 959（**+4.2%**） |

复现方法见 [想自己改 / 想验证效果](#想自己改--想验证效果)（仓库里带测试台 `test/video-test.html`）。

## 30 秒装好

### 需要什么

| 需要 | 必须吗 | 说明 |
| --- | --- | --- |
| 一个用户脚本管理器 | **必须** | [Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/iikmkjmpaadaobahmlepeloendndfphd) / [脚本猫 ScriptCat](https://microsoftedge.microsoft.com/addons/detail/scriptcat/liilgpjgabokdklappibcjfablkpcekh) / Violentmonkey（Edge、Chrome、Firefox 都行） |
| 一个网页云游戏 | **必须** | 默认支持《云·终末地》网页版（`*.hypergryph.com` / `*.hypergryph.net` / `*.hycdn.cn`）与 B站 视频页；别的云游戏站加一行 `@match` 就行 |
| 账号 / 登录 | **不需要** | 脚本**不读 cookie、不碰账号**，装完即用 |
| Node.js | **不需要** | 只有想自己改代码、跑测试台时才要 |
| 花钱 | **不需要** | 免费，MIT |

### 方式一：GreasyFork（推荐）

打开 GreasyFork 页面 → 点「安装此脚本」。（发布后把链接填这里）

### 方式二：GitHub 直装

点开这个链接，脚本管理器会弹出安装页：

```
https://raw.githubusercontent.com/yuelary/endfield-cloud-filter/main/endfield-cloud-filter.user.js
```

### 方式三：本地 / 自建

```bash
git clone https://github.com/yuelary/endfield-cloud-filter.git
cd endfield-cloud-filter
node tools/serve.mjs      # 起一个只监听 127.0.0.1:8899 的静态服务
# 浏览器打开 http://127.0.0.1:8899/ → 点安装
```

### 想支持别的云游戏站

在脚本头部加一行 `@match`，例如：

```js
// @match  *://cloud.example.com/*
```

## 怎么用（三步）

1. 进游戏 → **右上角出现面板**（没出现的话，看下面「先说清楚」）
2. 拖滑杆实时调，或者点个预设一键套用
3. **拿不准有没有效果**：按住「**按住对比**」不放 —— 松开就恢复

不想看面板？点「收起」→ 变成小圆球（可拖动、点一下展开）；`Alt+G` 也能收起/展开。

## 先说清楚（免得你装完说被骗）

- **全屏时面板看不见**：全屏只渲染画面元素，但**滤镜照样生效** ⇒ 建议窗口模式调好参数再全屏
- **游戏锁鼠标时点不到面板** ⇒ 用 `Alt+G`
- **不做放大、不做插帧**：这是有意取舍 —— 插帧必然多一帧延迟，对云游戏是负收益
- **不改码率、不降延迟**：它只做画质后处理（那类优化是别的项目的活）
- canvas 只处理**最大的两个**且尺寸 ≥200×150，UI 上的小画布不动

## 安全与隐私（它不碰什么）

- ❌ **不读 cookie**、不读账号、不碰别人的 localStorage
- ❌ **不连任何外网**：脚本里没有一处外部请求
- ✅ **默认零上报**：连"往本机发调试信息"都是 opt-in（`localStorage['cgf-debug']='1'` 才开）
- ✅ `@grant none`、没有 `eval`、没有远程代码
- ⚠️ 它会给页面元素加 CSS `filter`，并劫持 `Element.prototype.attachShadow`（为了覆盖 shadow DOM 里的播放器）——
  这两件事都是可被页面检测到的，属于原理决定的，不是隐藏行为

## 项目构成

```
endfield-cloud-filter.user.js   脚本本体（唯一产物，直接就是可安装文件）
README.md  LICENSE  CHANGELOG.md
AGENTS.md                       给 AI 协作者的说明（含四个踩过的坑）
docs/                           截图 · 发布记录 · 发布文案
test/video-test.html            测试台：shadow DOM video + 普通 video + canvas
tools/serve.mjs                 本地静态服务（装脚本用，只监听 127.0.0.1）
tools/cdp.mjs                   调试工具：list / eval / inject / shot
.github/workflows/ci.yml        语法 + 元数据 + 零外联 + 版本一致性检查
```

## 想自己改 / 想验证效果

```bash
node --check endfield-cloud-filter.user.js    # 语法
node tools/ci-check.mjs                       # 元数据 / 版本 / 危险 API / 零外联
node tools/serve.mjs                          # 本地安装页
```

**做 A/B 量化**（上面那张表就是这么来的）：

1. 起一个带调试口的 Chromium（**独立 `--user-data-dir`**，别拿日常配置去开）
2. `node tools/cdp.mjs inject video-test endfield-cloud-filter.user.js` 注入测试台
3. 暂停在同一帧 → 关掉滤镜截图 → 打开截图 → 用 OpenCV 比 `mean|Δ|` 和拉普拉斯方差

## 常见问题

**Q：进游戏没反应？**
点面板里的「诊断」：会列出页面上找到的 `<video>` / `canvas`，以及**滤镜挂没挂**。
如果两者都是 0，说明播放器在别的域名的 iframe 里 ⇒ 加一行对应的 `@match`。

**Q：会不会被云游戏平台判定为作弊？**
它只改显示层的 CSS，不注入游戏内容、不自动化操作、不改网络数据。
但任何第三方脚本都存在被平台策略覆盖的可能，自行判断风险。

**Q：为什么不做成浏览器扩展？**
扩展要过商店审核、装起来更重；用户脚本对用户更透明 —— 打开就是 500 行可读代码。

## 贡献与反馈

- 觉得有用 → 给个 ⭐
- Bug / 想要支持新平台 → [Issues](https://github.com/yuelary/endfield-cloud-filter/issues)
- 提 PR 前跑一遍 `node tools/ci-check.mjs`

## 许可与致谢

**MIT** © 2026 yuelary

- 同类与灵感：[optimizer-plus](https://github.com/optimizerplus/optimizer-plus)（云游戏 + 滤镜）、
  [better-xcloud](https://github.com/redphx/better-xcloud)（云游戏优化的标杆）、
  [video-enhancer](https://github.com/treeks12/video-enhancer)（FSR/RCAS + 插帧）
- 技术：SVG `feGaussianBlur` + `feComposite`（非锐化掩模）、`feColorMatrix`、`feComponentTransfer`、
  `Element.prototype.attachShadow` 劫持
- 感谢把 AGENTS.md 变成事实标准的那些项目（[agents.md](https://agents.md/)）

## 关于"AI 写的"这件事

需求、取舍、验收是人定的；**代码、审计、文档是 AI（DeepSeek Harness）搓的**。

所以 —— **欢迎你翻一遍代码**：就 `endfield-cloud-filter.user.js` 一个文件，500 行出头，
没混淆、没压缩、没外链，翻起来不费劲。

我们把这句话写进 README，而不是藏在角落：一个 500 行、看得见摸得着、能用测试台自证的脚本，
比一个装满黑盒的"优化大师"踏实多了。
