<p align="center">
  <img src="icons/icon.png" alt="Endfield Cloud Filter" width="160" height="160" />
</p>

<h1 align="center">Endfield Cloud Filter</h1>

<p align="center">
  A picture filter for the web (cloud) version of <b>Arknights: Endfield</b>:
  <b>sharpen, contrast, saturation, shadow lift, color temperature</b>.<br />
  Adjustable, five presets, hold a button to compare on and off.<br />
  <i>It only changes how the picture is displayed: no game data is read, no game file is modified, no network request is made.</i>
</p>

<p align="center">
  <a href="README.md">中文说明</a> | English Readme
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://github.com/yuelary/endfield-cloud-filter/releases"><img src="https://img.shields.io/github/v/release/yuelary/endfield-cloud-filter" alt="release"></a>
  <img src="https://img.shields.io/badge/telemetry-none-brightgreen.svg" alt="telemetry: none">
</p>

<p align="center">
  <a href="https://raw.githubusercontent.com/yuelary/endfield-cloud-filter/main/endfield-cloud-filter.user.js">
    <img src="https://img.shields.io/badge/Install-click%20here-2ea44f?style=for-the-badge" alt="Install">
  </a>
</p>

A lightweight picture-enhancement tool for the web version of Arknights: Endfield. It does not modify any game file; it adjusts sharpness, contrast, saturation, shadows and color temperature through browser-side post-processing, so you can tune the look to your own taste.

This project was built by **DeepSeek**: the code and the implementation came from DeepSeek, while the author defined the requirements and direction, tested it in practice, and kept refining it based on real use.

![Panel](docs/panel.png)

## Features

- **Picture enhancement**: freely adjust sharpness, contrast, saturation, shadows and color temperature
- **Multiple presets**: Default, Light, Sharp, Cinema, Night
- **Instant compare**: hold a button to temporarily view the original picture
- **Easy to handle**: the panel collapses into a floating ball you can drag anywhere and click to expand
- **Saved automatically**: per-site parameters are remembered, so there is nothing to set up again
- **Processed locally**: the picture is processed in your browser, nothing goes through a server

Same scene, filter off and on:

![Before and after](docs/before-after.png)

## Install

1. Install a userscript manager:
   [Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/iikmkjmpaadaobahmlepeloendndfphd) /
   [ScriptCat](https://microsoftedge.microsoft.com/addons/detail/scriptcat/liilgpjgabokdklappibcjfablkpcekh) /
   Violentmonkey (Edge, Chrome and Firefox all work)
2. Install the script from this link; your manager shows an install page:

   ```
   https://raw.githubusercontent.com/yuelary/endfield-cloud-filter/main/endfield-cloud-filter.user.js
   ```

3. Open the web version of Arknights: Endfield; the panel appears in the top right
4. `Alt+G` collapses or expands the panel; hold **Hold to compare** to see the difference


## Two limitations

- **No panel in fullscreen** (the filter still applies): set it up in windowed mode
- **Panel not clickable when the game locks the mouse**: use `Alt+G`

## Privacy

- No cookies or account information
- No external network request
- No data sent by default (local debug reports require `localStorage['cgf-debug'] = '1'`)




## FAQ

**The picture does not change?**
Click 诊断 on the panel. If the count is 0, the filter did not find the game picture.

## Notes

**Unofficial**: this is a community-made picture-enhancement tool, not affiliated with Hypergryph or with Arknights: Endfield.

**Scope**: tested only on the web version of Arknights: Endfield and on Bilibili video pages. The panel is hidden in fullscreen (the filter still applies); use `Alt+G` when the game locks the mouse.

**Development**: built by **DeepSeek**. Issues and suggestions are welcome.

## License

MIT © 2026 yuelary

See [CHANGELOG.md](CHANGELOG.md) for the version history.
