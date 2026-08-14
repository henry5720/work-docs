# 用 Herdr 開 Agent Fleet 處理 PM 的待辦

> 把 Slack 上 PM 提的一整排需求，變成「同時跑的 N 個 agent + 集中一次做決策」的工作流。
> 實測環境：Herdr 0.8.0、Claude Code 2.1.232、Ubuntu 24.04（WSL2）、jq 1.7、Python 3.12.3、2026-08-14。
> 架構參考 [1→1→N Agent Fleet 案例](../agent-fleet-case-study.md)，這份是**落到自己機器上的做法**。

---

## 這份在解什麼問題

現在的流程是序列的：

```
Slack PM 需求 → 我先過一層，翻 repo 整理 context → 討論對齊 → 才動工
```

瓶頸不在寫 code，在**「我先過一層」**。一件事光是搞清楚「現在是怎麼寫的、會影響到哪」就要半小時，
一天能開始的事情頂多 2 件。

---

## 先講什麼不能平行

⚠️ **「判斷這樣改對不對」不能自動化，也不該自動化。** 拔掉那層就是垃圾進垃圾出。

把「我先過一層」拆開看，它其實是兩件事：

| 在做什麼 | 佔多少時間 | 能不能平行 |
| --- | --- | --- |
| 翻 repo 看現在怎麼寫、確認影響範圍、把 Slack 那句「功能...」對到真實檔案 | **八成** | **能** |
| 判斷這樣改對不對、要不要這樣改 | 兩成 | **不能** |

**所以 fleet 平行的是「把問題準備到可以決策的狀態」，不是「實作」。**

換算下來：原本一天只能開始 2 件事（前置整理太慢），變成一天能對齊 8 件事的決策。
但複雜的那幾件，實作還是一件一件來 —— fleet 沒有改變這點，也不打算改變。

---

## 分層：1 → 1 → N

```
你
 └─ 調度 agent（1 個，長駐）
     ├─ 中層 agent A ─┬─ search
     │                ├─ executor      ← A 自己開的 subagent，你不管
     │                └─ reviewer
     ├─ 中層 agent B ─┬─ ...
     └─ 中層 agent C ─┴─ ...
```

關鍵是**中層是「負責人」不是「工人」**。案例文那句：

> 人不寫每個專案的 prompt。各專案的專屬 agent 自己 handle 計畫框架。

調度層只召喚一個負責人然後就不管了，不寫「你要先 search 再 executor 再 review」——
那句 prompt 是中層自己對自己下的。

### 中間這層不能省的三個理由

1. **context 隔離。** 調度層的 context 只裝「N 件事現在什麼狀態」，不裝任何一件事的 diff 或檔案內容。
   壓成一層的話調度層要吸收所有細節，三件事就爆了。
2. **拆解的決定權下放。** 「這件事要不要拆成 3 個工人」由中層判斷。有些待辦一個 agent 三分鐘做完。
3. **你的介入點在中層。** 你要跟「負責這件事的人」講話，不是跟 search 工人講話。

### 每一層用什麼做

| 層 | 是什麼 | 用什麼實作 | 你能直接打字嗎 |
| --- | --- | --- | --- |
| 調度 | 排今天做什麼、召喚 workspace、收狀態 | 一個長駐 herdr pane | 能 |
| 中層 | 一件待辦一個負責人 | `herdr workspace create` + `herdr agent start` | **能 ← 你的介入點** |
| 底層 | search / executor / reviewer | 中層自己用 Claude Code 的 subagent 開 | 不能，也不需要 |

> **底層用 subagent、中層用 herdr pane，分界線就是「你需不需要直接跟它打字」。**
> 案例文那個人底層也用 pane，是因為當時手工組裝；底層工人你從來不會想切過去跟它講話，
> 給它一個畫面是白花的。

---

## 兩階段跑法

```
Slack → [平行 N 個] 查現況、產簡報、自己標難易
      → 你一次看 N 份，做 N 個決策       ← 不可平行，但很快
      → 標「可以直接做」的：放它跑完
      → 標「需要對齊」的：退出 fleet，你自己開 session 對齊
```

**第一階段的交付物不是 code，是一份兩分鐘看得完的簡報。** 這是解「AI 輸出不是我要的」的關鍵 ——
不是給它更多 context，是換掉它要交什麼。

```markdown
## T04 退貨表供應商欄位刪除

### 現況（我查到的）
- 欄位定義在 frontend/src/.../ReturnTable.tsx:88
- 有 3 個地方讀它：ReturnTable.tsx:120、ReturnDetail.tsx:45、api/return.ts:33

### 我認為要做的
刪掉欄位定義，同時處理那 3 個讀取點

### 我不確定的
1. 後端 API 還會回這個欄位嗎？要一起拿掉還是先留著？
2. 已經填過值的歷史資料要怎麼顯示？

### 判斷：⚠️ 需要你對齊
```

