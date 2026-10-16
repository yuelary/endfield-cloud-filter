# 云终末地滤镜

《云·终末地》网页版的画面滤镜。装好后，游戏画面上会多一层可调的后期处理：
**锐化、对比、饱和度、暗部提亮、色温**。

处理在浏览器本地完成，不经过服务器，不会额外增加延迟。

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

**方式一（推荐）**：打开 GreasyFork 页面，点「安装此脚本」。（发布后把链接填这里）

**方式二**：打开下面这个地址，管理器会弹出安装页：

```
https://raw.githubusercontent.com/yuelary/endfield-cloud-filter/main/endfield-cloud-filter.user.js
```

**方式三（自己改代码用）**：

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
3. 想确认效果，按住「按住对比」不放

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

复现方法见下面「自己验证」。

## 项目文件

```
endfield-cloud-filter.user.js   脚本本体（一个文件，直接就是可安装文件）
README.md  LICENSE  CHANGELOG.md
AGENTS.md                       给 AI 协作者的说明（含踩过的坑）
docs/                           截图 · 发布记录 · 发布文案
test/video-test.html            测试页
tools/serve.mjs                 本地静态服务（装脚本用，只监听 127.0.0.1）
tools/cdp.mjs                   调试工具：list / eval / inject / shot
.github/workflows/ci.yml        语法、元数据、版本一致性检查
```

## 自己改 / 自己验证

```bash
node --check endfield-cloud-filter.user.js    # 语法
node tools/ci-check.mjs                       # 元数据 / 版本 / 依赖检查
node tools/serve.mjs                          # 本地安装页
```

复现上面那张测试表：

1. 起一个带调试口的 Chromium（用独立的 `--user-data-dir`，别用日常配置）
2. `node tools/cdp.mjs inject video-test endfield-cloud-filter.user.js` 注入测试页
3. 暂停在同一帧，关掉滤镜截图、再打开截图，用 OpenCV 比 `mean|Δ|` 和拉普拉斯方差

## 常见问题

**进游戏没有面板？**
点面板里的「诊断」会列出页面上找到的 video 和滤镜状态。如果数量是 0，说明播放器在别的域名的 iframe 里，加一行对应的 `@match` 就行。

**会不会被平台判定为作弊？**
它只改显示层的 CSS，不注入游戏内容、不自动化操作、不改网络数据。但任何第三方脚本都存在被平台策略覆盖的可能，自己判断。

## 许可

MIT © 2026 yuelary

## 说明

需求、取舍、验收由我负责；代码和文档由 AI（DeepSeek Harness）协助完成。
脚本是单个文件，没有压缩也没有混淆，可以直接打开看。
