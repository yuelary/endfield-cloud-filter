<p align="center">
  <img src="icons/icon.png" alt="云终末地滤镜" width="160" height="160" />
</p>

<h1 align="center">云终末地滤镜</h1>

<p align="center">
  《云·终末地》网页版的画面滤镜：<b>锐化、对比、饱和度、暗部提亮、色温</b>。<br />
  参数随时可调，有 5 个预设；按住按钮就能对比开关前后的差别。<br />
  <i>只改画面的显示效果 —— 不读游戏数据、不修改任何文件、不连接外部网络。</i><br />
  由 <b>DeepSeek</b> 完成
</p>

<p align="center">
  中文说明 | <a href="README_en.md">English Readme</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://github.com/yuelary/endfield-cloud-filter/releases"><img src="https://img.shields.io/github/v/release/yuelary/endfield-cloud-filter" alt="release"></a>
  <img src="https://img.shields.io/badge/telemetry-none-brightgreen.svg" alt="telemetry: none">
</p>

<p align="center">
  <a href="https://raw.githubusercontent.com/yuelary/endfield-cloud-filter/main/endfield-cloud-filter.user.js">
    <img src="https://img.shields.io/badge/%E5%AE%89%E8%A3%85-%E7%82%B9%E8%BF%99%E9%87%8C-2ea44f?style=for-the-badge" alt="安装">
  </a>
</p>

处理在浏览器本地完成，不经过服务器。

![面板](docs/panel.png)

## 功能

- **锐化**：边缘更清楚一些
- **对比 S 曲线**：压掉一点灰蒙蒙的感觉
- **饱和度**：颜色浓一点或者淡一点
- **暗部提亮**：阴影部分更亮一些
- **色温**：整体偏冷或者偏暖
- **5 个预设**：默认 / 轻度 / 锐利 / 影院 / 夜间护眼，懒得调就点一下
- **按住对比**：按住按钮临时关掉滤镜，松开恢复，方便看开关前后的差别
- **悬浮球**：面板收起后变成一个小圆球，可以拖到不挡画面的位置，位置会记住，点一下展开
- **参数记忆**：按站点保存，下次进游戏还是上次调好的那套

同一个画面，关掉和开着滤镜：

![对比](docs/before-after.png)

## 安装

### 先装一个用户脚本管理器

[Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/iikmkjmpaadaobahmlepeloendndfphd) 或
[脚本猫 ScriptCat](https://microsoftedge.microsoft.com/addons/detail/scriptcat/liilgpjgabokdklappibcjfablkpcekh) 或
Violentmonkey，Edge / Chrome / Firefox 都可以。

### 再装脚本

**最省事**：打开安装页 <https://yuelary.github.io/endfield-cloud-filter/>，点页面上的按钮

**直接装**：点开下面这个地址，脚本管理器会弹出安装页：

```
https://raw.githubusercontent.com/yuelary/endfield-cloud-filter/main/endfield-cloud-filter.user.js
```

**或者从 Releases 下载**：到 [Releases](https://github.com/yuelary/endfield-cloud-filter/releases) 下载最新的
`endfield-cloud-filter.user.js`，把文件拖进浏览器窗口也能安装。

**自己改代码用**：

```bash
git clone https://github.com/yuelary/endfield-cloud-filter.git
cd endfield-cloud-filter
node tools/serve.mjs      # 起一个只监听 127.0.0.1:8899 的静态服务
# 浏览器打开 http://127.0.0.1:8899/ → 点安装
```

### 支持其它云游戏站

在脚本头部加一行 `@match`，例如：

```js
// @match  *://cloud.example.com/*
```

## 使用

1. 进游戏，右上角会出现面板
2. 拖滑杆调参数，或者点一个预设
3. 想确认效果，按住面板上的「按住对比」不放

面板挡画面的时候，点「收起」变成小圆球拖到一边；`Alt+G` 也可以收起和展开。

## 两处限制

- **全屏时面板不显示**（滤镜仍然生效）—— 建议在窗口模式下调好参数再全屏
- **游戏锁定鼠标时点不到面板** —— 用 `Alt+G`

## 隐私

- 不读取 cookie，不读取账号信息
- 不请求任何外部网络
- 默认不发送任何数据（本地调试信息也要手动开启 `localStorage['cgf-debug'] = '1'` 才会发）

## 测试数据

把画面暂停在同一帧，关掉滤镜截一张、开着滤镜截一张，用 OpenCV 对比（锐度用拉普拉斯方差，数值越高越锐）：

| 区域 | 平均像素差 | 变化像素占比 | 锐度变化 |
| --- | --- | --- | --- |
| 整幅 | 5.41 | 49.8% | 545 → 631 |
| 影子树里的 video | 6.94 | 63.6% | 171 → 304 |
| 普通 video | 3.87 | 36.0% | 920 → 959 |

这个表是这么来的：把画面暂停在同一帧，按住面板上的「按住对比」各截一张图，再用 OpenCV 比 `mean|Δ|` 和拉普拉斯方差。

## 仓库里有什么

| 文件 | 说明 |
| --- | --- |
| `endfield-cloud-filter.user.js` | 脚本本体，一个文件，直接就是可安装的那个文件 |
| `README.md` / `README_en.md` | 中文 / 英文说明 |
| `CHANGELOG.md` | 每个版本改了什么 |
| `LICENSE` | MIT |
| `test/video-test.html` | 测试页，想看效果可以直接打开它 |

其余的都在 `tools/`（本地工具）、`docs/`（截图和记录）和 `.github/workflows/`（自动检查与安装页发布）里。

## 想改代码？

脚本就是一个文件，直接改它就行。改完建议做两件事：

1. 把头部的 `@version` 加一位，并在 `CHANGELOG.md` 里写一句改了什么 —— 这两样必须对得上，自动检查会核对
2. 跑一遍下面的检查，确认没把元数据改坏、也没引入外部请求

```bash
node --check endfield-cloud-filter.user.js    # 语法
node tools/ci-check.mjs                       # 元数据、版本一致性、有没有外部请求
```

想先在本地试再发出去：跑 `node tools/serve.mjs`，它会起一个只监听 `127.0.0.1:8899` 的页面，打开点按钮就能装。

## 常见问题

**进游戏没有面板？**
点面板里的「诊断」会列出页面上找到的 video 和滤镜状态。如果数量是 0，说明播放器在别的域名的 iframe 里，加一行对应的 `@match` 就行。

## 几点说明

**关于风险**：这个脚本只改画面的显示效果 —— 不碰游戏数据、不自动操作、不读账号信息。
拿不准的地方和所有第三方脚本一样：平台规则以后怎么变，谁也说不准，自己拿个主意。
不想要了，在脚本管理器里删掉就干净了。

**关于适用范围**：只在《云·终末地》网页版和 B站 视频页上试过，别的站点没有测。
全屏时面板不会显示（滤镜照常生效）；游戏锁定鼠标时用 `Alt+G`。

**关于代码**：这个脚本由 **DeepSeek** 完成（需求、取舍和验收由 yuelary 负责）。
脚本就是一个文件、五百来行，没有压缩、没有混淆，也没有任何联网请求 ——
想确认它到底做了什么，直接打开看就行。

## 许可

MIT © 2026 yuelary

更新记录见 [CHANGELOG.md](CHANGELOG.md)。
