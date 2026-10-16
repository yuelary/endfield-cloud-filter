/**
 * serve.mjs —— 本地只读静态服务 + 脚本回报收集（v2：审计后加固）
 * ============================================================================
 * 只监听 127.0.0.1:8899；只服务 F:\ds\cloudgame-filter 这一个目录。
 *
 * 2026-10-16 审计发现并修掉的三处：
 *   ① 路径检查用的是 `file.startsWith(ROOT)` —— 前缀判断能被**同级目录**绕过
 *      （`..\cloudgame-filter2` 拼出来仍以 ROOT 开头）。改成 path.relative 判断。
 *   ② 之前 CORS 是 `*`，而且**什么文件都发** ⇒ 任何网站都能 fetch 本机 8899 读走
 *      `reports.jsonl`（里面有你的页面地址）。现在：来源白名单 + 扩展名白名单 + 屏蔽 jsonl/点文件。
 *   ③ /report 没有速率限制 ⇒ 任意页面能刷爆磁盘。现在：限 60 条/分钟 + 单条 20KB 上限。
 * ============================================================================
 */
import { createServer } from 'node:http'
import { readFile, appendFile } from 'node:fs/promises'
import { join, extname, normalize, relative, isAbsolute } from 'node:path'

const ROOT = 'F:\\ds\\cloudgame-filter'
const PORT = 8899
const REPORTS = join(ROOT, 'reports.jsonl')
const ALLOWED_EXT = new Set(['.js', '.html', '.md', '.png'])
const BLOCKED_FILES = new Set(['reports.jsonl'])
const TYPE = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
}

/** 允许的来源：云游戏站 / B站 / 本机 / file://（Origin: null） */
const ORIGIN_OK = /^(https?:\/\/([a-z0-9-]+\.)*(hypergryph\.com|hypergryph\.net|hycdn\.cn|bilibili\.com)(:\d+)?|http:\/\/127\.0\.0\.1(:\d+)?)$/i
const originAllowed = (origin) => !origin || origin === 'null' || ORIGIN_OK.test(origin)

let reportWindow = { at: 0, n: 0 }
const reportRateOk = () => {
  const now = Date.now()
  if (now - reportWindow.at > 60_000) reportWindow = { at: now, n: 0 }
  reportWindow.n += 1
  return reportWindow.n <= 60
}

createServer(async (req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
  const stamp = new Date().toISOString().slice(11, 19)
  const origin = req.headers.origin

  // CORS：只回白名单来源（不再用 *）
  if (origin && originAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin === 'null' ? 'null' : origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  // ── 脚本自报 ──
  if (req.method === 'POST' && urlPath === '/report') {
    if (!originAllowed(origin)) { res.writeHead(403); res.end('origin not allowed'); return }
    if (!reportRateOk()) { res.writeHead(429); res.end('too many reports'); return }
    let body = ''
    req.on('data', (c) => { body += c; if (body.length > 20000) req.destroy() })
    req.on('end', async () => {
      const line = JSON.stringify({ at: new Date().toISOString(), ...safeParse(body) })
      try { await appendFile(REPORTS, line + '\n', 'utf8') } catch { /* 写不了也不影响 */ }
      console.log(`[${stamp}] REPORT ${line}`)
      res.writeHead(204); res.end()
    })
    return
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end('method not allowed'); return }

  // ── 静态文件（白名单 + 严格路径检查）──
  const rel = urlPath === '/' ? 'index.html' : normalize(urlPath).replace(/^[\\/]+/, '')
  const file = join(ROOT, rel)
  const within = (() => {
    const r = relative(ROOT, file)
    return r !== '' && !r.startsWith('..') && !isAbsolute(r)
  })()
  const ext = extname(file).toLowerCase()
  const base = file.split(/[\\/]/).pop() || ''
  try {
    if (!within) throw new Error('outside root')
    if (base.startsWith('.') || BLOCKED_FILES.has(base.toLowerCase())) throw new Error('blocked file')
    if (!ALLOWED_EXT.has(ext)) throw new Error('blocked ext ' + ext)
    const data = await readFile(file)
    res.writeHead(200, { 'content-type': TYPE[ext] || 'application/octet-stream' })
    res.end(req.method === 'HEAD' ? undefined : data)
    console.log(`[${stamp}] ${req.method} ${urlPath} -> 200 ${data.length}B`)
  } catch (e) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('not found: ' + rel)
    console.log(`[${stamp}] ${req.method} ${urlPath} -> 404 (${e.message})`)
  }
}).listen(PORT, '127.0.0.1', () => console.log(`serving ${ROOT} on http://127.0.0.1:${PORT}`))

function safeParse(text) {
  try { return JSON.parse(text) } catch { return { raw: String(text).slice(0, 1000) } }
}
