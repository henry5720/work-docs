# 環境決策與理由

> **Agent 若考慮變更以下任一項,先確認理由是否仍成立。不要僅因「看起來不一致」就修改。**
> 每個決策附原始碼位置,可自行驗證。

## 哪些是「配置」,哪些是 Orca 寫死的

換機器時只有「配置」那幾列要重做。

| 機制 | 誰決定 | 存哪 | 換機器重做? |
|---|---|---|---|
| 自動切 `wsl.exe` | Orca 原始碼 | — | ❌ |
| `cd` 到專案目錄 | Orca 原始碼 | — | ❌ |
| `export PATH="$HOME/.local/bin:$PATH"` | Orca 原始碼 | — | ❌ |
| 雙軌 cwd(Windows 家目錄起 → shell 自己 cd) | Orca 原始碼 | — | ❌ |
| 用哪個 distro | 設定 | `orca-data.json: terminalWindowsWslDistro` | ✅ |
| agent runtime = wsl | 設定 | `orca-data.json: localAccountRuntime`<br>`localWindowsRuntimeDefault` | ✅ |
| repo 走 UNC | 每 repo 一次 | `orca-data.json: repos[].path` | ✅ |
| 全域預設 shell | 設定(維持預設) | `orca-data.json: terminalWindowsShell` | ❌ |

---

## 1. Orca 裝在 Windows,不裝在 WSL

**決策**:Windows 原生安裝,執行環境指向 WSL。

**理由**:`orca serve` headless 路線(WSL 跑 server + Windows client 連線)**尚未成熟**。

- `#4280`、`#4501` —— 兩張「First-class headless / server mode」都還是 OPEN 的 P1 / size:xl **feature request**
- 進行中的 regression:`#10553`(desktop client 建 agent 失敗,~v1.4.153 起)、`#9047`(web client 無法為 local-host workspace 開 agent/terminal)、`#10756`(headless 重啟會清掉已註冊專案)

Windows 原生 + WSL 執行是官方文件明列的支援組合。

## 2. repo 走 UNC 註冊

**決策**:`\\wsl.localhost\<DISTRO>\home\<WSL_USER>\code\<REPO>`,**不走 `D:\...`、不走 SSH**。

**為何不用 Windows 路徑**
Orca 翻成 `/mnt/d/code/...`,worktree 落在 NTFS。node_modules 這種檔案量級跨檔案系統 I/O 顯著變慢,且觸發 `#9139`(Defender 逐檔掃描拖慢 worktree 建立)。

**為何不用 SSH**(即使 WSL 可跑 sshd)
`computeWorkspaceRoot()` 的 WSL 特殊處理靠 `parseWslPath()` 判定 UNC:

```js
// src/main/ipc/worktree-logic.ts
const wsl = parseWslPath(repoPath)
if (wsl && shouldMirrorWorkspaceDirInsideWsl(repoPath, settings.workspaceDir)) {
    const wslHome = getWslHome(wsl.distro)   // → worktree 落在 ~/orca/workspaces (ext4)
```

走 SSH 時 `repoPath` 是 POSIX 路徑 + `connectionId`,`parseWslPath` 回 null → 進 SSH 分支,**失去 WSL worktree 鏡射**。結果是「假裝成遠端伺服器的 WSL」,更難用。

**UNC 是對的**,原始碼註解:

```
 * Why WSL special case: when the repo lives on a WSL filesystem, worktrees
 * must also live on the WSL filesystem. Creating them on the Windows side
 * (/mnt/c/...) would be extremely slow due to cross-filesystem I/O and
 * the terminal would open a Windows shell instead of WSL. We mirror the
 * Windows workspace layout inside ~/orca/workspaces on the WSL filesystem
```

## 3. VSCode 保留

**決策**:Orca 取代 herdr + terminal + agent 編排;**VSCode 繼續寫 code**。

**理由**:Orca 有 Monaco(語法高亮、find、diff、autosave、codebase search),但**沒有 language server**。搜遍 repo,`language server` / `typescript-language` / LSP 整合零命中。

| 能力 | Orca | VSCode + WSL Remote |
|---|---|---|
| 語法高亮 / 搜尋 / diff | ✅ | ✅ |
| TS 型別錯誤即時提示 | ❌ | ✅ |
| 跨檔 go-to-definition / rename | ❌ | ✅ |
| ESLint / Prettier on save | ❌ | ✅ |
| debugger | ❌ | ✅ |

