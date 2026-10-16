// ==UserScript==
// @name         云终末地滤镜
// @name:en      Endfield Cloud Filter
// @namespace    https://github.com/yuelary/endfield-cloud-filter
// @version      1.6.4
// @description  给《云·终末地》网页版的画面加一层可调的后期处理：锐化、对比、饱和度、暗部提亮、色温。五个预设、按住按钮即可对比开关前后的差别；处理在本地完成，不经过服务器，不额外增加延迟。
// @description:en  Adjustable post-processing for the web version of Arknights: Endfield - sharpen, contrast, saturation, shadow lift and color temperature. Five presets, hold-to-compare, processed locally with no added latency.
// @author       yuelary
// @license      MIT
// @copyright    2026, yuelary
// @icon         https://raw.githubusercontent.com/yuelary/endfield-cloud-filter/main/icons/icon.png
// @homepageURL  https://github.com/yuelary/endfield-cloud-filter
// @supportURL   https://github.com/yuelary/endfield-cloud-filter/issues
// @updateURL    https://raw.githubusercontent.com/yuelary/endfield-cloud-filter/main/endfield-cloud-filter.user.js
// @downloadURL  https://raw.githubusercontent.com/yuelary/endfield-cloud-filter/main/endfield-cloud-filter.user.js
// @match        *://*.hypergryph.com/*
// @match        *://*.hypergryph.net/*
// @match        *://*.hycdn.cn/*
// @match        *://*.bilibili.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==
// ---------------------------------------------------------------------------
// 要支持别的云游戏站：在上面加一行 @match 即可，例如
//   // @match  *://cloud.example.com/*
// 注意这里**不再匹配 file:// 和 127.0.0.1**（2026-10-16 审计后收紧：没必要让每个本地网页都跑）。
// ---------------------------------------------------------------------------
/**
 * 云终末地滤镜 v1.6（用户脚本 · 单文件无依赖）
 * ============================================================================
 * 一句话：给网页云游戏叠一层类似 NVIDIA Freestyle 的后处理 —— 锐化 / 对比 S 曲线 /
 * 饱和度 / 暗部提亮 / 色温。**零额外帧延迟**（合成器直接吃 CSS/SVG 滤镜）。
 *
 * 为什么这么做（2026-10-16 实读云·终末地 index.cda000.js 得出的结论）：
 *   ① 视频轨走 WebRTC MediaStream → <video>.srcObject（RTCPeerConnection×4、srcObject×8、
 *      没有 new MediaSource），全包没有 requestMediaKeySystemAccess / widevine / playready
 *      ⇒ 没有 DRM、就是个普通 video 元素。
 *   ② 但**主渲染路径是 WebCodecs 解出 VideoFrame → texImage2D 画进 WebGL canvas**
 *      ⇒ 页面上可能压根没有在播的 <video>；只处理 video 等于没装（这一版两样都管）。
 *   ③ 站点自己也在用 CSS filter 调色（源码里的 _currentColorEnhanceLevel）
 *      ⇒ 我们的规则要带 !important 才压得住。
 *   SVG 滤镜由合成器直接吃，锐化/曲线都能做，还省掉每帧拷贝。
 *
 * v1.1 修的两个真问题：
 *   ① **shadow DOM**：有些播放器把 <video> 放进 shadow root —— 文档级的
 *      `video{...}` 规则**够不到** shadow tree（CSS 选择器不进影子树），
 *      而且 shadow 里的元素也引用不到文档里的 url(#filter)。
 *      ⇒ 这里劫持 Element.prototype.attachShadow，每个 shadow root 里都单独放一份
 *        滤镜定义 + 样式规则；已有的 root 也遍历一遍。
 *   ② **看不出区别**：加了一个「按住对比」按钮（按住=临时关掉滤镜），
 *      并把默认强度调高（锐化 1.6 / 对比 0.45），默认就能明显看出来。
 * ============================================================================
 */
