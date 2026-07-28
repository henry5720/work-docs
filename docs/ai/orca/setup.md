# 配置一台新機器

> 先讀 [README](./README.md) 了解架構。變數 `<DISTRO>` / `<WSL_USER>` / `<WIN_USER>` 定義見該檔。

## 成本估算

**機制本身免費** —— 自動切 `wsl.exe`、`cd` 到專案目錄、注入 `PATH` 都是 Orca 原始碼寫死的,不是設定。

實際要做的只有:

| 項目 | 次數 |
|---|---|
| Orca 設定值 | **2 個** |
| `orca repo add` | 每個 repo 一次 |
| WSL 前置(node / claude / git) | 一次 |

> `orca-data.json` **不要直接複製到新機器** —— 內含 machine-specific 的 `runtimeId`、`authToken`、repo UUID、worktree 絕對路徑。手動設,但很輕。

---

## Step 0 — WSL 前置

全部在 WSL 內完成。**驗證一律用 `zsh -ilc`(或你的 login shell),不要用 `bash -lc`** —— Orca 實際用 interactive login shell,兩者載入的 rc 檔不同,用錯會得到相反結論。

```powershell
wsl.exe -d <DISTRO> -e zsh -ilc 'for c in node npm git claude; do printf "%s=%s\n" "$c" "$(command -v $c || echo MISSING)"; done'
```

**必須全部指向 WSL 內路徑,不可出現 `/mnt/*`**:

| 項目 | 預期 | MISSING 時 |
|---|---|---|
| `node` / `npm` | `~/.nvm/versions/node/<ver>/bin/*` | 裝 nvm,確保 `.zshrc` 有載入 |
| `git` | `/usr/bin/git` | `sudo apt install git` |
| `claude` | `~/.local/bin/claude` | 裝 Claude Code 並登入一次 |

> ⚠️ 若 `npm` 解析到 `/mnt/<drive>/...`,是 Windows 的 nvm4w 透過 PATH interop 漏進來。
> 修法:`.zshrc` 把 WSL 的 nvm PATH 前置壓過去(溫和),或 `/etc/wsl.conf` 設 `[interop] appendWindowsPath=false`(乾淨,但失去 `code.exe` 等互通)。

### ⚠️ 地雷:rc 檔的 banner

**Orca 用 interactive login shell(`-ilc`)跑 git 並解析 stdout。`.zshrc` / `.bashrc` 內任何 banner 都會污染輸出,導致 GitHub source 偵測失敗(`#10917`)。**

`henry5720/dotfiles` 的 `.zshrc:58` 就有:

```bash
command -v fastfetch &>/dev/null && fastfetch
```

從該 dotfiles bootstrap 新機器**一定會中**。裝完必須驗:

```bash
# 輸出必須「只有」git 版本一行
wsl.exe -d <DISTRO> -e zsh -ilc 'git --version'
```

中了就把 banner 那行拿掉,或用 `[[ -o interactive ]] && [[ -t 1 ]]` 之類的 tty 判斷包起來。

> 註:`henry-desktop` 目前的 `~/.zshrc` 是一般檔案(非 symlink)、2448 bytes、Jun 27,**已與 dotfiles 分岔且無 banner**,所以現況安全。新機器不會繼承這個「幸運」。

## Step 1 — `.wslconfig`(Windows 側)

`C:\Users\<WIN_USER>\.wslconfig`:

```ini
[wsl2]
memory=16GB
swap=8GB
processors=8
networkingMode=mirrored   # ← 關鍵
autoProxy=true
dnsTunneling=true
```

`networkingMode=mirrored` 讓 WSL 與 Windows 共用網路介面 —— Windows 端 Orca browser 打 `http://localhost:3000` 直接進 WSL 的 dev server,**零額外設定、不需 port forwarding**。

`henry5720/dotfiles` 的 `wsl/.wslconfig` 已有這份(手動複製,非腳本部署)。

## Step 2 — Orca 設定(GUI)

Settings → agent runtime 設為 WSL。寫入 `%APPDATA%\orca\profiles\local-default\orca-data.json`:

```jsonc
{
  "localAccountRuntime": "wsl",                                          // 從 "host" 改
  "localWindowsRuntimeDefault": { "kind": "wsl", "distro": "<DISTRO>" }, // 從 {"kind":"windows-host"} 改
  "terminalWindowsWslDistro": "<DISTRO>",                                // 通常已自動偵測
  "terminalWindowsShell": "powershell.exe"                               // ← 維持不變
}
```

> ⚠️ **不要在 Orca 執行中直接編輯此檔** —— 記憶體狀態會覆寫掉。用 GUI 改,或關閉 Orca 後再改。
>
> ⚠️ **若 agent 本身跑在 Orca terminal 裡,關閉 Orca 會殺掉自己。** 先確認:
> ```powershell
> $p = Get-CimInstance Win32_Process -Filter "ProcessId=$PID"
> while ($p.ParentProcessId) { $p = Get-CimInstance Win32_Process -Filter "ProcessId=$($p.ParentProcessId)"; $p.Name }
> ```
> 鏈上出現 `Orca.exe` 就改走 GUI 或 CLI。

