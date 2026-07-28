# Orca + WSL 開發環境

> **讀者:AI Agent**(人也看得懂)
> **驗證**:2026-07-28 / Orca 1.4.159 / `henry-desktop`

## 一句話

> **檔案和執行在 WSL,介面和 Windows 資源在 Windows,靠 9P(檔案)+ localhost mirrored(網路)兩座橋接起來。**

## 心智模型

**① 路徑 —— 同一份檔案,兩個名字**

```
Windows 看到:  \\wsl.localhost\<DISTRO>\home\<WSL_USER>\code\<REPO>
WSL 看到:      /home/<WSL_USER>/code/<REPO>
```

Windows 透過 9P 把 WSL 的 ext4 掛成網路磁碟。**沒有複製、沒有同步**,檔案實體只有一份、始終在 ext4。

**② 執行 —— 全部在 WSL**

```
wsl.exe -d <DISTRO> -- sh -c "cd '/home/<WSL_USER>/code/<REPO>' && export PATH=\"$HOME/.local/bin:$PATH\" && exec <login shell> -ilc"
```

node / git / claude / npm / vite dev server 都在 WSL 裡。Windows 不參與執行。

**③ Windows 資源 —— 兩種**

| 能力 | 實作 | 用途 |
|---|---|---|
| 內建瀏覽器 | Electron `WebContentsView` = Windows Chromium | 預覽 dev server、Design Mode、DevTools、GPU 加速 |
| Computer Use | `orca-computer-use-windows (win32, protocol 1)` | 操作 Windows 原生 app:screenshot / click / typeText / hotkey<br>⚠️ 無 menus / dialogs / OCR,見 [skills](./skills.md#本機-provider-能力實測) |

兩者都在 Windows 端,靠 `networkingMode=mirrored` 直通 WSL 的 localhost。
**這是這套架構的核心價值**:WSL 的開發體驗 + Windows 的 GPU / 瀏覽器 / 桌面自動化。

## 分工

| 職責 | 由誰 |
|---|---|
| 寫 code(型別檢查、跳定義、ESLint、debugger) | **VSCode + WSL Remote** |
| worktree / agent 編排 / diff review / 瀏覽器預覽 | **Orca** |
| 實際執行(shell、node、git、agent 進程) | **WSL** |

## 決策速查

| 決策 | 一句話理由 | 詳見 |
|---|---|---|
| Orca 裝 Windows,不裝 WSL | headless `orca serve` 還是 open 的 P1 feature request | [decisions](./decisions.md#1-orca-裝在-windows不裝在-wsl) |
| repo 走 UNC,不走 `D:\`、不走 SSH | 只有 UNC 會觸發 worktree 鏡射到 ext4 | [decisions](./decisions.md#2-repo-走-unc-註冊) |
| VSCode 保留寫 code | Orca 有 Monaco 但**無 language server** | [decisions](./decisions.md#3-vscode-保留) |
| `terminalWindowsShell` 維持 `powershell.exe` | WSL 按 worktree 自動判定,改全域多餘 | [decisions](./decisions.md#4-terminalwindowsshell-維持-powershellexe) |

## ⚠️ 給 Agent:三個「看起來像 bug、其實刻意」

| 看起來 | 實際 | 不要 |
|---|---|---|
| `terminalWindowsShell` 是 `powershell.exe` | 刻意 | ❌ 改成 `wsl.exe` |
| repo 路徑是 UNC 不是 POSIX | 刻意,UNC 是正規儲存格式 | ❌ 改成 `/home/...` |
| Windows 與 WSL 各有一套 skills / agents / hooks | 刻意,per-runtime 隔離 | ❌ 試圖「統一」 |

**動這套環境前先讀 [decisions.md](./decisions.md)。**

## 檔案

| 檔案 | 什麼時候讀 |
|---|---|
| **README.md**(本檔) | 想知道這套環境長怎樣 |
| [setup.md](./setup.md) | **配置一台新機器** |
| [decisions.md](./decisions.md) | 想改某個設定,先確認理由是否仍成立 |
| [troubleshooting.md](./troubleshooting.md) | **出問題了** / 要查 CLI |
| [skills.md](./skills.md) | 要用 **orca-cli / orchestration / computer-use** 派工、控桌面 |

## 變數約定

| 變數 | 本機值 | 取得 |
|---|---|---|
| `<DISTRO>` | `Ubuntu-24.04` | `wsl.exe -l -v` |
| `<WSL_USER>` | `henry` | `wsl.exe -d <DISTRO> -e bash -c 'id -un'` |
| `<WIN_USER>` | `henry` | `$env:USERNAME` |

---

相關:[我的 Agent 工作流](../my-agent-workflow.md)(該文的 herdr 主力段落已被本套文件取代)
