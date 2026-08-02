# Phone 與 Pad 共用 PRoot Herdr

> 記錄 Android Phone 上的 Herdr server，如何讓 Phone 與 Pad 經由 Termux / PRoot 附加到同一個 session。
> 實測環境：Herdr 0.7.5、Phone Ubuntu PRoot、Phone 與 Pad Termux、Tailscale SSH。

---

## 需求

Herdr 與 repositories 都留在 Phone 的 Ubuntu PRoot。操作方式維持：

```text
Phone：Termux → Ubuntu PRoot → Herdr
Pad：SSH Phone Termux → Ubuntu PRoot → Herdr
```

不採用 Pad 直接 SSH 到 PRoot，也不把 Herdr server 移到 Termux。

## 問題症狀

Phone 的 PRoot 已啟動 Herdr server，但 Pad 執行以下流程後 client 無法連線：

```bash
ssh phone
proot-distro login ubuntu
herdr client
```

錯誤訊息：

```text
herdr: failed to connect to server: No such file or directory (os error 2)
Is herdr server running? Start it with `herdr server`.
Socket path: /root/.config/herdr/herdr-client.sock
```

`herdr status server` 仍可能顯示 running，因為 API socket `herdr.sock` 與 TUI client socket `herdr-client.sock` 是不同端點。

## 根本原因

PRoot 不是常駐容器。每次執行：

```bash
proot-distro login ubuntu
```

都會建立新的 PRoot supervisor：

```text
同一份 Ubuntu rootfs
├── PRoot A → herdr server
└── PRoot B → herdr client
```

兩邊通常看得到相同檔案，但 PRoot 對 pathname Unix socket 的虛擬路徑處理可能不同。實測結果：

| 路徑 | Server 所在 PRoot | 新開 PRoot | Termux 真實 rootfs |
| --- | --- | --- | --- |
| `/root/.config/herdr/herdr.sock` | 可見 | 可見 | 可見 |
| `/root/.config/herdr/herdr-client.sock` | 可見 | 不可見 | 不可見 |

因此，新開的 PRoot client 找不到 server 的 `herdr-client.sock`。

這不是 Pad SSH 認證或 Herdr protocol 版本不相容。Herdr `v0.7.4 → v0.7.5` 也沒有修改 client socket 的建立、bind、路徑或清理方式；問題是 PRoot invocation 之間的 socket 可見性。

## 修正方式

把 Herdr socket 從 PRoot 虛擬 `/root` 搬到所有 PRoot invocation 都能看到的 Termux 實體路徑：

```text
/data/data/com.termux/files/home/.local/state/herdr/herdr.sock
/data/data/com.termux/files/home/.local/state/herdr/herdr-client.sock
```

在 PRoot 的 `/root/.zshenv` 加入：

```zsh
# External PRoot shells share Herdr with other PRoot invocations through a
# physical Termux path. Herdr-managed panes keep the socket chosen by the server.
if [[ "${HERDR_ENV:-}" != "1" ]]; then
  export HERDR_SOCKET_PATH="/data/data/com.termux/files/home/.local/state/herdr/herdr.sock"
fi
```

Herdr 會從 `HERDR_SOCKET_PATH` 自動推導 `herdr-client.sock`。條件判斷的目的：

- 從 Termux 新進入的 PRoot shell 使用共用路徑。
- Herdr 已管理的 pane 保留 server 傳入的 socket，不覆蓋執行中的 session 環境。

## 一次性切換

如果舊 Herdr server 已經使用 `/root/.config/herdr` socket 啟動，修改 `.zshenv` 不會改變正在執行的 server。完成手邊工作後，在舊 session 執行：

```bash
herdr server stop
```

這會停止 server 及其 panes。確認工作已保存後再執行。

回到 Termux，重新進入 PRoot 並啟動 Herdr：

```bash
proot-distro login ubuntu
herdr
```

不要在舊 server 停止前先啟動共用路徑的新 server，否則兩個 server 可能同時讀寫相同 session state。

## 日常操作

### Phone

```bash
proot-distro login ubuntu
herdr
```

### Pad

```bash
ssh phone
proot-distro login ubuntu
herdr
```

Phone 與 Pad 雖然進入不同 PRoot supervisor，但都透過 Termux 實體路徑連到同一個 Herdr server。

## 驗證

進入 PRoot 後確認環境變數：

```bash
printf '%s\n' "$HERDR_SOCKET_PATH"
```

預期：

```text
/data/data/com.termux/files/home/.local/state/herdr/herdr.sock
```

確認 server：

```bash
herdr status server
```

確認實體 socket：

```bash
stat \
  /data/data/com.termux/files/home/.local/state/herdr/herdr.sock \
  /data/data/com.termux/files/home/.local/state/herdr/herdr-client.sock
```

隔離測試曾將 socket 放入 Termux 實體路徑，再從 Pad 經 `ssh phone → proot-distro login ubuntu` 啟動 client；server 成功記錄新的 `client_id`，證明不同 PRoot invocation 可以透過共用路徑連線。

## 故障排除

### 仍指向 `/root/.config/herdr`

確認目前 shell 是重新登入後建立，並檢查：

```bash
grep -n HERDR_SOCKET_PATH ~/.zshenv
printf '%s\n' "$HERDR_SOCKET_PATH"
```

### 顯示 server 未執行

先確認 Phone 是否已在任一 PRoot 啟動新 server：

```bash
herdr status server
```

若尚未啟動，執行：

```bash
herdr
```

### 同時出現兩個 server

舊 server 使用：

```text
/root/.config/herdr/herdr.sock
```

新 server 使用：

```text
/data/data/com.termux/files/home/.local/state/herdr/herdr.sock
```

應先完成舊 session 工作並停止舊 server，只保留共用路徑的 server。

### SSH 出現 LocalForward 埠占用

Pad 的 `Host phone` 若設定 `LocalForward 8080/3000/3001/3002`，而 Pad 本機埠已被占用，SSH 會顯示：

```text
Could not request local forwarding.
```

只要未設定 `ExitOnForwardFailure yes`，SSH 通常仍會登入。這是另一個設定問題，不是 Herdr socket 失敗的主因。

## 未採用方案

曾驗證直接 SSH 到 PRoot sshd 可以成功附加 Herdr，但這會改變原本想保留的操作方式：

```text
Pad → PRoot sshd → Herdr
```

需求是先登入 Phone Termux，再進 PRoot，因此最後移除 PRoot sshd、授權金鑰與相關 SSH alias，改用 Termux 實體 socket 路徑。