/* ── 结构地图（改代码先看这里）────────────────────────────────────────────────
 *   settings/TUNE …… 配置与调参常量            curveTable()  … 曲线采样表
 *   filterXml()   …… 生成 SVG 滤镜（锐化/饱和/曲线）
 *   ensureIn()    …… 往"文档 + 每个 shadow root"各注入一份滤镜定义与规则
 *   surfaceTargets() … 选出要滤的元素（够大的 video + 最大的两个 canvas）
 *   applyInline()  …… 行内 !important 兜底；scheduleInline() 防抖
 *   diagnose()    …… 运行时事实（video/canvas 有没有、滤镜挂没挂）
 *   report()      …… 调试上报（默认关，见 opt-in 注释）
 *   buildUi()     …… 面板：wireSliders / wirePresets / wireToggles / wireFab / wireDiagnostics
 *   ── 启动：ensureIn → scanExisting → applyInline → 观察器 → 兜底定时器
 * 四个已踩过的坑写在 AGENTS.md，改渲染相关代码前务必读一遍。
 * ─────────────────────────────────────────────────────────────────────────── */(() => {
  'use strict';

  const DEFAULTS = { on: true, sharp: 1.6, sat: 1.2, contrast: 0.45, lift: 0.0, temp: 0.0, canvas: true };
  const PRESETS = {
    '默认':     { on: true, sharp: 1.6, sat: 1.20, contrast: 0.45, lift: 0.00, temp: 0.0 },
    '轻度':     { on: true, sharp: 1.0, sat: 1.15, contrast: 0.35, lift: 0.02, temp: 0.0 },
    '锐利':     { on: true, sharp: 2.0, sat: 1.10, contrast: 0.55, lift: 0.00, temp: 0.0 },
    '影院':     { on: true, sharp: 0.6, sat: 1.25, contrast: 0.50, lift: -0.02, temp: 0.25 },
    '夜间护眼': { on: true, sharp: 0.4, sat: 0.90, contrast: 0.25, lift: 0.06, temp: 0.50 },
  };
  const ROWS = [
    ['sharp', '锐化', 0, 3],
    ['sat', '饱和度', 0, 2],
    ['contrast', '对比 S 曲线', 0, 1],
    ['lift', '暗部提亮', -0.1, 0.15],
    ['temp', '色温', -1, 1],
  ];
  const NS = 'http://www.w3.org/2000/svg';
  const FID = 'cgf-filter';
  const KEY = 'cgf-settings';   // localStorage 按站点隔离 ⇒ 每个站各存各的

  /* 滤镜调参常量：集中放这里，别散落在算式里（数值都是实测定下来的，理由见 filterXml 的注释） */
  const TUNE = {
    sharpenAmt: 0.9,      // 非锐化掩模强度系数：实际强度 = sharpenAmt ×「锐化」滑杆
    blurBase: 0.5,        // 高斯模糊基础半径
    blurPerSharp: 0.45,   // 每 +1.0 锐化追加的半径（半径越大，锐化影响的边缘范围越宽）
    tempGain: 0.12,       // 色温推到两端时的通道增益幅度（R↑ / B↓）
    curveSteps: 5,        // 曲线采样段数（tableValues 个数 = curveSteps + 1）
  };

  const settings = { ...DEFAULTS };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* 坏数据就用默认 */ }

  const DEBUG = (() => { try { return localStorage.getItem('cgf-debug') === '1'; } catch { return false; } })();
  const log = (...a) => console.log('%c[CGF]', 'color:#4b9fff', ...a);
  /**
   * 静默失败的兜底 —— 用户脚本必须"出错也不能影响页面"，所以到处都是 try/catch；
   * 但**静默不等于没有原因**：默认闭嘴，`localStorage['cgf-debug']='1'` 之后才把原因打到控制台。
   */
  const soft = (what, fn, fallback) => {
    try { return fn(); } catch (e) {
      if (DEBUG) console.warn('[CGF] 忽略了一个错误（' + what + '）：', e && e.message);
      return fallback;
    }
  };
  const save = () => soft('保存设置', () => localStorage.setItem(KEY, JSON.stringify(settings)));

  /**
   * 曲线采样表：x → smoothstep 混合（对比）+ 提黑（lift），再乘通道增益（色温）。
   * 输出给 feComponentTransfer 的 tableValues（浏览器按线性插值取用）。
   */
  function curveTable(contrast, lift, gain) {
    const out = [];
    for (let i = 0; i <= TUNE.curveSteps; i++) {
      const x = i / TUNE.curveSteps;
      const s = x * x * (3 - 2 * x);                       // smoothstep：天然的 S 曲线
      const y = ((1 - contrast) * x + contrast * s + lift) * gain;
      out.push(Math.min(1, Math.max(0, y)).toFixed(3));
    }
    return out.join(' ');
  }

  /**
   * 生成 SVG 滤镜（每次调参重建一次，元素很少、开销可忽略）。
   * 锐化用**非锐化掩模**（orig + amt×(orig − blur)）而不是 3×3 卷积：
   * 卷积在亮画面/高对比处会被 [0,1] 钳位吃掉（实测：像素差很大但拉普拉斯方差几乎不涨），
   * 非锐化掩模更接近 RCAS 那类做法，边缘更自然、也不容易出白边。
   * k2 = 1+amt、k3 = −amt ⇒ 系数和为 1，保证整体亮度不变。
   */
  function filterXml() {
    const amt = (TUNE.sharpenAmt * settings.sharp).toFixed(2);
    const sd = (TUNE.blurBase + TUNE.blurPerSharp * settings.sharp).toFixed(2);
    const rg = 1 + settings.temp * TUNE.tempGain;
    const bg = 1 - settings.temp * TUNE.tempGain;
    return '<svg xmlns="' + NS + '"><filter color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">'
      + '<feGaussianBlur stdDeviation="' + sd + '" result="cgfBlur"/>'
      + '<feComposite in="SourceGraphic" in2="cgfBlur" operator="arithmetic" k1="0" k2="' + (1 + (+amt)).toFixed(2) + '" k3="-' + amt + '" k4="0"/>'
      + '<feColorMatrix type="saturate" values="' + (+settings.sat).toFixed(2) + '"/>'
      + '<feComponentTransfer>'
      + '<feFuncR type="table" tableValues="' + curveTable(+settings.contrast, +settings.lift, rg) + '"/>'
      + '<feFuncG type="table" tableValues="' + curveTable(+settings.contrast, +settings.lift, 1) + '"/>'
      + '<feFuncB type="table" tableValues="' + curveTable(+settings.contrast, +settings.lift, bg) + '"/>'
      + '</feComponentTransfer></filter></svg>';
  }

  /* ── 每个 tree scope（文档 + 每个 shadow root）各放一份定义和规则 ── */
  const scopes = new Set();
  // ⚠️ 2026-10-16 踩过的坑：不能往 document 直接 appendChild —— 一个 Document 只允许一个元素
  //    子节点（<html>），再塞 svg/style 会抛 HierarchyRequestError，被 catch 吞掉之后
  //    文档级那套就永远建不起来（表现为"过滤器只对 shadow 里的 video 生效"）。
  const mountOf = (root) => (root === document ? (document.head || document.documentElement) : root);
  function ensureIn(root) {
    if (scopes.has(root)) { rebuildIn(root); return; }
    try {
      const m = mountOf(root);
      if (!m) return;                       // 文档还没到可挂载的阶段，之后会重试
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('data-cgf', 'svg');
      svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
      svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
      const defs = document.createElementNS(NS, 'defs');
      const f = document.createElementNS(NS, 'filter');
      f.id = FID;
      defs.appendChild(f); svg.appendChild(defs);
      const style = document.createElement('style');
      style.setAttribute('data-cgf', 'style');
      m.appendChild(svg); m.appendChild(style);
      scopes.add(root);                     // 成功之后才记账 ⇒ 失败还能重试
      rebuildIn(root);
    } catch (e) { log('这个 root 注入失败：', e && e.message); }
  }
  function rebuildIn(root) {
    const svg = root.querySelector && root.querySelector('svg[data-cgf]');
    const style = root.querySelector && root.querySelector('style[data-cgf]');
    if (!svg || !style) return;
    const parsed = new DOMParser().parseFromString(filterXml(), 'image/svg+xml').querySelector('filter');
    if (parsed) {
      const target = svg.querySelector('filter');
      target.replaceChildren(...[...parsed.childNodes].map((n) => document.importNode(n, true)));
    }
    // !important：压过站点自己的 filter（云·终末地源码里有 _currentColorEnhanceLevel）
    style.textContent = settings.on ? 'video{filter:url(#' + FID + ') !important}' : '';
  }
  /* ── 行内保险：直接给"画面元素"打 filter（带 !important） ──
   * ⚠️ 2026-10-16 第二次踩坑（用户反馈"只能给视频用啊"）：**云游戏不一定画在 <video> 上**。
   *    云·终末地的包里是 `this.canvas.width = e.displayWidth; r.texImage2D(..., e)`
   *    ⇒ 主渲染路径是 **WebCodecs 解出 VideoFrame → 画进 WebGL canvas**，
   *      页面上可能压根没有在播的 <video>（它另有一个 <video id="WelinkGameVideo"> 走 WebRTC 备用）。
   *    ⇒ canvas 也得滤。CSS filter 对 canvas 一样有效，依然是合成器直接吃、零拷贝、零额外帧延迟。
   * 只滤"够大"的元素（小 canvas 多半是 UI/图标，别动），canvas 只取最大的两个。 */
  const MIN_W = 200, MIN_H = 150;
  function sizeOf(el) {
    const r = el.getBoundingClientRect ? el.getBoundingClientRect() : { width: 0, height: 0 };
    return {
      w: el.videoWidth || el.width || Math.round(r.width) || 0,
      h: el.videoHeight || el.height || Math.round(r.height) || 0,
    };
  }
  const isSurface = (el) => { const s = sizeOf(el); return s.w >= MIN_W && s.h >= MIN_H; };
  function collect(selector) {
    const out = [];
    const walk = (r) => {
      try {
        out.push(...r.querySelectorAll(selector));
        for (const el of r.querySelectorAll('*')) if (el.shadowRoot) walk(el.shadowRoot);
      } catch { /* 忽略 */ }
    };
    walk(document);
    return out;
  }
  const allVideos = () => collect('video');
  const allCanvases = () => collect('canvas');
  /** 这一轮要滤的元素：够大的 video（全部）+ 够大的 canvas（默认只取最大的两个） */
  function surfaceTargets() {
    const vids = allVideos().filter(isSurface);
    let cvs = allCanvases().filter(isSurface).sort((a, b) => (b.width * b.height) - (a.width * a.height));
    if (settings.canvas === false) cvs = [];
    return { vids, cvs: cvs.slice(0, 2) };
  }
  function applyInline() {
    const { vids, cvs } = surfaceTargets();
    const set = (el) => {
      try {
        if (settings.on) el.style.setProperty('filter', 'url(#' + FID + ')', 'important');
        else el.style.removeProperty('filter');
      } catch { /* 忽略 */ }
    };
    vids.forEach(set);
    cvs.forEach(set);
  }
  let queued = false;
  function scheduleInline() {
    if (queued) return;
    queued = true;
    setTimeout(() => {
      queued = false;
      applyInline();
      const { vids, cvs } = surfaceTargets();
      if (vids.length || cvs.length) report('surface-found');
    }, 250);
  }

  function rebuildAll() {
    ensureIn(document);                     // 文档级
    scopes.forEach((r) => { if (r !== document) rebuildIn(r); });
    applyInline();                          // 行内保险
    save();
  }

  // ① 劫持 attachShadow：之后创建的 shadow root 也自动覆盖
  try {
    const orig = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (...args) {
      const root = orig.apply(this, args);
      try { ensureIn(root); } catch { /* 忽略 */ }
      return root;
    };
  } catch (e) { log('attachShadow 劫持失败（不影响普通 video）：', e && e.message); }
  // ② 已经存在的 shadow root（document-start 时通常还没有，保险起见）
  function scanExisting() {
    const walk = (root) => {
      let els = [];
      try { els = root.querySelectorAll('*'); } catch { return; }
      for (const el of els) if (el.shadowRoot) { ensureIn(el.shadowRoot); walk(el.shadowRoot); }
    };
    walk(document);
  }

  /* ── 诊断（也是我这边最想要的运行时事实）：video 和 canvas 都要看 ── */
  function diagnose() {
    const elements = [];
    const walk = (root, path) => {
      try {
        for (const el of root.querySelectorAll('video, canvas')) {
          const s = sizeOf(el);
          elements.push({
            where: path,
            kind: el.tagName.toLowerCase(),
            size: s.w + 'x' + s.h,
            rtc: el.tagName === 'VIDEO' ? !!el.srcObject : undefined,
            filter: getComputedStyle(el).filter,
            big: isSurface(el),
          });
        }
        for (const el of root.querySelectorAll('*')) if (el.shadowRoot) walk(el.shadowRoot, path + ' > ' + el.tagName.toLowerCase() + '[shadow]');
      } catch { /* 忽略 */ }
    };
    walk(document, 'doc');
    const { vids, cvs } = surfaceTargets();
    // ⚠️ 故意不去探测 canvas 的上下文类型（getContext('webgl2') 会把还没初始化的 canvas **创建** 成 WebGL，
    //    那是副作用，可能把站点的 2D canvas 搞坏）—— 这里只报尺寸和"有没有吃到滤镜"。
    return {
      videos: elements.filter((e) => e.kind === 'video').length,
      canvases: elements.filter((e) => e.kind === 'canvas').length,
      filtering: { videos: vids.length, canvases: cvs.length },
      on: settings.on, canvas: settings.canvas !== false, elements,
    };
  }

  /* ── 回报通道：把运行情况 POST 到本机 8899（只在本机，走本地服务写日志） ──
   * 为什么需要：云游戏页是 SPA + 可能跑在 iframe 里，光看"装没装"没法判断滤镜到底挂上没有。
   * 这个页面没有 CSP（2026-10-16 实测响应头），所以 fetch 到 127.0.0.1 不会被拦。
   * 只发运行事实（页面地址、video 尺寸/是否 WebRTC/计算出的 filter、面板在不在），不发任何隐私内容。 */
  const REPORT_URL = 'http://127.0.0.1:8899/report';
  const REPORT_HOST = /(^|\.)(hypergryph\.(com|net)|hycdn\.cn)$/i;
  let reportCount = 0;
  function report(tag) {
    // 公开版原则：**默认零上报**（opt-in）。只有在控制台执行
    //   localStorage['cgf-debug'] = '1'
    // 之后才会发，而且只发到本机 127.0.0.1:8899（开发者排障用）。
    // 也就是说：普通人装了这个脚本，**不会有任何数据离开浏览器**。
    try { if (localStorage.getItem('cgf-debug') !== '1') return; } catch { return; }
    if (reportCount >= 8) return;
    // 审计后收紧：只在"云游戏站本身"或"页面上确实有画面元素"时回报，
    // 免得把随便逛的页面（比如 B站 首页）也发过来。发的内容只有页面地址 + 元素尺寸/滤镜状态。
    const s = surfaceTargets();
    if (!REPORT_HOST.test(location.host) && s.vids.length === 0 && s.cvs.length === 0) return;
    reportCount++;
    try {
      const d = diagnose();
      fetch(REPORT_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tag, ts: new Date().toISOString(), url: location.href, host: location.host,
          panel: !!document.getElementById('cgf-ui-host'), scopes: scopes.size,
          settings: { ...settings },
          videos: d.videos, canvases: d.canvases, filtering: d.filtering, elements: d.elements,
        }),
        keepalive: true,
      }).catch(() => { /* 服务没开就算了 */ });
    } catch { /* 忽略 */ }
  }

  /* ── 面板（只在顶层文档建一个，放 shadow DOM 里避免被页面 CSS 影响） ── */
  let shadow = null, panel = null, noteEl = null, holdBtn = null, fabEl = null;
  let collapsed = false;
  /** 收起 / 展开（收起 = 面板隐藏、悬浮球出现） */
  function setCollapsed(v) {
    collapsed = !!v;
    if (panel) panel.style.display = collapsed ? 'none' : 'block';
    if (fabEl) fabEl.style.display = collapsed ? 'flex' : 'none';
  }
  const togglePanel = () => setCollapsed(!collapsed);
  function buildUi() {
    if (document.getElementById('cgf-ui-host') || !document.body) return;
    if (window.top !== window.self) return;   // 只在顶层文档建面板（iframe 里建了也看不见，还会重复）
    const host = document.createElement('div');
    host.id = 'cgf-ui-host';
    host.style.cssText = 'all:initial';
    shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host{all:initial}
        .p{position:fixed;right:12px;top:12px;z-index:2147483647;width:228px;
           background:rgba(18,20,24,.93);color:#eaeaea;border-radius:10px;padding:10px 12px;
           font:12px/1.7 system-ui,"Segoe UI",sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.5)}
        .h{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
        .h b{font-size:13px}.h span{cursor:pointer;opacity:.55}.h span:hover{opacity:1}
        .row{margin-bottom:5px}
        .lab{display:flex;justify-content:space-between}.lab i{font-style:normal;opacity:.7}
        input[type=range]{width:100%;margin:0 0 2px;accent-color:#4b9fff}
        .bar{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
        button{cursor:pointer;background:#2a2f37;color:#eaeaea;border:0;border-radius:6px;padding:5px 8px;font:12px system-ui}
        button:hover{background:#39404b}
        #hold{flex:1;background:#2b5d9e}#hold:active{background:#c33}
        .pre button{padding:4px 8px;font-size:11px}
        .dg{margin-top:8px;padding-top:6px;border-top:1px solid #ffffff1a;font-size:11px;opacity:.75;
            word-break:break-all;white-space:pre-line;display:none;line-height:1.6}
        /* 收起后的小悬浮球（像手机上的悬浮按钮，可拖到任意位置） */
        .fab{position:fixed;right:12px;top:12px;z-index:2147483647;width:40px;height:40px;border-radius:50%;
             background:rgba(24,27,33,.95);color:#dcdcdc;border:1px solid #ffffff24;display:none;
             align-items:center;justify-content:center;font:500 12px/1 system-ui,sans-serif;cursor:grab;
             box-shadow:0 4px 14px rgba(0,0,0,.5);user-select:none;touch-action:none}
        .fab:hover{background:rgba(43,93,158,.97);color:#fff}
        .fab:active{cursor:grabbing}
        .fab i{font-style:normal;pointer-events:none;letter-spacing:0}
      </style>
      <div class="p">
        <div class="h"><b>云终末地滤镜</b><span id="x" title="收起成悬浮球（快捷键 Alt+G）">收起</span></div>
        <div id="rows"></div>
        <div class="bar pre" id="pre"></div>
        <div class="bar"><button id="hold">按住对比</button><button id="tog"></button></div>
        <div class="bar"><button id="dg" style="flex:1">诊断</button></div>
        <div class="dg" id="note"></div>
      </div>
      <div class="fab" id="fab" title="云终末地滤镜：点开面板（可拖动）"><i>滤</i></div>`;
    (document.body || document.documentElement).appendChild(host);

    wireSliders();
    wirePresets();
    wireToggle();

    wireFab();

    wireHold();

    wireDiagnostics();
    panel = shadow.querySelector('.p');
    setCollapsed(false);      // 默认展开（别让面板一上来就是收起的）
    showDiagnostics();        // 先算一次：数据就绪，文字默认仍是收起的
  }
  function syncUi() {
    if (!shadow) return;
    const rows = shadow.getElementById('rows').children;
    ROWS.forEach(([key], i) => {
      if (!rows[i]) return;
      rows[i].querySelector('input').value = settings[key];
      rows[i].querySelector('[data-v]').textContent = (+settings[key]).toFixed(2);
    });
    const tog = shadow.getElementById('tog');
    if (tog) tog.textContent = settings.on ? '关掉滤镜' : '打开滤镜';
  }

  /* ── 面板的各个部件：buildUi 只负责搭壳子，接线都拆在这里 ── */

  /** 5 个滑杆：拖动即改设置并重建滤镜 */
  function wireSliders() {
    const rows = shadow.getElementById('rows');
    for (const [key, label, min, max] of ROWS) {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = '<div class="lab"><span>' + label + '</span><i data-v>' + (+settings[key]).toFixed(2) + '</i></div>';
      const input = document.createElement('input');
      input.type = 'range'; input.min = min; input.max = max; input.step = 0.01; input.value = settings[key];
      input.addEventListener('input', () => {
        settings[key] = +input.value;
        row.querySelector('[data-v]').textContent = (+input.value).toFixed(2);
        rebuildAll();
      });
      row.appendChild(input);
      rows.appendChild(row);
    }
  }

  /** 预设按钮：一键套用一组参数 */
  function wirePresets() {
    const box = shadow.getElementById('pre');
    for (const name of Object.keys(PRESETS)) {
      const btn = document.createElement('button');
      btn.textContent = name;
      btn.addEventListener('click', () => { Object.assign(settings, PRESETS[name]); syncUi(); rebuildAll(); });
      box.appendChild(btn);
    }
  }

  /** 总开关（注意：画布过滤**默认开**且没有按钮 —— 云游戏多是画布渲染，关了就等于没装；
   *  真要关：控制台 `__cgf.set({ canvas: false })`） */
  function wireToggle() {
    const tog = shadow.getElementById('tog');
    tog.textContent = settings.on ? '关掉滤镜' : '打开滤镜';
    tog.addEventListener('click', () => { settings.on = !settings.on; syncUi(); rebuildAll(); });
  }

  /** 「按住对比」：按住时临时关掉滤镜，松开恢复 —— 一眼看出前后差异 */
  function wireHold() {
    holdBtn = shadow.getElementById('hold');
    const apply = (v) => { const bak = settings.on; settings.on = v; rebuildAll(); settings.on = bak; };
    const down = (e) => { e.preventDefault(); apply(false); holdBtn.textContent = '松开恢复…'; };
    const up = () => { apply(settings.on); holdBtn.textContent = '按住对比'; };
    holdBtn.addEventListener('pointerdown', down);
    holdBtn.addEventListener('pointerup', up);
    holdBtn.addEventListener('pointerleave', up);
    holdBtn.addEventListener('pointercancel', up);
  }

  /** 悬浮球：可拖动、位置记住、单击展开（收起逻辑见 setCollapsed） */
  function wireFab() {
    fabEl = shadow.getElementById('fab');
    const saved = soft('读取悬浮球位置', () => JSON.parse(localStorage.getItem('cgf-fab') || 'null'), null);
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      fabEl.style.left = saved.x + 'px'; fabEl.style.top = saved.y + 'px'; fabEl.style.right = 'auto';
    }
    const drag = { on: false, moved: false, x0: 0, y0: 0, ox: 0, oy: 0 };
    fabEl.addEventListener('pointerdown', (e) => {
      const rect = fabEl.getBoundingClientRect();
      Object.assign(drag, { on: true, moved: false, x0: e.clientX, y0: e.clientY, ox: rect.left, oy: rect.top });
      fabEl.style.left = rect.left + 'px'; fabEl.style.top = rect.top + 'px'; fabEl.style.right = 'auto';
      soft('捕获指针', () => fabEl.setPointerCapture(e.pointerId));
    });
    fabEl.addEventListener('pointermove', (e) => {
      if (!drag.on) return;
      const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;   // 超过 4px 才算拖动，否则当点击
      const w = fabEl.offsetWidth || 40, h = fabEl.offsetHeight || 40;
      fabEl.style.left = Math.max(0, Math.min(window.innerWidth - w, drag.ox + dx)) + 'px';
      fabEl.style.top = Math.max(0, Math.min(window.innerHeight - h, drag.oy + dy)) + 'px';
    });
    const endDrag = (e) => {
      if (!drag.on) return;
      drag.on = false;
      soft('释放指针', () => fabEl.releasePointerCapture(e.pointerId));
      if (drag.moved) {
        soft('记住悬浮球位置', () => localStorage.setItem('cgf-fab',
          JSON.stringify({ x: parseInt(fabEl.style.left, 10), y: parseInt(fabEl.style.top, 10) })));
      } else { setCollapsed(false); }   // 没拖动 ⇒ 当成"点了一下" ⇒ 展开
    };
    fabEl.addEventListener('pointerup', endDrag);
    fabEl.addEventListener('pointercancel', endDrag);
  }

  /** 诊断：把运行时事实翻成人话写进面板（并把机器数据回报给开发者，默认关） */
  function showDiagnostics() {
    const d = diagnose();
    const kindLabel = (k) => (k === 'video' ? '视频' : (k === 'canvas' ? '画布' : k));
    const whereLabel = (w) => String(w).replace(/\bdoc\b/g, '文档').replace(/\[shadow\]/g, '〔影子树〕');
    const lines = ['画面元素：视频 ' + d.videos + ' · 画布 ' + d.canvases
      + '　已挂滤镜：视频 ' + d.filtering.videos + ' · 画布 ' + d.filtering.canvases];
    for (const el of d.elements) {
      lines.push('· ' + kindLabel(el.kind) + ' ' + el.size + ' @' + whereLabel(el.where)
        + (el.filter && el.filter !== 'none' ? ' 已挂 ✓' : ' 没挂 ✗'));
    }
    if (!d.elements.length) lines.push('· 这个页面暂时没有画面元素（进游戏后再看）');
    noteEl.textContent = lines.join('\n');
    log('诊断', d);
    report('manual');
    return d;
  }

  /** 诊断按钮 = 开/关那块文字；标题上的「收起」= 缩成悬浮球 */
  function wireDiagnostics() {
    noteEl = shadow.getElementById('note');
    shadow.getElementById('dg').addEventListener('click', () => {
      const open = noteEl.style.display === 'block';
      if (!open) showDiagnostics();
      noteEl.style.display = open ? 'none' : 'block';
    });
    shadow.getElementById('x').addEventListener('click', () => setCollapsed(true));
  }

  /* ── 启动 ── */
  ensureIn(document);
  scanExisting();
  applyInline();                            // 行内保险先打一遍
  // 审计后改的：只在"新出现了 video/canvas"时才重算 —— 原来每次 DOM 变动都全量遍历
  // （大页面 + 每条变动一次 walk，开销不可控）。另外低频补一遍，防站点擦掉我们打的 inline filter。
  try {
    new MutationObserver((records) => {
      for (const r of records) {
        for (const n of r.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (n.tagName === 'VIDEO' || n.tagName === 'CANVAS'
            || (n.querySelector && n.querySelector('video,canvas'))) { scheduleInline(); return; }
        }
      }
    }).observe(document, { childList: true, subtree: true });
  } catch { /* 观察不到也不致命 */ }
  setInterval(applyInline, 5000);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { scanExisting(); applyInline(); buildUi(); }, { once: true });
  } else { scanExisting(); applyInline(); buildUi(); }
  setTimeout(() => report('load'), 4000);   // 4 秒后回报一次（含 video 情况），让我这边能远程确认

  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'g' || e.key === 'G') && panel) togglePanel();
  }, true);

  // 外部控制接口（调试/自动化用；油猴 @grant none 下挂在页面 window 上）
  try {
    window.__cgf = {
      get settings() { return { ...settings }; },
      set(patch) { Object.assign(settings, patch || {}); syncUi(); rebuildAll(); return { ...settings }; },
      preset(name) { if (PRESETS[name]) { Object.assign(settings, PRESETS[name]); syncUi(); rebuildAll(); } return { ...settings }; },
      set on(v) { settings.on = !!v; syncUi(); rebuildAll(); },
      get on() { return settings.on; },
      get scopes() { return scopes.size; },
      diagnose,
    };
  } catch { /* 挂不上就算了，不影响面板 */ }

  log('已就绪 v1.1：右上角面板 / Alt+G 收起 / 按住「对比」看前后差异 / 参数按站点记忆');
})();