最後那行是重點：**它自己標「✅ 可以直接做」還是「⚠️ 需要你對齊」，你 review 的其實是那個標籤。**
標錯了你馬上知道它沒搞懂，代價是兩分鐘，不是一個爛 diff。

### worktree 開不開

規則只有一條：**會不會改檔案。**

- 第一階段（只讀 repo、產簡報）→ **不用開 worktree**，全部在主 repo 跑
- 第二階段（真的動手改）→ **一個工作單位一個 worktree**，沒有例外

⚠️ 現況提醒：目前手動開的 session 常常好幾個共用同一個 worktree
（例如 `~/.herdr/worktrees/teamsync-frontend/worktree-1/frontend`）。
只要有兩個同時動手就會互相覆蓋。

---

## 中途介入怎麼運作

鐵律：**agent 永遠不准卡著等你。** 遇到要人決定的事 → 寫下問題 → **結束自己**。

不是掛在那裡等你回，是停掉。停掉的 agent 不佔你注意力，掛著等的會。
10 個 agent 在 3 小時內隨機打斷你 10 次，那是一整天沒了；10 個問題集中回答，是 10 分鐘。

### 兩個「該你了」的狀態

| 狀態 | 意思 |
| --- | --- |
| `blocked` | 它在等權限核可（Claude Code 自己標的） |
| `idle` | 它話講完了，停在輸入提示等你打字 |

兩個都要等：

```bash
herdr agent wait <target> --until idle --until blocked
```

**這行會擋在那裡直到那個 agent 需要人**，不用輪詢、不用盯畫面。後面接 `herdr notification show` 發通知。

### 三個介入入口

```bash
herdr agent attach <name>              # 切過去自己打，最直接
herdr agent prompt <name> "..."        # 不切畫面，從外面丟一句進去
```

第三個是跟調度 agent 講，讓它用 `SendMessage` 轉。日常用 `prompt`，需要細談用 `attach`。

⚠️ 兩個都是**接續原本的對話**，不是重開。pane 裡的 claude process 一直活著，
`idle` 只是它停在輸入提示 —— `claude agents --json` 看得到 `pid` 還在。

### 真的該擋著等你的只有三種

推 code、開 PR、動到別人的東西（改 Slack 表、關 issue）。其他讓它跑完再看。

---

## 實際指令

以下全部在 2026-08-14 實跑過，輸出是真的。

### 開一個中層 agent

```bash
# 1. 建 workspace，回傳的 JSON 裡有 pane id
herdr workspace create --cwd /path/to/worktree --label "T04 退貨表" --no-focus
# → {"result":{"root_pane":{"pane_id":"wY:p1", ...}, "workspace":{"workspace_id":"wY", ...}}}

# 2. 在那個 pane 起 claude
herdr agent start T04 --kind claude --pane wY:p1
# → {"result":{"agent":{"agent_status":"idle","interactive_ready":true, ...}}}

# 3. 丟一句話進去，然後等到它需要人
herdr agent prompt T04 "讀 backlog/T04.md，你 own 這件事" --wait --until idle --until blocked
```

第 3 步那句 prompt 短到不像話 —— **這是對的**。一長就代表你在替中層想它該怎麼做。

pane id 要從 JSON 裡撈出來接給下一步：

```bash
PANE=$(herdr workspace create --cwd "$WT" --label "$LABEL" --no-focus \
  | jq -r '.result.root_pane.pane_id')
```

⚠️ Phone 的 Termux PRoot 環境不一定有 `jq`，那邊用 python 版（標準函式庫就夠，跟 `slack-list` 一樣）：

```bash
PANE=$(herdr workspace create --cwd "$WT" --label "$LABEL" --no-focus \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["root_pane"]["pane_id"])')
```

### 收掉

```bash
herdr workspace close wY
```

### 看現在有誰在跑

```bash
herdr agent list          # agent_status: idle / working / blocked
claude agents --json      # interactive 和 background 都列，含 pid 和 sessionId
```

`claude agents --json` 的輸出長這樣：

```json
{ "kind": "interactive", "name": "frontend-53", "pid": 3777013, "status": "idle",
  "cwd": "/home/henry/.herdr/worktrees/teamsync-frontend/worktree-1/frontend" }
{ "kind": "background", "name": "Fix inventory sync issue in chat room", "state": "blocked" }
```

### herdr 指令速查

