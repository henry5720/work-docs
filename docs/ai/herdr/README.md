# Herdr 實作筆記

這個目錄記錄 Herdr 的實際配置、Android / Termux PRoot 相容性處理、故障排除，以及怎麼用它跑多 agent 工作流。

## 文件

- [用 Herdr 開 Agent Fleet 處理 PM 的待辦](./agent-fleet-workflow.md)：把 Slack 上一整排需求變成「同時跑的 N 個 agent + 集中一次做決策」。待辦載體是 GitHub issue、一個模組一條整合分支、人測只在整合分支。指令都實測過。
- [Fleet 工作流試跑清單](./fleet-dry-run-checklist.md)：拿一件真的待辦照上面那份跑一輪，邊跑邊打勾。跑完把結論寫回主文件、勾清空。
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
