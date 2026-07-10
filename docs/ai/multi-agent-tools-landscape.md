# 多 Agent 工具全景圖

> 針對「AI coding agent 的多 agent 協作/編排工具」的比較地圖。
> 資料為研究當下抓取(2026-07),星數等數字可能變動,選型前建議自行複查。

---

## 核心框架:三個「編排層」

不要用「工具 vs 工具」來想,先問**編排發生在哪一層**。三層正交、可以疊加。

| 層 | 編排的是什麼 | 「agent」的身份 | 代表工具 |
|---|---|---|---|
| **① 進程/終端層** | 終端機、pane、容器 | OS 進程 | herdr, squad, ccb, workmux, container-use, shogun |
| **② 任務層** | 一個任務怎麼拆給誰做 | 某個 agent 的 reasoning loop 內部 | native subagent, oh-my-openagent, skill/MCP DIY |
| **③ 傳輸/介面層** | 訊息怎麼在 agent/人之間流動 | 聊天身份 or API 中介 | openab, openclaw, hermes, VCPToolBox |

**關鍵洞察:真正的「編排智能」永遠在第②層(agent 自己拆任務)。第①③ 層的工具大多不提供這個智能,它們只負責「跑起來 / 傳得動」。**

另一條正交的軸是**協調模型**:
- **just-parallel-watch**:只是平行跑 + 人盯著,agent 之間不互動
- **peer**:平等討論,靠互相 @ / 讀對方輸出,無人指揮
- **purposeful orchestration**:有目的編排,主 agent 拆任務並委派給有角色的 subagent

---

## ① 進程/終端層(本機、終端導向)

多半 model/agent 無關,差別在**協調機制**與**成熟度**。

| 工具 | repo | 協調模型 | 機制 | 後端 | 星數 | 特色 |
|---|---|---|---|---|---|---|
| **herdr** | ogulcancelik/herdr | 原語(可 peer) | PTY panes + socket API(spawn/讀輸出/等狀態) | agent 無關 | ~14.9k | agent 專用 tmux,SSH reattach,狀態儀表板 |
| **squad** | mco-org/squad | purposeful(現成) | 共享 SQLite 訊息 DB + manager/worker/inspector 角色 | agent 無關 | ~594 | 零基礎設施,任務指派+ack,跨工具混用 |
| **ccb** (Claude Code Bridge) | cx994/ccb | 平行+委派 | daemon(caskd/gaskd/oaskd)管佇列,split-pane | 多後端 | ~8 | 持久 session、可 resume;早期專案 |
| **workmux** | raine/workmux | just-parallel-watch | git worktree × tmux window | agent 無關 | ~1.8k | 零摩擦 worktree 平行 |
| **container-use** | dagger/container-use | just-parallel(隔離) | 每 agent 一個容器(走 MCP) | agent 無關 | ~3.9k | 平行不互踩 |
| **multi-agent-shogun** | yohey-w/multi-agent-shogun | purposeful(階層) | tmux,將軍→家老→足輕,最多 10 個 | agent 無關 | ~1.4k | 零協調 API 成本的階層編排 |
| **Sculptor** | imbue-ai/sculptor | just-parallel(隔離) | Docker 容器 + 即時 IDE 同步(GUI/Mac) | Claude 為主 | ~200 | Pairing Mode 即時同步 |

**輔助積木**
- **Backlog.md**(MrLesk,~6.0k★)— git 原生 Markdown kanban,當人與 agent 的**共享協調底板**
- **agentapi**(coder,~1.4k★)— 統一 HTTP API 驅動任何 coding agent,拿來蓋更高層編排器

**怎麼選**
- 盯多個 agent + SSH 回得來 → **herdr**(最成熟)
- 要結構化角色分工(現成) → **squad** / **multi-agent-shogun**
- 純平行、怕互踩 → **workmux**(worktree)/ **container-use**(容器)

---

## ② 任務層(編排智能所在)

這層是「有目的的編排」真正的來源:主 agent 決定任務怎麼拆、誰做哪步。

| 方案 | 是什麼 | 協調模型 | 後端 | 備註 |
|---|---|---|---|---|
| **Claude Code 原生 subagent** | Agent/Task tool + `.claude/agents/*.md` | purposeful(主→子回報) | 本機、Claude-only | 「有目的編排」的正統來源 |
| **Agent Teams**(實驗性) | 上者 + teammate 互傳 | purposeful + 部分 peer | 本機、Claude | 預設關閉、演進中 |
| **oh-my-openagent**(原 oh-my-opencode) | code-yeongyu/oh-my-openagent | purposeful(Sisyphus 拆給角色專家) | OpenCode 優先(有 Codex/Claude 相容) | ~65k★,v4「Team Mode」最多 8 平行 + tmux 可視化 |
| **skill DIY** | superpowers `dispatching-parallel-agents` | purposeful | 依 host agent | 一個 response 多 dispatch = 平行 |
| **MCP DIY(agent-as-tool)** | steipete/claude-code-mcp、codex-subagents-mcp、mcp-agent、Agent-MCP | purposeful | agent 無關 | 把一個 agent 包成 tool 給另一個呼叫 |

