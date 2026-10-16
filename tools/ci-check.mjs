#!/usr/bin/env node
/**
 * tools/ci-check.mjs —— 发布前自检（零依赖，node 直接跑）
 * ============================================================================
 * 用法：
 *   node tools/ci-check.mjs            # 日常：占位符只当警告
 *   node tools/ci-check.mjs --strict   # 正式发布：占位符也算错误
 *
 * 检查项（都是真踩过的）：
 *   ① 头部元数据是否齐全（缺 @license / @homepageURL 这类，GreasyFork 体验会打折）
 *   ② @updateURL / @downloadURL 是否指向**公网 https** —— 指向 127.0.0.1 的话
 *      别人装上就永远更新不了（我们真犯过这个错）
 *   ③ 危险 API（eval / new Function / document.cookie / XHR / GM_*）
 *   ④ **零外联**：代码里出现的 URL 只允许 w3.org（SVG 命名空间）和 127.0.0.1
 *   ⑤ @match 是否过宽（file 协议、全站通配、本机地址，一律拒）
 *   ⑥ CHANGELOG 里有没有当前 @version 的条目（版本一致性）
 * ============================================================================
 */
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, basename } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
// 自动找仓库根目录里那个唯一的 *.user.js —— 改仓库名 / 改文件名后不用回来改这里
const SCRIPT = (() => {
  const found = readdirSync(ROOT).filter((f) => f.endsWith('.user.js'))
  if (found.length !== 1) {
    console.error(`仓库根目录应该有且只有一个 *.user.js，现在找到 ${found.length} 个：${found.join(', ')}`)
    process.exit(1)
  }
  return join(ROOT, found[0])
})()
const CHANGELOG = join(ROOT, 'CHANGELOG.md')
const STRICT = process.argv.includes('--strict')

const errors = []
const warnings = []
const src = readFileSync(SCRIPT, 'utf8')
const lines = src.split('\n')

/* ── ① 头部元数据 ── */
const meta = {}
for (const line of lines) {
  if (/^\s*\/\/\s*==\/UserScript==/.test(line)) break
  const m = /^\s*\/\/\s*@([A-Za-z:.\-]+)\s+(.*)$/.exec(line)
  if (!m) continue
  ;(meta[m[1]] ||= []).push(m[2].trim())
}
const REQUIRED = ['name', 'namespace', 'version', 'description', 'author', 'license',
  'homepageURL', 'supportURL', 'updateURL', 'downloadURL', 'match', 'run-at', 'grant']
for (const k of REQUIRED) if (!meta[k]) errors.push(`头部缺少 @${k}`)

const version = meta.version?.[0] ?? ''
if (version && !/^\d+\.\d+\.\d+$/.test(version)) errors.push(`@version 不是语义化版本：${version}`)

/* ── ② 更新地址必须是公网 https ── */
for (const k of ['updateURL', 'downloadURL', 'homepageURL', 'supportURL']) {
  const v = meta[k]?.[0] ?? ''
  if (!/^https:\/\//.test(v)) errors.push(`@${k} 必须是 https 公网地址：${v || '(空)'}`)
  else if (/127\.0\.0\.1|localhost/.test(v)) errors.push(`@${k} 指向本机，别人装了永远更新不了：${v}`)
}
if ((meta.namespace?.[0] ?? '').startsWith('local.')) errors.push('@namespace 还是 local.*，发布前换成仓库地址')

/* ── ③ 危险 API ── */
const BANNED = [
  [/\beval\s*\(/, 'eval('],
  [/new\s+Function\s*\(/, 'new Function('],
  [/document\.cookie/, 'document.cookie（隐私红线）'],
  [/XMLHttpRequest/, 'XMLHttpRequest'],
  [/GM_(setValue|getValue|xmlhttpRequest|addStyle|registerMenuCommand)/, 'GM_*（会改变执行上下文）'],
]
for (const [re, name] of BANNED) if (re.test(src)) errors.push(`出现被禁用的 API：${name}`)

/* ── ④ 零外联：代码里的 URL 只允许 w3.org / 127.0.0.1 ── */
const code = lines.filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
const ALLOW = [/^https?:\/\/www\.w3\.org\//, /^https?:\/\/127\.0\.0\.1(:\d+)?\//]
for (const m of code.matchAll(/https?:\/\/[^\s'"`)]+/g)) {
  const url = m[0]
  if (!ALLOW.some((re) => re.test(url))) errors.push(`代码里出现外部地址（零外联原则）：${url}`)
}

/* ── ⑤ @match 不能过宽 ── */
for (const v of meta.match ?? []) {
  if (v.startsWith('file:')) errors.push(`@match 含 file://（每个本地网页都会跑）：${v}`)
  if (/\*:\/\/\*\/\*/.test(v)) errors.push(`@match 全站通配：${v}`)
  if (/127\.0\.0\.1|localhost/.test(v)) errors.push(`@match 含本机地址：${v}`)
}

/* ── ⑥ 版本一致性 ── */
const changelog = readFileSync(CHANGELOG, 'utf8')
if (version && !changelog.includes(`## [${version}]`)) errors.push(`CHANGELOG.md 里没有 ${version} 的条目`)

/* ── ⑦ settings.* 只用 DEFAULTS 里声明过的键 ──
 * 来历：2026-10-16 我用大小写不敏感的批量替换把局部变量 `s.w` 误改成了 `settings.w`，
 * 结果"画布不再被过滤、诊断计数恒为 0"—— 这类错字靠肉眼很难发现，交给机器查。 */
const defaultsBody = /const DEFAULTS = \{([^}]*)\}/.exec(src)?.[1] ?? ''
const allowedKeys = new Set([...defaultsBody.matchAll(/(\w+)\s*:/g)].map((m) => m[1]))
const usedKeys = new Set([...code.matchAll(/\bsettings\.(\w+)/g)].map((m) => m[1]))
for (const k of usedKeys) {
  if (!allowedKeys.has(k)) errors.push(`用到 settings.${k}，但 DEFAULTS 里没有这个键（多半是改名改错）`)
}
/* ── 占位符 ── */
for (const [k, vs] of Object.entries(meta)) {
  for (const v of vs) {
    if (v.includes('CHANGE_ME')) (STRICT ? errors : warnings).push(`@${k} 里还有占位符 CHANGE_ME：${v}`)
  }
}

const kb = Buffer.byteLength(src) / 1024
if (kb > 100) warnings.push(`脚本 ${kb.toFixed(1)} KB，偏大（用户脚本一般 <100 KB）`)

console.log(`endfield-cloud-filter.user.js  ${kb.toFixed(1)} KB  @version ${version || '?'}`)
for (const w of warnings) console.log('  [警告] ' + w)
for (const e of errors) console.log('  [错误] ' + e)
if (errors.length) {
  console.log(`\n不通过：${errors.length} 个错误${STRICT ? '（--strict）' : ''}`)
  process.exit(1)
}
console.log(`\n通过${warnings.length ? `（${warnings.length} 个警告，发布时用 --strict 复查）` : ''}`)
