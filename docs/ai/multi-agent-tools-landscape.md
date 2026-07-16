# 多 Agent 工具登記簿

> 「AI coding agent 的多 agent 協作/編排工具」清單。**這是一份給 AI 讀的登記簿**——記錄有哪些工具、大概能幹嘛、repo 與來源在哪,**不替你決定該用哪個**。
> 資料為研究當下抓取(2026-07),星數/狀態會變,**每筆都附 repo,選型前請讓 AI 或你自己複查最新狀態**。
> 上游來源池:[andyrewlee/awesome-agent-orchestrators](https://github.com/andyrewlee/awesome-agent-orchestrators)、[bradAGI/awesome-cli-coding-agents](https://github.com/bradAGI/awesome-cli-coding-agents)(策展清單,定期掃這裡補新品)。

---

## 如何使用本文件

**給人:** 這份不教你怎麼編排工作流,只告訴你「市面有哪些工具、各自能幹嘛、差在哪」。怎麼用、選哪個,你自己(或交給 AI)依需求決定。

**給 AI:** 把這份 + 使用者的工作流需求一起讀。每個工具是一筆結構化紀錄(固定欄位)。請據此:

1. 依 `repo` / `來源` **上網查證最新狀態**(星數、是否封存、新功能)——本文數字可能過時。
2. 用下方「腦/手/路」鏡頭 + 使用者實際缺口,**現場篩選**哪些工具相關。
3. **不要盲信本文的能力側寫當結論**——它是起點,查證後再向使用者推薦。

> ⚠️ 本文**刻意不含「你該選 X」的判斷**(那交給 AI 依需求現場產出)。工具間差異只做最小陳述,不做推薦。

---

## 閱讀鏡頭:腦 / 手 / 路

不是硬分類,是**評分鏡頭**——多數編排器三軸都沾。挑工具先問你缺哪種能力:

| 能力 | 解決什麼 | 沒有它會怎樣 |
| --- | --- | --- |
| 🧠 **腦** | 誰拆任務、分派給誰、中途錯了要不要改 | agent 只會單線做,不會分工 |
| ✋ **手** | worker 怎麼隔離、被看見、接管 | agent 互踩、掉了看不到、接不回 |
| 🛣️ **路** | 訊息怎麼在 agent 之間 / 跟人之間傳 | 各做各的,結果傳不出去 |

每筆紀錄用 `🧠 ✋ 🛣️` 各標 `✅`(拿手/主用途)、`△`(潛在/受限,要特定用法才擠得出來)、`❌`(天花板,別指望)。

**兩個要注意的細節:**

- **「路」其實有兩種**,同標 ✅ 但需求不同:**路-內**(agent↔agent 協調:event bus / mailbox / 共享 DB)、**路-外**(agent↔人:遠端遙控 / 聊天客戶端)。紀錄裡會註明是哪種。
- **「腦」有兩種風味**:`reasoning`(動態拆解、會轉彎、燒 token)vs `deterministic`(固定角色/DAG、協調不燒 token、不臨場應變)。

---

## 工具紀錄

> 依主導能力軟排序(手 → 腦 → 路),僅為方便瀏覽,非分類。標題括號是**主**能力,不代表它只有那一種。

### herdr — 終端多工(手)
[ogulcancelik/herdr](https://github.com/ogulcancelik/herdr) · ~16.9k★ · 活躍 · Rust · agent 無關

agent 專用終端多工器(「AI 版 tmux」):PTY pane、狀態儀表板、SSH 斷線重連。
- 能力:🧠❌ ✋✅ 🛣️△(socket API 可被凹當 agent 間傳訊=路-內)
- 主用途:一堆 agent 進程擺好、看住、斷線接回
- 自架:單一 binary,本機掛著
- 來源:GitHub README

### workmux — worktree 平行(手)
[raine/workmux](https://github.com/raine/workmux) · ~1.9k★ · 活躍 · agent 無關

git worktree × tmux window,零摩擦開多個隔離開發環境並平行 fan-out。
- 能力:🧠❌ ✋✅ 🛣️❌
- 主用途:同 repo 多分支平行跑,附監看儀表板
- 自架:CLI,本機
- 來源:GitHub README

### container-use — 容器隔離(手)
[dagger/container-use](https://github.com/dagger/container-use) · ~3.9k★ · 活躍 · MCP

每個 agent 一個獨立容器(在各自 git 分支上),隔離最徹底。
- 能力:🧠❌ ✋✅ 🛣️❌(MCP 是控制面,非 agent 間傳訊)
- 主用途:平行不互踩;有指令 log + 即時可視 + drop-into-terminal 供人介入
- 自架:MCP server + Dagger
- 來源:GitHub README

### Sculptor — 容器 + IDE 同步(手)
[imbue-ai/sculptor](https://github.com/imbue-ai/sculptor) · ~200★ · 活躍 · Mac GUI · MIT

Mac 桌面 app,平行跑多個 Claude Code/Pi agent,各自 Docker 容器隔離。
- 能力:🧠❌ ✋✅ 🛣️❌
- 主用途:容器隔離 + Pairing Mode 把 agent 的工作即時同步進你 IDE 試跑
- 自架:桌面 app
- 來源:GitHub README

### Claude Code 原生 subagent — 內建腦(腦)
Agent/Task tool + `.claude/agents/*.md` · Claude-only · 內建

Claude Code 內建的 subagent 能力,「有目的編排」的正統來源。
- 能力:🧠✅(reasoning) ✋❌(同 context,無進程隔離) 🛣️❌(內部回報)
- 主用途:單一 session 內把任務拆給角色子 agent、回報主 agent
- 自架:零,內建
- 來源:Claude Code 官方文件

### Agent Teams — 內建協作(腦,實驗)
Claude 內建 · 預設關閉

team lead + teammate 各有 context,靠共享任務清單協調,並有 SendMessage 互通。
- 能力:🧠✅ ✋❌ 🛣️△(共享清單 + SendMessage = 路-內)
- 主用途:多個有獨立 context 的 teammate 平行協作
- 自架:零,內建(需開啟)
- 來源:Claude Code 官方文件

### workflow-orchestration — hook 逼委派(腦)
[barkain/claude-code-workflow-orchestration](https://github.com/barkain/claude-code-workflow-orchestration) · ~75★ · Claude

把任務拆成原子階段、依賴分析排序,路由給 8 個角色 agent;hook 用漸進 nudge 軟性強制委派。
- 能力:🧠✅(reasoning) ✋△(調度原生隔離 subagent) 🛣️△(可接 Agent Teams 訊息)
- 主用途:在 Claude Code 內強制「該委派時就委派」
- 自架:`claude plugin marketplace add` 直接裝(對 Team Plan 摩擦最低)
- 來源:GitHub README

### skill DIY — 融進 loop(腦)
superpowers `dispatching-parallel-agents` · 依 host agent

用 skill 讓 agent 在一個 response 內多重 dispatch = 平行,編排融進 agent 自己的 loop。
- 能力:🧠✅(reasoning) ✋❌ 🛣️❌
- 主用途:零基礎設施、in-repo 可版控的自搭編排
- 賠掉:沒儀表板、沒跨 session 持久化、沒得看/接、隔離弱
- 來源:superpowers skill

### claude-code-mcp — agent-as-tool 原語(腦)
[steipete/claude-code-mcp](https://github.com/steipete/claude-code-mcp) · ~1.3k★ · ⚠️ 已封存(2026-05)

把 Claude Code CLI 包成單一 `claude_code` MCP tool,讓另一個 agent 呼叫它委派任務。
- 能力:🧠△(只是委派原語,拆解智能在呼叫方) ✋❌ 🛣️❌
- 主用途:agent-as-tool,一個 agent 把 coding 任務丟給另一個
- 注意:已封存;同類還有 codex-subagents-mcp、mcp-agent
- 來源:GitHub README

### CAO (cli-agent-orchestrator) — 完整編排器(腦)
[awslabs/cli-agent-orchestrator](https://github.com/awslabs/cli-agent-orchestrator) · ~892★ · 活躍 · 跨 provider

supervisor–worker over MCP,三軸都完整的編排框架標竿(此為事實陳述,非推薦)。
- 能力:🧠✅(reasoning) ✋✅(每 worker 一個 tmux 或 **herdr** session) 🛣️△(MCP `handoff`/`assign`/`send_message` + event bus = 路-內)
- 主用途:跨 provider 的 supervisor 指揮 specialist worker;附持久記憶、Flows 排程、Web UI(localhost:9889)
- 自架:server + MCP
- 差異註:團隊自承 workflow engine 對多數一次性任務是純 overhead(Issue #312)
- 來源:GitHub README

### kodo — 過夜編排 + 獨立驗證(腦)
[ikamensh/kodo](https://github.com/ikamensh/kodo) · ~116★ · 活躍 · Python · MIT

orchestrator(Gemini Flash/Claude)指揮 worker,architect + tester 覆核。
- 能力:🧠✅(reasoning + 獨立驗證) ✋✅(平行時用 git worktree) 🛣️❌(內部 MCP/tool call)
- 主用途:過夜跑;SWE-bench 實測 57% vs Cursor 同模型 46%(即 +24%,基準是 Cursor 非泛稱單 agent)
- 自架:`uv` 裝,本機
- 來源:GitHub README

### bernstein — 確定性編排(腦)
[chernistry/bernstein](https://github.com/chernistry/bernstein) · ~675★ · 活躍 · Python · on-prem

一次 LLM 拆解 → 純 Python 排程,worktree 隔離,janitor 測試 gate 把關合併。
- 能力:🧠✅(一次拆解後 **deterministic**) ✋✅(每 worktree) 🛣️△(MCP server 模式/稽核 log)
- 主用途:協調零 LLM token、可預測;HMAC-SHA256 稽核鏈(防竄改)、45+ CLI adapter、可 air-gap
- 自架:本機/離線
- 來源:GitHub README

### claude-orchestrator — Claude skill 編排(腦)
[indiekitai/claude-orchestrator](https://github.com/indiekitai/claude-orchestrator) · 新 repo · Claude

純 Claude Code skill(非 daemon):規劃 → 有界 worker(各自 worktree)→ 審 gate → 合併 → 跨模型審。
- 能力:🧠✅(reasoning,skill) ✋✅(每 worker 一 worktree) 🛣️❌(合約/檔案協調)
- 主用途:只想留 Claude 生態、不架 server 的編排;心法「每個分支可審/可拒/可合/可清」
- 自架:裝成 skill,Claude Code 跑 agent
- 來源:GitHub README

### overstory → Warren — 已封存編排器(腦)
[jayminwest/overstory](https://github.com/jayminwest/overstory) · ~1.3k★ · ⚠️ 已封存,繼任 Warren

coordinator 拆派給 worker(各自 worktree),instruction overlays + tool-call guards 機械式強制角色權限。
- 能力:🧠✅(reasoning) ✋✅(worktree) 🛣️✅(SQLite 郵件匯流 + WebSocket 面板 = 路-內 + 路-外)
- 主用途:分層 watchdog(機械 daemon + AI 分診 + monitor agent)設計值得參考
- 注意:已封存;繼任者 Warren = 雲端 sandbox control plane
- 來源:GitHub README

### squad — 零基礎設施角色分工(腦)
[mco-org/squad](https://github.com/mco-org/squad) · ~605★ · 活躍 · 跨工具

共享 SQLite + manager/worker/inspector 固定角色,無 daemon 的一次性 CLI。
- 能力:🧠✅(**deterministic** 固定角色) ✋△(選用 tmux 啟動 pane,無 worktree/容器) 🛣️✅(共享 SQLite 訊息/任務庫 = 路-內)
- 主用途:零基礎設施、跨工具(Claude Code/Gemini/Codex/OpenCode)混用
- 注意:名字撞車——≠ `claude-squad`(背景 session 面板)≠ Copilot 版 `Squad`
- 來源:GitHub README

### multi-agent-shogun — 階層編排(腦)
[yohey-w/multi-agent-shogun](https://github.com/yohey-w/multi-agent-shogun) · ~1.4k★ · 活躍

tmux 階層(將軍 → 家老 → 足輕,最多 10 個),agent 靠磁碟上的 YAML mailbox 協調。
- 能力:🧠✅(**deterministic** 固定階層) ✋✅(tmux pane) 🛣️✅(YAML mailbox 路-內 + ntfy 手機雙向 路-外)
- 主用途:針對吃到飽 CLI 訂閱、零協調 API 成本的階層編排
- 自架:tmux,本機
- 來源:GitHub README

### oh-my-openagent — OpenCode 編排(腦)
[code-yeongyu/oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) · ~66k★ · 活躍

前身 oh-my-opencode;Sisyphus orchestrator 拆給 11 個角色專家。
- 能力:🧠✅(reasoning) ✋✅(v4 Team Mode:tmux pane + 每 member git worktree) 🛣️✅(v4 共享 mailbox = 路-內)
- 主用途:OpenCode/Codex agent harness;v4 Team Mode = lead + 最多 8 平行
- 注意:Team Mode 為實驗、預設關閉
- 來源:GitHub README + features.md

### 5dive — AI 公司 / 數位分身(腦)
[5dive-ai/5dive](https://github.com/5dive-ai/5dive) · ~21★ · 活躍 · MIT · 多 runtime

每個 agent 一個 Linux user 跑 systemd service,共享 SQLite queue,「orchestrator 就是 bash」,無 broker/protocol。
- 能力:🧠✅(reasoning,org chart) ✋✅(unix user 隔離 + systemd 監督 + journald log) 🛣️✅(SQLite queue 路-內 + Telegram 升級 路-外)
- 主用途:在自己 server 上跑一整家「AI 公司」;只在花錢/發布/破壞性操作時 Telegram tap-to-answer 找人
- 自架:自己的 server(用 OS 當平台)
- 來源:GitHub README

### hermes-agent — 通用自主 agent(腦)
[NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) · ~216k★ · 活躍 · 多平台

會自我成長的通用自主 agent(**非 coding 專用**);單 agent 用 `delegate_task` 派隔離子 agent。
- 能力:🧠△(平派,無依賴 DAG) ✋✅(Docker/SSH/Modal/Daytona/Singularity 六種隔離後端) 🛣️✅(多平台 chat gateway=路-外;**子 agent 彼此不通訊**)
- 主用途:$5 VPS 到 GPU cluster 都能跑,Telegram/Discord/Slack 等前端存取
- 注意:真正的 agent 互通多 agent 架構見 [issue #344](https://github.com/NousResearch/hermes-agent/issues/344)(已標完成)
- 來源:GitHub README + issue #344

### multi-role-project — Kiro 提示鷹架(腦,特例)
[aws-samples/…/multi-role-project](https://github.com/aws-samples/sample-well-architected-generative-ai-solutions/tree/main/multi-role-project) · AWS sample

Kiro **steering pack**(`.kiro/steering/` 下的 markdown 提示檔),讓**一個** agent 依序切 6 個角色。
- 能力:🧠△(靜態角色管線 PM→Architect→Dev→QA→CloudOps→Compliance) ✋❌ 🛣️△(共享檔案 gated handoff)
- 主用途:提示鷹架,**不是執行器/編排 runtime**
- 注意:是 prompt scaffold,不會自己跑 agent
- 來源:GitHub(aws-samples)

### openab — 聊天 broker(路)
[openabdev/openab](https://github.com/openabdev/openab) · ~687★ · 活躍 · Rust

把聊天平台橋接到 ACP 相容 coding CLI 的 thin broker;bot 互 @ 協作,無 orchestrator。
- 能力:🧠❌ ✋△(session pool:每 thread 一個 CLI 進程) 🛣️✅(聊天 thread = 路-外 + bot 間 = 路-內,peer)
- 主用途:混搭異質後端(ACP stdio JSON-RPC);Discord/Slack + 更多
- 注意:防迴圈 `allow_bot_messages = off | mentions | all(上限 10 回合)`
- 來源:GitHub README

### Happy Coder — E2E 遠端客戶端(路)
[slopus/happy](https://github.com/slopus/happy) · ~22.7k★ · 活躍

E2E 加密的手機/網頁客戶端,遠端接管單一 Claude Code/Codex session。
- 能力:🧠❌ ✋△(遠端接管/切換控制) 🛣️✅(路-外,遠端遙控)
- 主用途:手機/桌面間切換控制同一個 session;不做多 agent 編排
- 自架:CLI(`happy claude`)+ app
- 來源:GitHub README

### Omnara — 跨裝置指揮台(路)
[omnara-ai/omnara](https://github.com/omnara-ai/omnara) · ~2.7k★ · ⚠️ 已封存(2026-02),轉 omnara.com

跨裝置(web/手機/終端)監看 + 遠端遙控個別 AI coding agent。
- 能力:🧠❌ ✋△(活動 feed 可觀測) 🛣️✅(路-外:WebSocket + REST + MCP,含 human-in-the-loop 問答)
- 主用途:遠端 launch/監看/回答;不跨 agent 拆工作
- 來源:GitHub README(repo 已封存,見 omnara.com)

### claude-code-telegram — Telegram 遙控(路)
[RichardAtCT/claude-code-telegram](https://github.com/RichardAtCT/claude-code-telegram) · ~2.7k★ · 活躍

Telegram bot,把單一 Claude Code 攤出來對話式全遠端遙控。
- 能力:🧠❌ ✋❌ 🛣️✅(路-外,Telegram)
- 主用途:純遠端遙控單一 instance(檔案/圖片/語音輸入、webhook/cron 通知)
- 自架:bot 部署
- 來源:GitHub README

### openclaw — 通用助理 gateway(路)
[openclaw/openclaw](https://github.com/openclaw/openclaw) · ~346k★ · 活躍

local-first 個人 AI 助理 gateway,front 一個 agent 到 20+ 訊息平台。
- 能力:🧠❌ ✋△(非主 session 可 Docker/SSH sandbox) 🛣️✅(20+ 平台路由 = 路-外)
- 主用途:WhatsApp/Telegram/Slack/Signal/iMessage… 統一入口,路由到隔離 agent
- 注意:星數雖驚人(號稱 GitHub 最多星)但為真,非灌水
- 來源:GitHub README

### agentapi — 統一 HTTP API 積木(路)
[coder/agentapi](https://github.com/coder/agentapi) · ~1.5k★ · 活躍

統一 HTTP API + SSE + `/chat` UI,靠終端模擬器驅動任何單一 coding agent。
- 能力:🧠❌ ✋△(包裝/暴露 agent 進程) 🛣️✅(路:`/message`、`/messages`、`/events`)
- 主用途:當底座,拿去蓋更高層的編排器;MCP backend 可讓一個 agent 驅動另一個
- 注意:單 agent 轉接層,不做隔離也不做編排
- 來源:GitHub README

### Backlog.md — 共享黑板積木(路)
[MrLesk/Backlog.md](https://github.com/MrLesk/Backlog.md) · ~6.2k★ · 活躍

git 原生 Markdown kanban(`.md` 檔 + 終端 Kanban + 網頁 UI),人與 agent 共讀共寫。
- 能力:🧠△(拆解/驗收條件鷹架) ✋❌(無進程隔離) 🛣️△(共享黑板 = 非同步協調底板)
- 主用途:人與 agent 的共享協調底板;支援 Claude Code/Gemini/Codex/Kiro(CLI 或 MCP),3 個 review checkpoint
- 注意:不是「手」——不做任何進程隔離/可觀測
- 來源:GitHub README

### VCPToolBox — 共享記憶 + 訊息總線(路)
[lioensky/VCPToolBox](https://github.com/lioensky/VCPToolBox) · ~2.2k★ · 活躍 · CC BY-NC-SA(非商用)

坐在 LLM API 與前端之間的中介(VCP = Variable & Command Protocol)。
- 能力:🧠△(Agent-TVS 輕量多 agent 管線) ✋❌ 🛣️✅(WebSocket/SSE 骨幹 + 共享語意記憶 + AgentMessage 語意推送)
- 主用途:給 agent 一個共享大腦 + 訊息總線的基礎設施;自帶 server + 管理台 + 桌面客戶端 VCPChat
- 來源:GitHub README

### ccb (Claude Code Bridge) — 跨模型諮詢(路,特例)
[cx994/ccb](https://github.com/cx994/ccb) · ~8★ · ⚠️ fork、成熟度低

Claude 為主,`cask`/`gask` 把 Codex/Gemini 當第二意見拉進來(單向輻條,非 peer 非 purposeful)。
- 能力:🧠❌ ✋△(split-pane WezTerm/tmux) 🛣️✅(daemon caskd/gaskd/oaskd 管佇列)
- 主用途:「Claude 一個人有盲點」時叫別的模型 review / 給替代實作
- 差異註:想要跨模型第二意見,CAO 的跨 provider handoff 更完整(功能面,非推薦)
- 來源:GitHub README