| 指令 | 用途 |
| --- | --- |
| `herdr workspace create --cwd --label --no-focus` | 開 workspace，回傳 `root_pane.pane_id` |
| `herdr agent start <NAME> --kind claude --pane <ID>` | 在 pane 裡起 claude |
| `herdr agent prompt <TARGET> <TEXT> --wait --until <S>` | 丟 prompt，可等到某狀態 |
| `herdr agent wait <TARGET> --until idle --until blocked` | 擋著等它需要人 |
| `herdr agent read <TARGET>` | 讀它的終端輸出 |
| `herdr agent attach <TARGET>` | 切過去直接打字 |
| `herdr agent list` | 列所有 agent 和狀態 |
| `herdr notification show` | 發通知給你 |
| `herdr worktree create` | 開 git worktree（第二階段才要） |
| `herdr workspace close <ID>` | 收掉 |

`--kind` 支援的值有 `claude`、`codex`、`gemini`、`cursor` 等 20 幾種。

---

## 要先準備什麼

### 不需要準備的

**不用告訴 agent「去哪找程式碼」。** grep 和 glob 它比你快，不需要索引。

### 需要準備的：只有它猜不到的三類

| 要寫 | 為什麼猜不到 | 現況 |
| --- | --- | --- |
| Slack 代號 → 模組 → 路徑 | `T04` / `V01` / `B03` 是純約定，程式碼裡沒這個字 | **沒有，要建** |
| 為什麼是這樣決定的（ADR） | 決策理由不在程式碼裡 | `teamsync-frontend/CONTEXT-MAP.md` 已經在指路 |
| 前後端怎麼接上 | 兩個 repo 之間沒有任何連結 | **沒有，要建** |

⚠️ **不要為了 fleet 去把 `CONTEXT-MAP.md` 補齊。** 它自己寫了「不要為了補齊而預先建，
詞彙表由 `/domain-modeling` 在真的釘出一個術語時才長出來」——那條原則是對的，別為了餵 agent 破壞它。

### 跨 repo 那份對照表

它不屬於前端也不屬於後端，放 `work-docs` 或 `work-helper`。內容只有兩塊：

1. 一張對照表：`T04 → 退貨表 → frontend/src/... + backend/src/...`
2. 前後端的接縫在哪：backend 的 swagger 在 `teamsync-backend/src/utils/swagger.py`，另有 `docs/index.md`

**現在填不出來沒關係 —— 讓 fleet 第一輪幫你填。** agent 查完一件事，順手把
「這個代號對到這些路徑」寫回那張表。跑個十件就長出來了。

### ⚠️ 不要把後端 repo 整包塞給前端 agent

整包給它會迷路，而且 context 燒光。用底層那層：

```
中層 agent（在前端 worktree，context 乾淨）
  └─ subagent：「去 ~/code/teamsync-backend 查退貨 API 還回不回供應商欄位，
                只回答有/沒有 + 檔案路徑行號」
     → 回來一行字，不是 3000 行程式碼
```

後端的細節在 subagent 那個拋棄式 context 裡燒掉，中層只拿到結論。
（`claude --add-dir ~/code/teamsync-backend` 也行，但那是把後端掛進同一個 context，久了會胖。）

---

## Context 成本

「10 個 agent 各自翻 repo 不是很燒？」總量確實變多，但**每個 agent 的 context 是乾淨的、只裝一件事**。
壓成一個 session 幫你查 10 件事才是死路 —— 第 4 件開始它就會混淆前面的。

錢的部分用案例文那招 Mix and Match：查資料階段用便宜模型（它只是在 grep 和讀檔），
你決策完之後的實作階段才換貴的。

---

## 從哪開始

**不要一開始就開 10 個。從 2–3 個開始。**
你的瓶頸不是 agent 的速度，是你自己審核的速度。案例文那個人撐得住 10 個，
是因為他上面還有兩層 meta-agent 幫他過濾，那是後來才長出來的。

建議順序：

1. **手動跑一次上面的三行指令**，開一個中層 agent 處理一件真的待辦，看簡報產得對不對
2. 簡報格式和「⚠️ 需要對齊 / ✅ 可以直接做」的判準定下來 ← **這步最值錢**
3. 才寫 script 把 spawn 自動化

---

## 還沒做的

- **`bin/fleet` script 還沒寫。** 上面的指令都是手動驗證過的，但還沒串成腳本。
- **`backlog/` 目錄格式還沒定。** Slack List 只有 `lists:read` 寫不回去，
  agent 的進度和問題需要一個本機的可寫底板。
- **判準還沒定。** 什麼樣的簡報算「可以直接做」，這是整套好不好用的關鍵。
- **調度層還沒有。** 現在是手動開 session。
- **策略層（日記 agent）先不做。** 那層管的是「你有沒有在做對的事」，不是「事情做完沒」，
  等中層跑順了再說。

## 相關

- [1→1→N Agent Fleet 案例](../agent-fleet-case-study.md) —— 這套架構的來源
- [多 Agent 工具：怎麼看、怎麼比](../multi-agent-tools-landscape.md)
- `~/code/work-helper` 的 `bin/slack-list` 和 `skills/slack-todo/` —— 待辦從哪來
