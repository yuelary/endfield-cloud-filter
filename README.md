<p align="center">
  <img src="icons/icon.png" alt="云终末地滤镜" width="160" height="160" />
</p>

<h1 align="center">云终末地滤镜 · Endfield Cloud Filter</h1>

<p align="center">
  《明日方舟：终末地》网页云游戏（云·终末地）的画面滤镜：<b>锐化、对比、饱和度、暗部提亮、色温</b>。<br />
  参数可调，5 个预设，按住按钮即可对比开关前后的差别。<br />
  <i>只改画面的显示效果：不读游戏数据、不修改游戏文件、不连接外部网络。</i>
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

面向《明日方舟：终末地》网页云游戏的轻量画面增强工具。不修改游戏文件，通过浏览器端的后处理调整画面锐度、对比度、饱和度、阴影与色温，按个人喜好取一个舒服的效果。

本项目由 **DeepSeek** 完成开发：从代码编写到功能实现都依靠 DeepSeek，作者负责提出需求、确定功能方向、实际测试，并根据使用体验持续调整。

![面板](docs/panel.png)

## 功能特性

- **画面增强**：自由调整锐度、对比度、饱和度、阴影与色温
- **多种预设**：默认、轻度、锐利、影院、夜间护眼
- **实时对比**：按住按钮即可临时查看原始画面
- **便捷操作**：面板可收起为悬浮球，拖动到任意位置，点击即展开
- **自动保存**：按站点记住参数，下次使用无需重新设置
- **本地处理**：画面在浏览器中处理，不经过服务器

同一画面，关掉与开着滤镜：

![对比](docs/before-after.png)

## 安装

1. 先装一个用户脚本管理器：[Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/iikmkjmpaadaobahmlepeloendndfphd) /
   [脚本猫 ScriptCat](https://microsoftedge.microsoft.com/addons/detail/scriptcat/liilgpjgabokdklappibcjfablkpcekh) /
   Violentmonkey（Edge、Chrome、Firefox 均可）
2. 点这个链接安装脚本，管理器会弹出安装页：

   ```
   https://raw.githubusercontent.com/yuelary/endfield-cloud-filter/main/endfield-cloud-filter.user.js
   ```

3. 打开《明日方舟：终末地》网页云游戏，右上角出现面板即可用
4. `Alt+G` 收起或展开面板；按住「按住对比」可对比开关前后


## 两处限制

- **全屏时面板不显示**，滤镜仍然生效：建议窗口模式下调好参数再全屏
- **游戏锁定鼠标时点不到面板**：用 `Alt+G`

## 隐私

- 不读取 cookie 与账号信息
- 不发起任何外部网络请求
- 默认不发送任何数据（本地调试信息需手动开启 `localStorage['cgf-debug'] = '1'`）




## 常见问题

**画面没有变化？**
点面板上的「诊断」。如果它显示的数量是 0，说明滤镜没找到游戏画面。

## 几点说明

**非官方**：本项目为玩家社区制作的非官方画面增强工具，与鹰角网络及《明日方舟：终末地》官方无关。

**适用范围**：仅在《明日方舟：终末地》网页云游戏与 B站 视频页测过。全屏时面板不显示（滤镜照常生效）；游戏锁定鼠标时用 `Alt+G`。

**开发**：由 **DeepSeek** 完成。欢迎提交问题反馈与功能建议。

## 许可

MIT © 2026 yuelary

更新记录见 [CHANGELOG.md](CHANGELOG.md)。