**skill/MCP DIY 的取捨**
- ✅ 賺到:編排融進 agent 自己的 loop、零額外基礎設施、in-repo 可版控、任務層智能
- ❌ 賠掉:沒有儀表板、沒有跨 session 持久化、沒得看/接、要自己 debug、隔離較弱
- **何時選**:fan-out 有界、活在單一 task/session 內(平行修測試、逐模組重構),不想架新東西

**注意**:GitHub 上一堆叫 `claude-agent-team*` 的 repo 都是外掛/wrapper,正統就是內建能力。

---

## ③ 傳輸/介面層(遠端、聊天/中介導向)

### 聊天客戶端(Client 類)

聊天平台本身 = 免費的 message bus(第①層工具要自己造的那塊)。

| 工具 | repo | 定位 | 協調模型 | 平台 | 後端 | 星數 |
|---|---|---|---|---|---|---|
| **openab** (Open Agent Broker) | openabdev/openab | 聊天接 coding agent 的 broker | peer(靠 @ 提及,無 orchestrator) | Discord/Slack 原生 + 更多 | agent 無關(可混搭 Claude+Codex+Gemini) | ~665 |
| **openclaw** | openclaw/openclaw | 個人 AI 助理 gateway(通用) | 多 agent 路由 | 20+ 平台 | provider-agnostic LLM | ~382k* |
| **hermes-agent** | NousResearch/hermes-agent | 會自我成長的通用 agent 框架 | 隔離 subagents | 多平台 + TUI | model-agnostic(300+ 模型) | 存疑* |
| **Happy Coder** | slopus/happy | E2E 加密手機/網頁客戶端 | 遠端接單一 session | iOS/Android/Web | Claude Code + Codex | ~22.5k |
| **Omnara** | omnara-ai/omnara | 跨裝置指揮台 | 遠端遙控 | 手機/桌面/Apple Watch | agent 無關 | ~2.6k |
| **claude-code-telegram** | RichardAtCT/claude-code-telegram | Telegram 全遠端 | 遠端遙控 | Telegram | Claude-only | ~2.7k |

*openclaw / hermes 的星數是抓取當下摘要值,對這麼新的 repo 高得可疑,務必自行複查。

**openab 協作細節**(三者中唯一 coding-agent 導向)
- 「team」不是物件,是多個獨立部署的 bot 共用 channel
- 協作 = 一個 bot 做完 `@另一個 bot`,沒有 manager、沒有角色、沒有共享狀態
- 一個 agent 一個 CLI process(各跑自己的 ACP 指令),結果走聊天 thread 傳
- ACP(stdio JSON-RPC)正規化任何相容 CLI → **可混搭異質後端**
- 防迴圈:`allow_bot_messages = off | mentions(建議) | all(上限 10 連續回合)`

### 中介層(Middleware)

| 工具 | repo | 定位 | 協調模型 | 後端 | 星數 |
|---|---|---|---|---|---|
| **VCPToolBox** | lioensky/VCPToolBox | 坐在 LLM API 與前端之間的中介框架(VCP = Variable & Command Protocol) | 共享語意記憶 + AgentMessage(語意相關性推送,非階層) | model-agnostic、自架/分散式 | ~2.2k |

- 靠 **WebSocket 骨幹 + 共享記憶網**,自帶 server + 管理台 + 桌面客戶端 VCPChat
- 本質是「給 agent 一個共享大腦 + 訊息總線」的基礎設施
- 授權 CC BY-NC-SA(非商用)

---

## 決策表

| 你想要的 | 去哪一層 | 具體選擇 |
|---|---|---|
| **平等討論**(bot 互相 @) | ③ 傳輸層 | openab(混搭後端 + 遠端) |
| **有目的編排 · 現成骨架** | ② 任務層 | native subagent(Claude)/ oh-my-openagent(OpenCode) |
| **有目的編排 · 自己搭** | ② 任務層 | skill(`dispatching-parallel-agents`)或 MCP(agent-as-tool) |
| **本機跑一堆 + 盯著** | ① 進程層 | herdr(原語)/ workmux(worktree)/ container-use(隔離) |
| **本機 · 要角色分工** | ① 進程層 | squad / multi-agent-shogun |
| **共享記憶 + 訊息總線** | ③ 中介層 | VCPToolBox |
| **手機遠端遙控** | ③ 傳輸層 | Happy Coder / Omnara / openab |

---

## 一句話心法

> **層是正交的,可以疊。** 真正的「編排智能」永遠在**第②層(agent 自己拆任務)**——native subagent 或 oh-my-openagent 是現成品,skill/MCP 是自己搭。第①層(herdr…)只負責把進程擺好看好,第③層(openab/VCP…)只負責讓訊息傳得動/傳得遠。**先決定你缺的是「拆任務的腦」、「擺進程的手」、還是「傳訊息的路」,再選工具——別拿 herdr 去解本該用 subagent 解的事。**
