# Herdr 實作筆記

這個目錄記錄 Herdr 的實際配置、Android / Termux PRoot 相容性處理、故障排除。

> **Fleet 工作流搬走了** —— 跟它的兩支 skill 同 repo：`~/code/work-helper/docs/fleet.md`
> （設計理由）、`docs/fleet-dry-run-checklist.md`（打勾表）、
> `skills/fleet-recon` 與 `skills/fleet-worktree`（agent 執行的規則）。
> 留在這裡的是它的**來源**：[1→1→N 案例](../agent-fleet-case-study.md)、
> [多 Agent 工具怎麼比](../multi-agent-tools-landscape.md)。

## 文件

- [通知聲配置](./notification-sound.md)：Linux 與 Android / Termux PRoot 的通知音播放方式。
- [Phone 與 Pad 共用 PRoot Herdr](./shared-proot-remote-access.md)：從 Pad SSH 進 Phone Termux，再進 PRoot 並附加同一個 Herdr server。

## 環境摘要

主要環境：

```text
Phone Android
└── Termux
    └── Ubuntu PRoot
        └── Herdr server

Pad Android
└── Termux
    └── SSH Phone Termux
        └── Ubuntu PRoot
            └── Herdr client
```

這套環境的關鍵限制是：每次 `proot-distro login ubuntu` 都會建立新的 PRoot supervisor。若 Unix socket 放在 PRoot 的虛擬 `/root` 路徑，不同 invocation 可能無法互相存取。
