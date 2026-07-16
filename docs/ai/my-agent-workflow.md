# 我的 Agent 工具實測 + 工作流

> 第一人稱戰報:我實際跑過哪些工具、心得、怎麼接成自己的工作流。
> 這是三層文件裡最獨有的一層(覆蓋交給 awesome-list,判斷框架見[怎麼看怎麼比](./multi-agent-tools-landscape.md),第三方範例見[fleet 案例](./agent-fleet-case-study.md))。
> 狀態:**建置中**——以下 `TODO` 為訪談待填。

---

## 我的工作流總覽

骨幹 = **herdr(手)+ 手動編排,沒架完整編排框架。**

- **進程層**:herdr 掛著,每個 project / worktree 一個 workspace,pane 裡跑 agent;靠 herdr 儀表板看各 agent status。
- **規模**:每天約 5–6 個 workspace,**形狀看當天**——有時單一熱門 project 開多個 git worktree 平行跑子任務,有時多 project 各一。
- **模型**:主力 **Claude Code**(claude model);**opencode** 用來接非 Claude 廠商模型(gpt / gemini…)——之前訂閱用得多、後來少,現在因為要做 multi-agent、需要不同廠商 model 又用回來。
- **人**:我當「巡邏 + 核可」,不 micromanage;編排靠我自己 + herdr,無 orchestrator 框架。

> **真實快照**(2026-07 某日,herdr API 撈):`teamsync-frontend` 開「主 + worktree-1 + worktree-2」三個平行 workspace,各一個 Claude Code agent 分跑「智慧表格模組分析 / 審核模組後端 API / 後端 issue 檢查」,另加 `work-docs`、`code` 兩個副 workspace。當天全是 Claude Code。

---

## 實測工具戰報

> 只記**我真的跑過**的。每個:用多少、拿它做什麼、什麼好、什麼壞、有沒有換掉/被誰取代。

### herdr — 常用(主力進程層)
- 用量:天天用,目前主力;從 cmux 遷過來。
- 定位:🧠❌ ✋✅ 🛣️△ —— 我的「手」。
- ✅ 好:
  - **看得到每個 agent 的 status**(working / idle / blocked 一眼掃)——最有感。
  - **session 存活**:掛在筆電角落不掉。cmux 隔久 session loss 要手動一個個復活,阻力太大。
- ❌ 痛:
  - **本質是單 agent**(一 pane 一 agent),**multi-agent 得自己拼裝**或另接工具。
  - → 這正是我去研究 squad / ccb / 這套 landscape 的動機:**herdr 給了手,缺的是腦(多 agent 編排)。**

### opencode — 看情況(接非 Claude 模型)
- 用量:之前訂閱用得多 → 後來少 → 做 multi-agent 需要不同廠商 model 時又用回來。
- 角色:**多廠商 model 的入口**(gpt / gemini 等),補 Claude Code 只有 claude 的限制。
- TODO(訪談):具體什麼任務會切去 opencode?跟 Claude Code 怎麼分工?

### openclaw — 用不多
- 用量:少
- TODO(訪談):為什麼用不多?卡在哪?當初想解什麼?

### openab — 試過
- 用量:試用
- TODO(訪談):試了什麼場景?結論?為何沒續用/有續用?

### (其他實測過的)
- TODO(訪談):還跑過哪些?(cmux 換 herdr 已知;還有嗎?)

---

## 心得 / 決策紀錄

> TODO(訪談):你從實測裡學到的通則。例:選「手」層看存活性、模型 mix and match、什麼情況才值得架完整編排器…

---

## 待試清單(想試還沒試)

> TODO(訪談):有沒有看了 landscape / awesome-list 後想試的?
