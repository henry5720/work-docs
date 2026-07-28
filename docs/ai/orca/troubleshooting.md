# 疑難排解與操作備忘

> Orca 官方在 `#8286` 自陳:「Orca fully supports running a **WSL shell**, but a **project** is only ever a Windows-hosted entity」,並承認這產生了一整類 path-translation bug。
> **WSL 是二等公民**,以下是已知代價。

## 已知問題表

| Issue | 症狀 | 影響 | 對策 |
|---|---|---|---|
| `#8286` | WSL project 非一等公民;file explorer 顯示 UNC 而非 POSIX | 中 | 無。等官方實作 |
| `#7563` | GUI agent picker 抓不到 Claude(CLI 正常) | **高** | 依 [setup V2](./setup.md#v2--agent-hooks-注入-wsl-guest) 驗證 |
| `#9197` | WSL 下刪 worktree 失敗(`selector_not_found`) | 中 | 手動 `git worktree remove` + `orca worktree rm --force` |
| — | **worktree base watcher 對 WSL UNC 是關閉的** | 中 | 見下方 |
| — | **skill 掃描目標隨 context 切換** | 中 | 見下方 |
| `#10951` | 外部刪除的 worktree 變永久幽靈列 | 低 | 一律用 Orca 建/刪 worktree |
| `#9284` / `#9768` | git 操作 lag,實測每次 `git worktree`/`rev-parse` 約 1.0–1.1s | 中 | **移除不用的 repo 註冊**,成本隨 repo 數線性增加 |
| `#9229` | app 重啟後倖存 terminal 的 scrollback 清空(`cursor: 0`) | 低 | 新開 terminal 即正常;daemon 會保住 PTY 進程本身 |
| `#10917` | rc banner 污染 git 輸出解析 | 中 | 見 [setup](./setup.md#️-地雷rc-檔的-banner) |
| `#5111` | 不能 per-project 設 shell | 低 | 已由 [decisions §4](./decisions.md#4-terminalwindowsshell-維持-powershellexe) 繞過 |
| `#9139` | Defender 逐檔掃描拖慢 worktree 建立 | — | 走 WSL 即不適用 |
| `#8475` | Codex on Windows (WSL) 中文偶爾亂碼 | 低 | 用 Codex + 中文時留意 |
| `#8269` | Codex hook trust 在 WSL runtime 重啟間遺失 | 低 | 重新授權 |
| `#10326` / `#10523` | Chat UI 不顯示 Codex 回應 / 無法在 Chat UI 與 CLI 間切換 | 低 | 用 terminal 而非 Chat UI |
| `#9630` | 接上 remote environment 後 WSL toggle 永久停用 | — | 不要同時掛 remote environment |

---

## worktree base watcher 對 WSL 是關閉的

```js
// src/main/ipc/worktree-base-directory-watch-targets.ts
// Why: WSL UNC roots are unreliable for native watching; avoid project-level polling.
if (isWslUncPath(workspaceRoot) || isWslUncPath(repo.path)) {
    console.warn(`[worktree-base-watcher] skipping WSL worktree root watcher for ${workspaceRoot}`)
    return   // base 與 git-common 兩個 watcher 都跳過
}
```

**後果**:Orca 自己建的 worktree 會進它的 DB 所以看得到;**外部建/刪的它不會發現**。

**對策**:worktree 一律透過 Orca 建立與刪除,不要混用 herdr / 手動 `git worktree`。

## skill 裝了但 Orca 看不到

幾乎都不是安裝失敗,是 **Orca 掃錯邊**。掃描目標由**當下 context 的 project runtime** 決定:

```js
// src/main/skills/skill-discovery-target.ts
const wslRequested =
    (projectRuntime?.status === 'resolved' && projectRuntime.runtime.kind === 'wsl') ||
    (!projectRuntime && target?.runtime === 'wsl')
...
if (!wslDistro) {
    return { kind: 'native-host', cwd: ... }   // ← 掃 Windows 側
}
```

**沒有 WSL project runtime 的 context(全域設定頁、或任何 Windows 專案)→ 一律掃 Windows。**

### 排查順序

1. **確認站在 WSL 專案的 context** 再開 Skills 檢視 —— 最常見原因
2. **開新 pane 或重啟 Orca** —— 原始碼註解「the renderer caches per pane」,pane 建立後才裝的 skill 不會自動出現。可搜 `main.trace.ndjson` 的 `skill` 確認有無重新掃描
3. **手動跑 Orca 用的 find** 確認 skill 在掃描 root 內:
   ```bash
   find -L "$HOME/.claude/skills" -mindepth 1 -maxdepth 5 -type f -name 'SKILL.md'
   ```
   正常應在 1 秒內完成(掃描 timeout 為 10 秒)

### 掃描 root 清單

`buildSkillDiscoverySources()`,maxdepth 5,`find -L` 會跟隨 symlink:

```
~/.codex/skills            ~/.agents/skills          ~/.claude/skills
~/.codex/plugins/cache     ~/.grok/skills            ~/.config/opencode/skills
~/.pi/agent/skills         ~/.gemini/skills          ~/.gemini/antigravity/skills
~/.cursor/skills           <repo>/.agents/skills     <repo>/.claude/skills
```

> 移除多餘的 Windows 專案註冊可直接消滅這類困惑 —— 只要 Windows 專案還在,就有機會站錯 context 看到完全不同的清單。

## worktree 建立會加 git username 前綴

設定 `branchPrefix: "git-username"`(另有 `branchPrefixCustom`)。

```powershell
orca worktree create --name dev --base-branch dev
# → 產生新分支 henry5720/dev,不是沿用既有的 dev
```

**要沿用既有分支**:建完後進 worktree `git checkout <branch>`,再 `git branch -d <prefix>/<name>` 刪掉多餘的。

---

## 常用 CLI

```powershell
orca status                    # runtime 是否可達
orca open                      # 啟動 Orca 並等待 runtime 可達
orca repo list
orca repo add --path "<UNC>" --json
orca project setups            # 含 setup id,刪除專案要用
orca project setup-delete --setup <setup-id>
orca worktree list --repo id:<repoId>
orca worktree create --repo id:<repoId> --name <n> --base-branch <ref> --no-parent --setup skip --json
orca worktree ps               # 跨 worktree 編排摘要
orca terminal list
orca terminal create --worktree "path:<UNC>" --json
orca terminal send --terminal <handle> --text '<cmd>' --enter
orca terminal read --terminal <handle> --limit 40
orca terminal close --terminal <handle> --tab
orca computer capabilities
orca agent hooks status
```

> **PowerShell 引號陷阱**:`--text` 內含雙引號會被 CLI parser 拆碎。用單引號包裹,內部避免雙引號。

## 診斷用檔案位置

```
%APPDATA%\orca\
  profiles\local-default\orca-data.json    ← 所有設定與 repo/worktree 註冊
  orca-runtime.json                        ← runtimeId / pid / authToken(app 關閉時消失)
  wsl-cli-registrations.json               ← 已註冊的 distro
  agent-hooks\last-status.json             ← agent 偵測結果(可確認 hook 有無運作)
  logs\daemon.log                          ← PTY session 生命週期
  logs\main.trace.ndjson                   ← 完整 trace(git.exec 耗時、crash breadcrumb)
```

WSL 側:

```
~/.orca/agent-hooks/                              ← 12 個 agent 的 hook 腳本
~/.claude/settings.json                           ← hooks 指向上面那些腳本
~/.local/share/orca/codex-runtime-home/home/      ← Codex 設定
~/.local/share/orca/codex-accounts/<id>/home/     ← 各 Codex 帳號隔離家目錄
~/orca/workspaces/<repo>/<name>/                  ← Orca 建的 worktree
```

---

## 本機實測值(henry-desktop,2026-07-28)

僅供比對,新機器需替換。

```
Orca            1.4.159  (%LOCALAPPDATA%\Programs\orca\Orca.exe)
Orca CLI        %LOCALAPPDATA%\Programs\orca\resources\bin\orca.exe
WSL distro      Ubuntu-24.04  (kernel 6.18.33.2-microsoft-standard-WSL2)
WSL user        henry
login shell     /usr/bin/zsh  (p10k + autosuggestions + syntax-highlighting,無 banner)
node            ~/.nvm/versions/node/v26.4.0/bin/node
claude          ~/.local/bin/claude  (2.1.220)
Windows shell   PowerShell 5.1.26100.8875  (未裝 pwsh 7)
已註冊 repo     10 個,除 D 槽那份外全走 UNC
```

worktree 現況(herdr 已完全退場):

```
~/code/teamsync-frontend                         [main]
~/orca/workspaces/teamsync-frontend/dev          [dev]          追蹤 origin/dev
~/orca/workspaces/teamsync-frontend/feat-review  [feat/review]  落後 origin 14
```

**待處理**(過渡狀態,新機器不需複製):

- `D:\code\ShuChenAI\teamsync-frontend` 仍註冊於 Orca(repoId / setup id 同為 `aaf462ab-f0ec-452e-9a33-232cdcc52de0`)
  ```powershell
  orca project setup-delete --setup aaf462ab-f0ec-452e-9a33-232cdcc52de0
  ```
  **三個理由**:① 減少 git 輪詢(每 repo 每次約 1.0–1.1s × 10 repo)② 消除 skill/agent 掃錯 context ③ 避免誤在 NTFS 開工
  ⚠️ 若當前 agent session 的 PTY 掛在該 repo 底下,移除會終止 session。先確認 `orca terminal list`

---

## 原始碼索引

`github.com/stablyai/orca`

| 檔案 | 管什麼 |
|---|---|
| `src/shared/local-windows-terminal-runtime.ts` | shell 解析優先序 |
| `src/main/providers/windows-shell-args.ts` | `wsl.exe` 啟動參數、雙軌 cwd、路徑翻譯 |
| `src/main/ipc/worktree-logic.ts` | `computeWorkspaceRoot()` WSL 鏡射 |
| `src/main/ipc/worktree-base-directory-watch-targets.ts` | WSL watcher 跳過邏輯 |
| `src/main/skills/skill-discovery-target.ts` | 決定掃 WSL 還是 Windows |
| `src/main/skills/skill-discovery-sources.ts` | 掃描 root 清單 |
| `src/main/skills/skill-discovery-wsl.ts` | WSL 掃描實作(10s timeout) |
| `src/main/wsl-bash-command.ts` | base64 包裹的理由 |
| `src/renderer/src/components/sidebar/AddProjectFromFolderDialog.tsx` | Add Project 只有 local / ssh 兩分支 |

**官方文件**:[Terminal](https://www.onorca.dev/docs/terminal) · [Codex in Orca](https://www.onorca.dev/docs/agents/codex) · [Install](https://www.onorca.dev/docs/install)