## Step 3 — 註冊 repo(CLI)

```powershell
orca repo add --path "\\wsl.localhost\<DISTRO>\home\<WSL_USER>\code\<REPO>" --json
```

**GUI 替代**:Add Project → **local folder**(**不是 SSH**)→ 路徑欄貼 UNC。

> Orca UI **沒有** WSL 專用入口(`#8286` 為此的 open feature request)。
> `AddProjectFromFolderDialog.tsx` 只有兩個分支:`connectionId ? 'ssh_remote_path' : 'local_folder_picker'`。
> WSL 走 **local_folder_picker**,因為 Windows 把 `\\wsl.localhost\...`(9P)當本機路徑。
> CLI 走同一個 `addRepoPath` 程式路徑但繞過選取器,較可靠。

---

## 驗證清單

逐項執行,全部符合才算完成。

### V1 — Terminal 落在正確環境

```powershell
$r = orca terminal create --worktree "path:\\wsl.localhost\<DISTRO>\home\<WSL_USER>\code\<REPO>" --json | ConvertFrom-Json
$r.result.terminal.hostPlatform      # 預期: linux
$h = $r.result.terminal.handle
orca terminal send --terminal $h --text 'echo SHELL=$0; pwd; command -v node claude; uname -r' --enter
Start-Sleep 3
orca terminal read --terminal $h --limit 20
```

預期:

```
SHELL=/usr/bin/zsh                                  ← login shell,非 PowerShell
/home/<WSL_USER>/code/<REPO>                        ← 原生 POSIX,無 /mnt
/home/<WSL_USER>/.nvm/versions/node/<ver>/bin/node  ← WSL 的 node
/home/<WSL_USER>/.local/bin/claude
<...>-microsoft-standard-WSL2
```

❌ `pwd` 出現 `/mnt/c` 或 `/mnt/d` → repo 註冊路徑不是 UNC,回 Step 3。

### V2 — Agent hooks 注入 WSL guest

```bash
wsl.exe -d <DISTRO> -e bash -c 'pgrep -x claude | tail -1'          # 先在該 terminal 啟動 claude
wsl.exe -d <DISTRO> -e bash -c 'tr "\0" "\n" < /proc/<PID>/environ | grep ^ORCA'
```

關鍵四項必須存在:

```
ORCA_TERMINAL_HANDLE=term_...
ORCA_WORKTREE_ID=<repoId>::\\wsl.localhost\...
ORCA_AGENT_HOOK_TOKEN=...
ORCA_AGENT_HOOK_PORT=...
```

```bash
wsl.exe -d <DISTRO> -e bash -c 'ls ~/.orca/agent-hooks/claude-hook.sh && grep -c "\"hooks\"" ~/.claude/settings.json'
```

❌ 缺少 → 命中 `#7563`。terminal 內手動跑 `claude` 仍可用,但失去 GUI agent 整合。

### V3 — GitHub source 偵測

`orca repo add` 回傳應含 `gitRemoteIdentity.remoteUrl`。為空 → 見上面「rc 檔的 banner」。

### V4 — Browser 連得到 dev server

WSL 內起 dev server,Orca 內建 browser 開 `http://localhost:<port>`。

### V5 — Computer Use

```powershell
orca computer capabilities
# 預期含: orca-computer-use-windows (win32, protocol 1)
```

---

## 加新 agent(以 Codex 為例)

**直接在 WSL 裝,Orca 自動接上。接線已經鋪好了:**

- `~/.orca/agent-hooks/` 已預先注入 12 個 agent 的 hook 腳本
  (antigravity / claude / codex / command-code / copilot / cursor / devin / droid / gemini / grok / kimi / openclaude)
- `~/.local/share/orca/codex-runtime-home/home/{config.toml,hooks.json}` 已自動建立並持續維護

```bash
# 在 WSL 內
npm i -g @openai/codex
codex                      # 登入一次
```

然後 Orca → account switcher → **Add a WSL-hosted Codex account**。Orca 會在 `~/.local/share/orca/codex-accounts/<id>/home` 建隔離帳號家目錄。

> ❌ **不要裝在 Windows** —— runtime 已是 `wsl`,Windows 的 CLI 不會被使用。
> Codex 帳號是 **per-runtime** 的,host / wsl 兩籃子可並存,但你只需要 WSL 那個。
> Codex + WSL 的已知 issue 見 [troubleshooting](./troubleshooting.md)。

## 安裝 skills 到 WSL

Orca GUI 產的安裝指令是 2KB 的 PowerShell + base64 包裹,且**缺 `--agent` 和 `-y`**,會卡在互動式 TUI。直接在 WSL 跑:

```bash
npx skills add <repo-url> --skill <SKILL> --agent claude-code --global --yes
```

安裝位置 `~/.claude/skills/<SKILL>`(**WSL 側**)。

> WSL 的 `~/.claude/skills/` 與 Windows 的 `C:\Users\<WIN_USER>\.claude\skills\` 是兩套獨立的。
> 裝了看不到 → 見 [troubleshooting](./troubleshooting.md#skill-裝了但-orca-看不到)。