前端 TS 專案少了這些,改一行要等 `npm run lint` 才知道錯。

## 4. `terminalWindowsShell` 維持 `powershell.exe`

**決策**:**不改**全域 shell 設定。

**理由**:shell 解析有優先序,WSL 判定排在全域設定**之前**:

```js
// src/shared/local-windows-terminal-runtime.ts
// resolveLocalWindowsTerminalShellOverrideForTab()
if (args.projectRuntime)          return ...shellOverride              // 1. 專案 runtime
if (args.explicitShellOverride)   return args.explicitShellOverride    // 2. 分頁覆寫
if (args.isWslWorktree)           return 'wsl.exe'                     // 3. ← 自動
return args.defaultWindowsShell                                        // 4. 全域(最後)
```

只要 repo 是 WSL worktree,terminal **自動**是 `wsl.exe`。

**額外好處**:繞過 `#5111`(不能 per-project 設 shell)。WSL 判定走 worktree 路徑而非全域 shell,所以 Windows 專案與 WSL 專案可並存且各自正確。

### Terminal 實際怎麼啟動

```js
// src/main/providers/windows-shell-args.ts — buildWslShellArgs()
const setupCommand = [
    `cd ${quotePosixShell(linuxCwd)}`,
    'export PATH="$HOME/.local/bin:$PATH"',   // ← claude 就在這
    buildWslInteractiveLoginShellCommand()
].join(' && ')
return ['-d', distro, '--', 'sh', '-c', escapeWslShCommandForWindows(setupCommand)]
```

**雙軌 cwd** —— Windows 的 `CreateProcess` 不能把 cwd 設成 Linux 路徑:

```js
/** The cwd node-pty should be spawned with. WSL cannot cd into a Windows
 *  path, so the wsl.exe branch returns the user's home as the effective cwd
 *  and injects `cd '<linux path>'` into shellArgs instead. */
effectiveCwd: defaultCwd,     // Windows 進程 cwd = Windows 家目錄(看不到)
validationCwd: cwd            // 驗證的是 UNC 路徑
```

所以是「Windows 進程從家目錄起 → shell 自己 cd 過去」,**不是落在根目錄**。唯一 fallback:

```js
const linuxCwd = driveMatch ? toLinuxPath(nativeCwd) : '/mnt/c'   // 連 drive letter 都解析不出時
```

> 官網只寫結論(「launches through `wsl.exe -d <distro>`」),雙軌 cwd、PATH 注入、shell 家族判定只在原始碼。

## 5. 為何 zsh 優於 PowerShell(對 agent 而言)

Windows 預設是 **PowerShell 5.1**(非 7):**沒有 `&&` / `||`**(parser error)、沒有 ternary、沒有 `??`。而 LLM 產 shell 指令的預設語法就是 `cmd1 && cmd2`。

具體長相:Orca 產的 skill 安裝指令,一行 POSIX 指令為了穿過 `PowerShell → wsl.exe → sh → login shell` 四層邊界,膨脹成 2KB 的 base64 包裹。

**專案層面的佐證** —— `teamsync-frontend` 有 POSIX-only script:

```
tools:types:*     curl -s ... > x.json && ... && rm x.json    ← rm 在 cmd.exe 不存在
storybook:mock-os NODE_OPTIONS='...' storybook dev            ← POSIX env prefix
```

(`build` 用了 `cross-env`,主流程可跨平台,但上述兩類在 Windows 原生會失敗。)

---

## 反模式

- ❌ 用 SSH 加入 WSL 專案(§2)
- ❌ 把 `terminalWindowsShell` 改成 `wsl.exe`(§4)
- ❌ 在 Orca 執行中直接編輯 `orca-data.json`
- ❌ agent 自己跑在 Orca terminal 裡時關閉 Orca
- ❌ 混用 Orca 與 herdr / 手動 `git worktree` 管同一 repo(watcher 已關,會不同步)
- ❌ 在 `.zshrc` / `.bashrc` 放 banner 工具(`#10917`)
- ❌ 走 `orca serve` headless 路線(§1)
- ❌ 用 `bash -lc` 驗證 WSL 工具鏈(Orca 實際用 `-ilc`,結論會相反)
- ❌ 期待 Orca 取代 VSCode 寫 code(無 LSP,§3)
- ❌ 直接複製 `orca-data.json` 到新機器(含 machine-specific id 與 token)
