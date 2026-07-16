# 多 Agent 工具:怎麼看、怎麼比(眼鏡層)

> **這不是工具清單。** 「有哪些工具」交給下面兩份 awesome-list——它們負責覆蓋與更新。
> 這份給你**判斷工具的眼鏡**:怎麼分類、怎麼比較、有哪些坑。用法:**AI 先讀 awesome-list 抓全集,再讀這份的框架 + 陷阱去分析**,依使用者需求推薦。
> 清單來源(定期掃這裡找新品):
> - [andyrewlee/awesome-agent-orchestrators](https://github.com/andyrewlee/awesome-agent-orchestrators)(~1k★,編排器清單)
> - [bradAGI/awesome-cli-coding-agents](https://github.com/bradAGI/awesome-cli-coding-agents)(終端 coding agent + 編排 harness 目錄)
>
> 相關:[我的實測 + 工作流](./my-agent-workflow.md)(第一人稱戰報)、[第三方 fleet 實作案例](./agent-fleet-case-study.md)。

---

## 如何使用本文件

**給人:** 不教你選哪個,教你**怎麼判斷**。看框架搞懂三種能力,看陷阱避開常見誤判,剩下依自己需求決定。

**給 AI:** 讀者餵這份 + 使用者的工作流需求時,請:
1. 先從上面兩份 awesome-list(或現查)抓工具全集與最新狀態(星數/是否封存/新功能)。
2. 用下面「腦/手/路」框架 + 使用者實際缺口篩選相關工具。
3. **套用「查證陷阱清單」**——別被自述、星數、炒作騙;非工具的東西別當編排器。
4. 查證後再推薦,不要盲信任何單一來源(含這份)。

---

## 閱讀鏡頭:腦 / 手 / 路

不是硬分類,是**評分鏡頭**——多數編排器三軸都沾。挑工具先問你缺哪種:

| 能力 | 解決什麼 | 沒有它會怎樣 |
| --- | --- | --- |
| 🧠 **腦** | 誰拆任務、分派給誰、中途錯了要不要改 | agent 只會單線做,不會分工 |
| ✋ **手** | worker 怎麼隔離、被看見、接管 | agent 互踩、掉了看不到、接不回 |
| 🛣️ **路** | 訊息怎麼在 agent 之間 / 跟人之間傳 | 各做各的,結果傳不出去 |

判斷一個工具時,三軸各給 `✅`(拿手/主用途)、`△`(潛在/受限,要特定用法才擠得出來)、`❌`(天花板)。

**兩個要注意的細節:**

- **「路」有兩種**,同是 ✅ 但需求天差地遠:**路-內**(agent↔agent:event bus / mailbox / 共享 DB)、**路-外**(agent↔人:遠端遙控 / 聊天客戶端)。判斷時分清楚。
- **「腦」有兩種風味**:`reasoning`(動態拆解、會轉彎、燒 token)vs `deterministic`(固定角色/DAG、協調不燒 token、不臨場應變)。任務會轉彎選前者,路徑固定選後者——別為一次性任務付 reasoning 的 token 稅。

---

## 選型心法:怎麼讀懂、常見誤裝

- **先問缺哪種能力,再挑工具。** 缺「會分工的腦」卻裝了只管「擺進程的手」,弄完 agent 還是不會拆任務——最常見的誤裝。
- **工具不該貼死標籤。** 同一工具不同用法落在不同格(herdr 主給手,socket 可凹成路);但用法有天花板(workmux 怎麼用都生不出腦)。看**能力側寫**別看單一標籤。
- **「腦+手」常是假象——真編排器連「路」都要。** 要編排隔離的 worker,本來就得有訊息通道。看到號稱「編排器」卻宣稱沒有任何 agent 間通訊,要懷疑。
- **想要一次到位(腦+手+路)** → 完整編排器(如 CAO)。代價是多一層 server + 綁框架;好處是少手工、多可觀測。手工組(herdr + 自搭 agent)彈性高但要自己接。

---

## 查證陷阱清單(2026-07 實查)

awesome-list 照抄 repo 自述,不查證。以下是實查抓到、餵 AI 前該提醒的坑:

**① 根本不是「編排工具」,但清單/搜尋會混進來:**
- **CL4R1T4S**(~45k★)= 系統提示洩漏檔案庫(純文字)。**不是工具**,但當「真 agentic 工具怎麼拆解/做 HITL」的一手素材有用。
- **agents.md**(~23k★)= `AGENTS.md` 設定檔慣例(給 agent 讀的 README)。**是規範不是工具。**
- **multi-role-project**(AWS sample)= Kiro 提示鷹架,一個 agent 切多角色。**是 prompt scaffold 不是 runtime。**
- **Backlog.md** = 共享協調底板(無進程隔離),**不是「手」工具**;**agentapi** = 單 agent HTTP 轉接層,不做編排。

**② 炒作 ≠ 實情:**
- **hermes-agent**(~216k★)看似多 agent,實則**單 agent 派隔離子、子 agent 彼此不通訊**,真 agent 互通仍在 roadmap;且**非 coding 專用**。
- **oh-my-openagent** 的多 agent「Team Mode」是 **v4 實驗、預設關閉**。
- **PromptX** 是**單 agent** 的角色/記憶平台,不是多 agent 編排(「角色」= 同一 agent 換身分)。

**③ 星數普遍灌水,別被數字騙:** openclaw ~346k、hermes ~216k、oh-my-openagent ~66k、Happy ~22.7k——這生態星數膨脹是常態,大不代表成熟/適合。反例:CAO ~892★ 但功能完整;ccb ~8★ 是早期 fork。

**④ 已封存(別選來當長期依賴):** overstory(繼任 Warren)、Omnara(轉 omnara.com)、claude-code-mcp。

**⑤ 分類容易看走眼:** squad 常被當「手」其實是腦+路(手弱);herdr 常被當純手其實 socket 帶路-內;「reasoning vs deterministic」不看會付錯 token 稅。

---

## 三個範例讀法(套框架示範)

不列完整清單(那是 awesome-list 的事),只示範怎麼用眼鏡讀三種原型:

- **herdr(手的原型)** — 🧠❌ ✋✅ 🛣️△。給你 PTY pane + 儀表板 + SSH reattach。**只擺進程,不含腦**——要編排智能得另外接。socket API 是它的路-內潛力。
- **CAO(完整編排器原型)** — 🧠✅ ✋✅ 🛣️△。supervisor-worker over MCP,三軸都有。**「別人 fleet 截圖」多半想要的東西**;代價是 server + 綁 MCP。
- **openab(路的原型)** — 🧠❌ ✋△ 🛣️✅。聊天平台當免費 message bus,bot 互 @ 協作(peer,無 orchestrator)。**只給路,腦要另外來。**

想看某工具的完整側寫?讓 AI 依上面框架現查現析,或翻 git 歷史(本文 2026-07 曾有 31 筆完整紀錄,後精簡為眼鏡層)。

---

## 參考 / 延伸閱讀(非工具)

- **[Anthropic — How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)**:orchestrator-worker 正統參考。硬核心得:平行省最多 90% 時間;**token 用量解釋約 80% 效能變異**(多 agent ~15× 成本,值得才 fan out);委派要明確;LLM-judge + rubric 評測。
- **[知乎 — Multi-Agent System,一篇就夠了](https://zhuanlan.zhihu.com/p/1928636720796136414)**:上篇的中文導讀 + 8 條實踐。二手整理,正本是上面 Anthropic 那篇。
- **[agentsmd/agents.md](https://github.com/agentsmd/agents.md)**、**[elder-plinius/CL4R1T4S](https://github.com/elder-plinius/CL4R1T4S)**:見上方陷阱清單①,當素材不當工具。
