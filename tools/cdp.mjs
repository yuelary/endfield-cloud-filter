/**
 * cdp.mjs —— 通过 Chrome DevTools Protocol 操作「影子 Edge」（不依赖任何 npm 包）
 * ============================================================================
 * 用途：Edge 155 不给默认配置开调试口，所以我们用一份复制出来的配置
 *      （F:\ds\edge-cgprofile）配 --remote-debugging-port=9222 启动，再从这里操作它。
 *
 * 用法：
 *   node cdp.mjs list
 *   node cdp.mjs eval  <url子串> "<js 表达式>"
 *   node cdp.mjs inject <url子串> <脚本文件>      # 立刻执行 + 以后每个新文档也自动执行
 *   node cdp.mjs shot  <url子串> <输出.png>
 * ============================================================================
 */
import { readFileSync, writeFileSync } from 'node:fs'

const PORT = process.env.CGF_PORT || 9222
const BASE = `http://127.0.0.1:${PORT}`

const [cmd, ...rest] = process.argv.slice(2)

async function targets() {
  const r = await fetch(`${BASE}/json/list`)
  return (await r.json()).filter((t) => t.type === 'page' && t.webSocketDebuggerUrl)
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    ws.addEventListener('open', () => resolve(ws), { once: true })
    ws.addEventListener('error', (e) => reject(new Error('ws error: ' + (e?.message || 'unknown'))), { once: true })
  })
}

let nextId = 1
function send(ws, method, params = {}) {
  const id = nextId++
  return new Promise((resolve, reject) => {
    const onMsg = (ev) => {
      let m
      try { m = JSON.parse(ev.data) } catch { return }
      if (m.id !== id) return
      ws.removeEventListener('message', onMsg)
      if (m.error) reject(new Error(JSON.stringify(m.error)))
      else resolve(m.result)
    }
    ws.addEventListener('message', onMsg)
    ws.send(JSON.stringify({ id, method, params }))
  })
}

async function pick(sub) {
  const ts = await targets()
  const hit = ts.find((t) => t.url.includes(sub))
  if (!hit) throw new Error(`没找到 URL 含「${sub}」的页面。现有：\n` + ts.map((t) => '  ' + t.url).join('\n'))
  return hit
}

if (cmd === 'list') {
  const ts = await targets()
  for (const t of ts) console.log(`[${t.type}] ${t.title}\n    ${t.url}`)
} else if (cmd === 'eval') {
  const [sub, expr] = rest
  const t = await pick(sub)
  const ws = await connect(t.webSocketDebuggerUrl)
  const r = await send(ws, 'Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  console.log(JSON.stringify(r.result?.value ?? r.result, null, 2))
  ws.close()
} else if (cmd === 'inject') {
  const [sub, file] = rest
  const src = readFileSync(file, 'utf8')
  const t = await pick(sub)
  const ws = await connect(t.webSocketDebuggerUrl)
  await send(ws, 'Page.enable')
  const r1 = await send(ws, 'Page.addScriptToEvaluateOnNewDocument', { source: src })
  const r2 = await send(ws, 'Runtime.evaluate', { expression: src, returnByValue: true })
  console.log('已注入：', t.url)
  console.log('  以后每个新文档自动执行:', r1.identifier)
  console.log('  立刻执行的结果:', JSON.stringify(r2.result?.value ?? r2.result))
  ws.close()
} else if (cmd === 'shot') {
  const [sub, out] = rest
  const t = await pick(sub)
  const ws = await connect(t.webSocketDebuggerUrl)
  const r = await send(ws, 'Page.captureScreenshot', { format: 'png' })
  writeFileSync(out, Buffer.from(r.data, 'base64'))
  console.log('已截图：', out)
  ws.close()
} else {
  console.log('用法: node cdp.mjs list | eval <url子串> <js> | inject <url子串> <file> | shot <url子串> <out.png>')
  process.exit(1)
}
