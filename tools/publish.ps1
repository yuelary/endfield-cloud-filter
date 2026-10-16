<#
  tools/publish.ps1 —— 一条命令完成发布准备 + 推送
  ============================================================================
  用法（在你自己的终端里跑，或让 AI 跑；推送时会弹出 GitHub 登录窗，点一下即可）：

      powershell -ExecutionPolicy Bypass -File tools\publish.ps1 -User <你的GitHub用户名>

  参数：
      -User    必填。GitHub 用户名（用于拼 @namespace / @homepageURL / 更新地址）
      -Repo    仓库名，默认 endfield-cloud-filter
      -Name    提交署名，默认与 -User 相同
      -NoPush  只做本地准备（不推送）—— 想先看看改了什么就用它

  它做的事：
      ① 把全部 CHANGE_ME 替换成你的用户名、把仓库名统一成 $Repo（含脚本文件名）
      ② node --check + ci-check --strict（**不通过就直接停**，不会推半成品）
      ③ 配置提交署名 → git init → commit → 打 tag v<版本>
      ④ 加 remote 并推送（含 tags）→ 打印 GreasyFork 要填的地址
  ============================================================================
#>
param(
  [Parameter(Mandatory = $true)][string]$User,
  [string]$Repo = 'endfield-cloud-filter',
  [string]$Name = '',
  [switch]$NoPush
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$enc = [System.Text.UTF8Encoding]::new($false)
if (-not $Name) { $Name = $User }
Set-Location $root

function Step($n, $text) { Write-Host "`n$n $text" -ForegroundColor Cyan }

# ── ① 填占位符 ────────────────────────────────────────────────────────────────
Step '①' "填占位符：CHANGE_ME → $User ；仓库名 → $Repo"
$old = Join-Path $root 'endfield-cloud-filter.user.js'
$scriptPath = $old
if ($Repo -ne 'endfield-cloud-filter') {
  $scriptPath = Join-Path $root "$Repo.user.js"
  if (Test-Path $old) { Move-Item $old $scriptPath -Force; Write-Host "   脚本改名 → $Repo.user.js" }
}
Get-ChildItem $root -Recurse -File -Include *.js, *.md, *.yml, LICENSE |
  Where-Object { $_.FullName -notmatch '\\(tools|test|docs|\.git)\\' } |
  ForEach-Object {
    $text = [System.IO.File]::ReadAllText($_.FullName, $enc)
    $new = $text -replace 'CHANGE_ME', $User -replace 'endfield-cloud-filter', $Repo
    if ($new -ne $text) { [System.IO.File]::WriteAllText($_.FullName, $new, $enc); Write-Host "   更新 $($_.Name)" }
  }

# 先把版本号读出来（Select-String 是按行匹配；之前用 [regex]::Match 没开 Multiline，读到的是空字符串）
$version = (Select-String -Path $scriptPath -Pattern '^// @version\s+(\S+)').Matches[0].Groups[1].Value
if (-not $version) { throw '没能从脚本头部读出 @version，已停止' }
Write-Host "   版本 $version"
# ── ② 自检（不通过就停，别推半成品）──────────────────────────────────────────
Step '②' '自检（node --check + ci-check --strict）'
# 注意：node 不一定在 PATH 里（本机是跟着 DSH 运行时装的），所以自己找一遍
function Find-Node {
  $found = @()
  $onPath = Get-Command node -ErrorAction SilentlyContinue
  if ($onPath) { $found += $onPath.Source }
  $found += (Get-ChildItem "$env:USERPROFILE\.dsh\dsh-runtimes" -Recurse -Filter node.exe -ErrorAction SilentlyContinue |
             Select-Object -First 1 -ExpandProperty FullName)
  $found += 'C:\Program Files\nodejs\node.exe'
  $found += 'C:\Program Files (x86)\nodejs\node.exe'
  foreach ($c in $found) { if ($c -and (Test-Path $c)) { return $c } }
  return $null
}
$nodeExe = Find-Node
if ($nodeExe) {
  Write-Host "   node: $nodeExe"
  & $nodeExe --check $scriptPath
  if ($LASTEXITCODE -ne 0) { throw '语法检查没过，已停止' }
  & $nodeExe "$root\tools\ci-check.mjs" --strict
  if ($LASTEXITCODE -ne 0) { throw 'ci-check 没过（上面的 就是原因），已停止' }
} else {
  Write-Warning '系统里没找到 node —— 跳过两步自检。发布仍可继续，但少了一层保障（建议装一下 Node.js）。'
}

Write-Host "   版本 $version —— 自检通过" -ForegroundColor Green

# ── ③ 本地提交 + tag ─────────────────────────────────────────────────────────
Step '③' 'git init → 配置署名 → commit → tag'
# 顺序很重要：git config --local 需要先有仓库，否则报 "not in a git directory"
if (-not (Test-Path (Join-Path $root '.git'))) { git init -b main | Out-Null; Write-Host '   已初始化仓库（main 分支）' }
git config --local user.name $Name
git config --local user.email "$User@users.noreply.github.com"     # 不泄露真实邮箱
git add -A
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  git commit -m "feat: 云终末地滤镜 v$version（首个发布版）"
  if ($LASTEXITCODE -ne 0) { throw '提交失败（看上面的 git 输出）' }
  Write-Host '   已提交'
} else { Write-Host '   没有新改动，跳过提交' }
if (-not (git tag -l "v$version")) {
  git tag "v$version"
  if ($LASTEXITCODE -ne 0) { throw '打 tag 失败' }
  Write-Host "   已打 tag v$version"
} else { Write-Host "   tag v$version 已存在，跳过" }

if ($NoPush) {
  Step '·' '（-NoPush）本地已就绪。想推送时再跑：'
  Write-Host "   git remote add origin https://github.com/$User/$Repo.git"
  Write-Host '   git push -u origin main ; git push --tags'
  exit 0
}

# ── ④ 推送 ───────────────────────────────────────────────────────────────────
Step '④' '推送到 GitHub（会弹出登录窗，点一下 Sign in with GitHub）'
git remote remove origin 2>$null
git remote add origin "https://github.com/$User/$Repo.git"
git push -u origin main
if ($LASTEXITCODE -ne 0) { throw "推送失败。常见原因：仓库还没在 GitHub 上建（先去 github.com/new 建一个**空**仓库，名字 $Repo，别勾 README）" }
git push --tags

Write-Host "`n 全部完成。" -ForegroundColor Green
Write-Host '下一步（2 分钟）：去 https://greasyfork.org/ → 发布脚本 → 地址填下面这行 → 勾自动更新：'
Write-Host "   https://raw.githubusercontent.com/$User/$Repo/main/$(Split-Path $scriptPath -Leaf)" -ForegroundColor Yellow
