# 用 Herdr 開 Agent Fleet 處理 PM 的待辦

> 把 Slack 上 PM 提的一整排需求，變成「同時跑的 N 個 agent + 集中一次做決策」的工作流。
> 實測環境：Herdr 0.8.0、Claude Code 2.1.232、Ubuntu 24.04（WSL2）、pnpm 10.11.1、Python 3.12.3。
> 架構參考 [1→1→N Agent Fleet 案例](../agent-fleet-case-study.md)，這份是**落到自己機器上的做法**。
>
> **2026-08-14 修訂**：第一版跑過之後改掉三件事——待辦的載體從本機檔案換成 **GitHub issue**、
> 加上**整合分支**這一層、人測收斂到**只有一個地方**。下面是修訂後的版本。

---

## 這份在解什麼問題

原本的流程是序列的：

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

## 一個 slug 貫穿全部

這是修訂版新加的核心，也是第一版最痛的教訓：**「一件事」這個單位必須落在檔案上，不能只在你腦裡。**

第一版沒有這條，結果同一份改動被 commit 進兩條 branch —— 兩個 agent 共用一個 worktree，
兩份 context 都在人腦裡搬，搬錯一次就發生。

一個 slug ＝ 一個 GitHub issue 編號 + 短名，它同時決定四樣東西：

| 東西 | 長什麼樣 |
| --- | --- |
| issue | `#1769` |
| branch | `fix/1769-export-warehouse-only` |
| worktree 路徑 | `~/.herdr/worktrees/teamsync-frontend/fix-1769-export-warehouse-only` |
| herdr agent name | `fix-1769-export-warehouse-only` |

**一個 slug 只准出現在一個 worktree，一個 worktree 只准有一個 agent。** 沒有例外。
編號寫在 branch 名裡，重複做同一件事會當場現形。

---

## 分層：1 → 1 → N

```
你
 └─ 調度 agent（1 個，長駐，在整合分支那份 checkout）
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
| 調度 | 排今天做什麼、召喚 workspace、收狀態 | 一個長駐 herdr pane，cwd 停在整合分支 | 能 |
| 中層 | 一個 slug 一個負責人 | `herdr worktree create` + `herdr agent start` | **能 ← 你的介入點** |
| 底層 | search / executor / reviewer | 中層自己用 Claude Code 的 subagent 開 | 不能，也不需要 |

> **底層用 subagent、中層用 herdr pane，分界線是「這道工序誰是主力」。**
> 人主力 → 各自一個 pane，因為你要跟它們輪流講話；agent 主力 → subagent，因為沒人要跟它講話。

（原本這裡寫的是「你需不需要直接跟它打字」—— 那是症狀，「誰是主力」才是原因。
判準見〈① 分流〉那張四性質表：四條全中就是 agent 主力。）

### 切分點為什麼不往上移

「連中層也做成 subagent，由調度 pane 統一開」乍看合理 —— ✅ 那些你本來就不用跟它講話。
但 **merge 之後你還會回去找它**（見〈測到問題就回原 worktree 改〉：
`herdr agent prompt <slug> "整合測試發現：…"`，靠的就是那個 pane 裡的 process 一直活著、context 都在）。

subagent 做完就死，回不去。**中層必須是 pane，不是因為你「現在」要跟它講話，是因為你「之後」會。**

### 案例文那個三 pane 面板

[案例文](../agent-fleet-case-study.md)`:28` 的三 pane（search / executor / reviewer）是**底層**，
不是中層 —— 它們住在中層專案的同一個 workspace 裡。

差別不是原則衝突，是同一個原則遇到不同前提：案例文的接力是「**pane 間人工接力**」，
人要把 search 的結果搬給 executor，既然每步都要你打字，它們當然得是 pane。
這裡把接力交給中層 agent 自己下 prompt，底層就不必是 pane。

⚠️ **Claude Code 的 subagent 沒有自己的 pane 可以開。** 它跑在中層 agent 的 process 裡，
`claude agents --json` 只列得出 `kind: "interactive"` 的頂層 session，subagent 沒有 pid。
要看它在幹嘛只能看中層那個 pane 的輸出，或 `herdr agent read <slug>`。

---

## 從 PM 需求到 merge 的六步

第一版寫的是兩階段。實跑後多出一個「分流」，因為不是每件需求都值得走完整條路。

> **2026-08-15 再修訂**：粗單那步拿掉了，issue 改由第一波 agent 查完自己開，理由見 ②。

```
PM 需求
  → ① 你 30 秒分流 ────────────────────────── 只有這步一定要你
  → ② 派第一波 agent（一句話，不開 worktree、不開 issue）
  → ③ [平行 N 個] agent 查現況 → gh issue create（簡報當 body、埋指紋）→ 自己標 ✅ / ⚠️
  → ④ 你一次看 N 張 issue：
         ✅ → 掛 ready-for-agent → 開 worktree 派工
         ⚠️ → 這幾件才進 /grill-with-docs 對齊
  → ⑤ worktree 裡實作 + 自我驗證
  → ⑥ merge 進整合分支，你在那裡人測
```

### ① 分流：四個性質

主流框架是四個性質，重點是**按性質判斷，不要憑直覺**：

| 性質 | 白話 | 例 |
| --- | --- | --- |
| **recurring** | 這種事會再來第二次嗎 | 「把某欄位從三個地方拿掉」會再來；「幫我改一次這行字」不會 |
| **bounded** | 做完了算不算得出來 | 「改這三個檔案」有邊界；「讓庫存頁好用一點」沒有 |
| **reversible** | 做錯收得回來嗎 | 改 code 有 git，收得回；**發訊息給 PM、關 issue、改 Slack 表，收不回** |
| **verifiable** | 對不對驗得出來嗎 | 測試紅、typecheck 噴、畫面看得到 → 驗得出；「體驗有沒有變好」→ 驗不出 |

**這份文件本來就在用其中兩個，只是沒給名字** —— 〈中途介入怎麼運作〉那句「真的該擋著等你的只有三種」是 **reversible**，〈兩道關〉第一道那三項是 **verifiable**。

分流的時候不用四條全跑一遍。**一句話版本：答案在哪。**

| 答案在哪 | 怎麼處理 |
| --- | --- |
| 全在 repo 裡 | 直接派第一波。grep 比你快，不用給 context |
| repo ＋ 一個外部事實（後端行為、PM 需求文件、UI 稿） | 也派，但**派工那句話裡要附上那個來源** |
| 答案不存在，要人決定（兩種做法都合理、PM 沒想清楚） | 不派。grill，或回去問 PM |
| 看不懂 PM 在講什麼（`敘述` 只有「功能...」） | **回去問 PM。** 不是自己復現，也不是派 agent 猜 |
| 這需求根本不該做 | 不進 issue，回 PM |

⚠️ **分流不等於復現，而復現本身是兩件事：**

| | 誰做 | 為什麼 |
| --- | --- | --- |
| 在畫面上確認症狀存在 | **你**（偶爾 agent） | 要登入態、要你的眼睛。你 30 秒的事，agent 開瀏覽器可能十分鐘還卡在登入 |
| 把症狀對應到哪段程式碼 | **第一波 agent** | grep 比你快，而且這才是佔掉你半小時的那八成 |

所以「開瀏覽器看到問題」留著，**「猜問題在哪」丟掉** —— 那是第一波要交的東西，
你先猜了反而會把 agent 錨定在錯的地方。

這步要壓在 30 秒內。它不是在做決定，是在決定「這件事值不值得你花時間做決定」。

### 分流能不能派給 agent：只有一格可以

**「看不懂 PM 在講什麼」那格能派**，因為它只要讀 Slack 那列，不用碰 repo。
指派給你的有幾十列，讓 agent 先掃一遍把「敘述太短、規格不足」的挑出來，你一次回問 PM。

**其他三格不行。** bounded 和 verifiable 確實 agent 評得出來，
**但它得先查 repo 才評得出來，而查 repo 就是第一波。**
分流之所以是 30 秒不是 30 分鐘，正是因為它不查 repo；
一旦要查就不叫分流了，那道「值不值得花時間」的閘門會直接消失。

### 四個性質還決定檢查點要多密

同一張表第二個用途 —— 決定這件事該用哪種介入密度：

| 四個性質 | 密度 | 長什麼樣 |
| --- | --- | --- |
| **全中** | 稀 | 預設：分流 → 簡報 → 人測，中間讓它跑 |
| **bounded 掉了**（步驟多、跑很久） | 密 | search → 你看 → executor → 你看 → reviewer，各自一個 pane。**這是 goal drift 的解藥** |
| **verifiable 掉了**（測不出對錯） | 密 | 同上，而且 reviewer 那關不能省 |
| **reversible 掉了**（動 production、發佈） | 不管幾條中都要人核可 | 見〈真的該擋著等你的只有三種〉 |

日常的 bug／需求大多短程、有界、有 git 可回、有測試可驗 —— 四條全中，所以用稀的。
密的那套（＝[案例文](../agent-fleet-case-study.md)那個三 pane pipeline）是**例外處理，不是預設**：
跨多模組的大改、沒有測試覆蓋的老程式碼、第一次碰的陌生區域，那時候手動切三個 pane
自己當接力才划算。

> 有數字撐這件事：2026-07 一份終端任務 benchmark，17 個 frontier model
> 平均只完成 **6.4%**（最好 28.3%）；長程任務的全自主部署有 **90%** 敗在
> goal drift 與 objective fixation。所以「跑很久」本身就是要加檢查點的理由。

### ② 為什麼不先開粗單

**第一波不需要 issue 編號。** slug ＝ issue 編號 + 短名，決定 branch / worktree / agent name —— 但第一波不開 worktree，它不改檔案。**slug 是第二波才需要的東西。**

所以第一波在沒有 issue 的情況下跑，查完自己 `gh issue create`，簡報就是 body。你省掉「為每件事寫一次粗單」，而且 issue 一出生就有內容，不是「功能...」那種粗單。

規則上也過得去：擋著等你的是推 code、開 PR、**關** issue —— **開** issue 不在裡面。

代價有兩個，都要處理：

⚠️ **重複開單從「不太可能」變成「一定會發生」。** 你自己開粗單時會看到已經有了，agent 不會。指紋因此是這個做法的**前置條件**，不是加分項（見〈要先準備什麼〉）。

⚠️ **issue 開得合不合規變成 prompt 的責任。** 派工那句話裡要明寫「開單前先讀
`teamsync-frontend/docs/guides/workflow/github-issue-standards.md` 和
`teamsync-frontend/docs/agents/issue-tracker.md`」，不要指望它自己知道。

### 派工那句話該寫什麼

**只給 repo 外的東西。repo 裡的一律不給。**

| | 給不給 | 為什麼 |
| --- | --- | --- |
| 前端模組路徑、相關檔案在哪 | ❌ **不給** | `teamsync-frontend/CLAUDE.md` 的「🗺️ 程式碼地圖」和「📘 觸發表」就是 map，自動載入。你指路只會限制它，指錯的話它會很聽話地在錯的地方找 |
| 後端 repo | ⚠️ **只給一句話** | 「後端在 `~/code/teamsync-backend`，要查就開 subagent，只要結論不要程式碼」。不要掛路徑進 context |
| 後端文件 | ❌ **不給** | 同上，讓 subagent 自己找 |
| **PM 需求文件** | ✅ **一定要給** | repo 外的東西，agent 一輩子找不到。庫存那份在 `~/code/庫存管理系統_開發文件_v1.7.md` |
| **prototype / UI 稿** | ✅ **一定要給** | 同上 |
| 你猜問題在哪 | ❌ **不給** | 見〈① 分流〉那張復現表 |

⚠️ **不要在這一步 grill。** 三個理由：違反「agent 永遠不准卡著等你」；
第一波是 N 個平行，每個都想 grill 你就是「10 次打斷 = 一整天沒了」那個情境；
而且 grill 的價值在於你手上已經有查好的現況 —— 還沒查完就 grill 等於回到第一版那個爛順序。
先純分析，一次看 N 則，只有 ⚠️ 的才進 ④。

### ③ 簡報：交付物不是 code

**第一波的交付物是一份兩分鐘看得完的簡報。** 這是解「AI 輸出不是我要的」的關鍵 ——
不是給它更多 context，是換掉它要交什麼。

````markdown
<!-- slack-list-item: Rec0B… -->

### 現況（我查到的）
- 欄位定義在 frontend/src/.../ReturnTable.tsx:88
- 有 3 個地方讀它：ReturnTable.tsx:120、ReturnDetail.tsx:45、api/return.ts:33

### 我認為要做的
刪掉欄位定義，同時處理那 3 個讀取點

### 怎麼驗
```bash
npx vitest run src/app/modules/xxx
npm run build          # 含 tsc --noEmit
```
畫面上：開 /returns，確認供應商欄位不見了，既有資料還打得開

### 考慮過的做法（只有標 ⚠️ 才要寫）
A. 前端直接刪 → 後端還回這欄位，多的資料被忽略
B. 等後端一起拿掉 → 要跨 repo 排程
選 A，理由：…

### 我不確定的
1. 後端 API 還會回這個欄位嗎？要一起拿掉還是先留著？
2. 已經填過值的歷史資料要怎麼顯示？

### 判斷：⚠️ 需要你對齊
````

**先做機械檢查，再做判斷。** 業界對 agent 交出來的計畫有一條現成的 gate：

> 切到實作前，檢查「要改哪些檔案」和「驗證指令」在不在 —— **少任何一個，這份計畫就沒準備好。**

這條 2 秒看得完、不用動腦，先用它擋掉一半。過了才輪到下面那個要判斷的標籤。

⚠️ **「怎麼驗」不是寫給你看的，它會一路流到 PM。** agent 實作時照它自我驗證，
最後 `work-helper` 的 `slack-list ready --verify` 直接用同一份。
少了它，驗收步驟會變成實作完才現編，品質沒人保證。

「考慮過的做法」只在標 ⚠️ 時要求 —— ✅ 的定義就是只有一條明顯的路；
⚠️ 的定義就是「兩種做法都合理」，那正是你要拍板的東西，先列出來你才選得下去。

最後那行是重點：**它自己標「✅ 可以直接做」還是「⚠️ 需要你對齊」，你 review 的其實是那個標籤。**
標錯了你馬上知道它沒搞懂，代價是兩分鐘，不是一個爛 diff。

**標籤的判準跟分流同一把尺：答案在哪。** 查完之後答案全在 repo 裡、改動點列得完 → ✅；
有一件「你答了會改變做法」的事 → ⚠️，而且要指名是哪一件。

⚠️ **「我不確定的」只准放「你答了會改變做法」的問題。**
「我沒去查後端」不算 —— 那叫還沒查完，回去查。這條同時堵住 agent 拿「不確定」當偷懶的出口。
沒有這條，每份簡報都會標 ⚠️，而審閱者被大量 flag 淹沒、真正緊急的那幾件被蓋掉，
是 agentic 系統已知的失敗模式。

⚠️ **簡報一律進 issue（`gh issue create` 當 body，後續更新用 `gh issue comment`），不要留在 agent 的 terminal 裡。**
那是後面 worktree bootstrap 要撈的東西，也是你三天後回頭看「這件事當初查到什麼」的唯一來源。
更實際的理由：第一波是 N 個平行 agent，簡報留在各自的 pane 就沒辦法「一次看 N 則」，
而集中一次做決策正是整套的目的。

### ④ 對齊只花在標 ⚠️ 的那幾件

`/grill-with-docs` → `/to-spec` → `/to-tickets` 那條路（見 `teamsync-frontend/docs/OPTIONAL_TOOLING.md`）
**不是每件都要走**。而且進 grill 的時候你手上已經有 agent 查好的現況，比先 grill 再查快得多 ——
第一版順序是反的，所以每件都要半小時。

**一次只 grill 一件。** 跟人測同一個道理（見〈人測只在整合分支〉）：grill 的產出是**你的判斷品質**，
那個東西平行不了。三個不相關的設計討論交錯著談，你會忘記前面為什麼排除某個選項，
然後在錯的前提上拍板。

### grill 就開在 worktree 裡

判斷規則從「會不會改檔案」放寬成「**接下來會不會改檔案**」——
標 ⚠️ 的那幾件你談完大概率就要動手，那就一開始把 worktree 開好，
談完那個 agent 就是負責人，直接接著做。

不這樣做的代價是多一次 context 重建：你跟 A 談了半小時釐清需求，
寫進 issue，再開 B 從零讀 —— B 拿到的是結論，拿不到「為什麼排除某案」那段推導。

談完結論是「不做」的話 `herdr worktree remove` 幾秒的事，比每次都多一輪交接便宜。

兩條防護不能省：

⚠️ **grill 期間不准改檔案。** 那個 agent 坐在 worktree 裡，手會癢。

⚠️ **結論一定要 `gh issue comment` 回去。** 這條是硬的 —— 見〈一個 slug 貫穿全部〉：
「一件事這個單位必須落在檔案上，不能只在你腦裡」，把「你」換成「agent」一樣成立。
談話 context 一次 compact 就蒸發，三天後回頭看只有 issue。

### label 維持兩態，不要新增

- **沒有 label** ＝ 還沒過簡報
- **`ready-for-agent`** ＝ 可以派工

標 ⚠️ 的那幾件你當下就會去 grill，grill 完不是變 `ready-for-agent` 就是關掉，
中間狀態活不過一天，不值得一個 label。

### worktree 開不開

規則只有一條：**接下來會不會改檔案。**

- **第一波**（③ 只讀 repo、產簡報，交完就結束）→ **不用開 worktree**，全部在整合分支那份 checkout 跑
- **④ 的 grill** → **要開**。討論本身不改檔案，但談完就要動手，一開始開好省一次交接（見上面那節）
- **第二波**（⑤ 真的動手改）→ **一個 slug 一個 worktree**，沒有例外

---

## 整合分支與 merge

修訂版新加的一層。一個模組開一條長命的整合分支，例如 `fix/inventory`，
所有 worktree 都從它開（`--base fix/inventory`），做完也 merge 回它。

### 人測只在整合分支，一次只 merge 一件

**dev server 只開一個，就在整合分支那份 checkout。** worktree 裡不開。

代價是 merge 變序列，但那無所謂 —— 人測本來就是你的注意力，本來就一次一件。
worktree 的平行價值在「agent 同時在寫」，不在「你同時在測」。

⚠️ 一次併一件、測完再併下一件。兩件一起併進去壞掉，你不知道是誰。

### 兩道關

| 關 | 在哪 | 過關條件 |
| --- | --- | --- |
| 第一道 | worktree 裡，agent 自己做 | 相關測試過、lint 過（只餵改動的檔案）、`typecheck` 過 |
| 第二道 | 整合分支，你做 | 開 dev server 人測，跟已經併進來的其他工作單位一起跑 |

第一道關還要加一句人工檢查，兩分鐘：

```bash
git diff --name-only fix/inventory..HEAD
```

對照 issue 講的範圍，**多出來的檔案就是跑錯棚了**。第一版那個重複 commit，在這一步會當場被抓到。

### merge 用 `--no-ff`

```bash
git -C ~/code/teamsync-frontend merge --no-ff fix/1769-export-warehouse-only
```

理由是**整合測試掛掉的時候**：一顆 merge commit 一個工作單位，
`git revert -m 1 <merge-sha>` 就能把整合分支打回乾淨狀態，而那條 worktree branch 完全沒被動到。

**而且保留歷史的代價是零。** `teamsync-frontend/docs/guides/workflow/frontend-release-flow.md:56`
寫 `fix/*` 從 `dev` 開、PR 目標 `dev`，第 64 行寫「squash the leaves」——
整合分支是葉子，最後整條會被 squash 成一顆進 `dev`。你本地這些 merge commit 在 `dev` 上不會出現。

### 測到問題就回原 worktree 改，不要 revert

merge 沒有動到那條 branch，pane 裡的 claude process 也一直活著，context 都在：

```bash
herdr agent prompt fix-1769-export-warehouse-only "整合測試發現：<現象>"
```

改完回整合分支再 merge 一次，同一條 branch 長出第二顆 merge commit，完全正常。

⚠️ **這種情況不要 revert。** revert 掉一顆 merge commit 之後再 merge 同一條 branch，
git 會認為那些 commit 已經併過，被 revert 掉的內容不會回來 —— 你得先 revert 那顆 revert 才行，
很容易搞混。revert 只留給「我一時修不好，要先把整合分支清乾淨去測別件事」。

### 收尾順序

```
merge → 整合測試過 → 關 issue → 最後才 herdr worktree remove
```

⚠️ **worktree 是最後才收的。** 整合測試沒過你要回去修，先 remove 掉就得重開重裝。

### 子 branch 一律不 push

它們是本地的工作單位，推上去只會在 GitHub 累積一堆永遠不會開 PR 的分支。
只有整合分支推，最後由它對 `dev` 開一個 PR。

### 其他 worktree 什麼時候同步

merge 進整合分支之後，其他還在跑的 worktree **不要動**。
等它各自跑完、你要給它下一件事之前，才在它裡面 `git merge fix/inventory`。
**不要在 agent 做到一半改它的 base**，它腦裡的檔案狀態會跟磁碟對不上。

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
herdr agent wait <slug> --until idle --until blocked
```

**這行會擋在那裡直到那個 agent 需要人**，不用輪詢、不用盯畫面。後面接 `herdr notification show` 發通知。

### 兩個介入入口

```bash
herdr agent prompt <slug> "..."       # 不切畫面，從外面丟一句進去（日常用這個）
herdr agent attach <slug>             # 切過去自己打（要來回討論才用）
```

兩個都走 socket API，**跟你人在哪個 pane 無關** —— 在整合分支那個 pane 就能指揮所有 worktree。
兩個都是**接續原本的對話**，不是重開。

⚠️ `prompt` 不要加 `--wait`，那會擋住你的 terminal。丟完就回去做你的事。

### ⚠️ 一定要用 `herdr agent start <slug>` 起 agent

**不要自己在 pane 裡打 `claude`。** 手打起來的 agent 在 `herdr agent list` 裡**沒有 `name` 欄位**，
只能用 `wR:pH`、`wS:p5` 這種 pane id 當 target —— 你記不住，等於失去了「不用切畫面就能丟訊息」的能力。

已經手打起來的可以補救：`herdr agent rename <pane-id> <slug>`。

### 真的該擋著等你的只有三種

推 code、開 PR、動到別人的東西（改 Slack 表、關 issue）。其他讓它跑完再看。

---

## 實際指令

### 開一個第一波 agent（不開 worktree）

第一波只讀 repo，**不要用 `worktree create`** —— 用 `workspace create`，
cwd 指到整合分支那份 checkout：

```bash
SLUG=brief-T07          # 還沒有 issue 編號，用 Slack「名稱」欄的代號

PANE=$(herdr workspace create \
  --cwd ~/code/teamsync-frontend \
  --label "$SLUG" --no-focus \
  | jq -r '.result.root_pane.pane_id')

herdr agent start "$SLUG" --kind claude --pane "$PANE"
herdr agent prompt "$SLUG" "<一句話：要查什麼 + repo 外的來源路徑>"
```

回傳結構跟 `worktree create` 一樣（實測 `result.root_pane.pane_id` = `w1D:p1`）。

收掉用 **`herdr workspace close <workspace_id>`** —— 注意是**位置參數**，
跟 `herdr worktree remove --workspace <ID>` 的寫法不一樣，這裡會踩到。

⚠️ **name 一樣不能省。** 第一波沒有 issue 編號，所以用不了 `fix/1769-…` 那套 slug；
用 `brief-<PM 代號>`，開完 issue 進第二波才換成正式 slug。

### 開一個第二波 agent（開 worktree）

```bash
SLUG=fix-1769-export-warehouse-only
ISSUE=1769

# 1. 從整合分支開 worktree，回傳的 JSON 裡有 pane id
PANE=$(herdr worktree create \
  --base fix/inventory \
  --branch "fix/1769-export-warehouse-only" \
  --label "$SLUG" --no-focus \
  | jq -r '.result.root_pane.pane_id')

# 2. bootstrap：兩行就夠（在 worktree 的 frontend/ 底下）
pnpm install --frozen-lockfile
gh issue view $ISSUE --comments > .claude/handoff.md

# 3. 起 agent（一定要給 name）
herdr agent start "$SLUG" --kind claude --pane "$PANE"

# 4. 丟一句話進去
herdr agent prompt "$SLUG" "讀 .claude/handoff.md，你 own issue #$ISSUE"
```

第 4 步那句 prompt 短到不像話 —— **這是對的**。一長就代表你在替中層想它該怎麼做，
而且該講的都在 `.claude/handoff.md` 裡了。要補東西就改那個檔再叫它重讀，
這樣補的內容不會隨 compact 蒸發。

⚠️ Phone 的 Termux PRoot 環境不一定有 `jq`，那邊用 python 版（標準函式庫就夠）：

```bash
PANE=$(herdr worktree create ... \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["root_pane"]["pane_id"])')
```

### bootstrap 為什麼只有兩行

（下表的檔案路徑都相對於 `teamsync-frontend`。）

| 要不要做 | 為什麼 |
| --- | --- |
| `pnpm install` ✅ | agent 要能自我驗證。沒有 `node_modules` 就沒有 vitest / eslint / `tsc --noEmit`，它只能盲寫。pnpm 是 hardlink（`frontend/package.json:6` 的 `packageManager: pnpm@10.11.1`），實體只有一份，幾秒的事，不要省 |
| `gh issue view` ✅ | agent 讀本地檔省 context。`.gitignore:52` 已有 `.claude/`，不會進 git |
| cp `.env.local` ❌ | **不需要。** `.env.local.example` 裡每一行變數都是註解掉的，檔案自己寫「the app will work normally without them」；`vite.config.js:12` 是 `loadEnv` 純讀取、不會 throw；`pnpm test` / `lint` / `typecheck`（`package.json:94/98/91`）沒有一個碰 env。實測過：在沒有 `.env.local` 的 worktree 跑 `npx vitest run` 全過 |

複製 `.env.local` 出去的當下是一致的，之後就是一份會靜靜過期的秘密檔副本 —— 散越多份越難清。

### 看現在有誰在跑

```bash
herdr agent list          # agent_status: idle / working / blocked，有 name 的才是正規起的
claude agents --json      # interactive 和 background 都列，含 pid 和 sessionId
```

### herdr 指令速查（給人看的，不是權威）

⚠️ **語法的權威是 `herdr --help` 和 `herdr --skill`。** 下面這張表是手打時的快速參考，
會過期 —— 已經過期過一次（`workspace close` 是位置參數，`worktree remove` 是 `--workspace`，
兩支寫法不一樣）。跟實際不符時以 CLI 為準，回來修這張表。

**agent 不看這張表。** 它讀 `~/.agents/skills/herdr/SKILL.md`，那是官方版、跟 binary 同版：

```bash
mkdir -p ~/.agents/skills/herdr && herdr --skill > ~/.agents/skills/herdr/SKILL.md
ln -sfn ../../.agents/skills/herdr ~/.claude/skills/herdr
```

⚠️ **`herdr update` 之後要重跑第一行**，否則 skill 會停在舊版的指令語法。
用 `herdr --skill` 而不是 `npx skills add herdrdev/herdr@herdr`，因為前者印的是你這顆
binary 的版本，後者是發布當下那版。


| 指令 | 用途 |
| --- | --- |
| `herdr workspace create --cwd --label --no-focus` | **第一波**：只開 pane 不開 worktree，回傳 `root_pane.pane_id` |
| `herdr worktree create --base --branch --label --no-focus` | **第二波**：從整合分支開 worktree，回傳 `root_pane.pane_id` |
| `herdr agent start <SLUG> --kind claude --pane <ID>` | 在 pane 裡起 claude（**一定要給 name**） |
| `herdr agent prompt <SLUG> <TEXT>` | 從任何 pane 丟一句進去 |
| `herdr agent wait <SLUG> --until idle --until blocked` | 擋著等它需要人 |
| `herdr agent attach <SLUG>` | 切過去直接打字 |
| `herdr agent rename <TARGET> <SLUG>` | 補 name 給手打起來的 agent |
| `herdr agent read <SLUG>` | 讀它的終端輸出 |
| `herdr agent list` | 列所有 agent 和狀態 |
| `herdr notification show` | 發通知給你 |
| `herdr workspace close <WORKSPACE_ID>` | 收掉第一波（**位置參數**，不是 `--workspace`） |
| `herdr worktree remove --workspace <ID>` | 收掉第二波（整合測試過了才收） |

`--kind` 支援的值有 `claude`、`codex`、`gemini`、`cursor` 等 20 幾種。

---

## 要先準備什麼

### 不需要準備的

- **不用告訴 agent「去哪找程式碼」。** grep 和 glob 它比你快，不需要索引。
- **不用建「Slack 代號 → 模組 → 路徑」對照表。** 第一版寫了要建，實跑後發現不必 ——
  issue 標題前綴（`[modules/inventory]`、`[inventory/docs]`）已經在做這件事，
  再開一份對照表就是第二套會過期的東西。
- **不用建 `backlog/` 目錄。** issue 就是 backlog。

### 需要準備的：指紋

**這是 issue 由 agent 自己開（②）的前置條件，不是加分項。** 沒有它一定會重複開單。

issue body 埋一行：

```markdown
<!-- slack-list-item: Rec0B… -->
```

開單前先比對：

```bash
gh issue list --search "Rec0B…" --state all
```

⚠️ **不要靠 GitHub 原生的重複偵測。** 它會在填表時列出最多 3 筆相似 issue，
但官方說明只講網頁表單，**沒有講 `gh issue create` 走不走得到**。當它不存在。

指紋從 `Rec…` 開頭那串來，`work-helper` 的 `bin/slack-list mine` 每列開頭就印著。

### issue 的格式在哪

`teamsync-frontend/docs/guides/workflow/github-issue-standards.md` 是權威，
操作慣例（`gh issue create --type` 是必要的）在 `teamsync-frontend/docs/agents/issue-tracker.md`。
兩份都已經存在，照著用就好。

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

這不是自創寫法 —— **2026 實際被部署的架構就是這個**：一個 orchestrator 持有完整對話 context，
spawn 用完即丟的隔離 subagent，subagent 只回傳 1000–2000 token 的壓縮摘要，
所以主 agent 累積的是提煉過的結論，不是原始搜尋軌跡。

### subagent 的代價：零攤銷

隔離越多，state pollution 越少，但 **handoff loss 越大** —— brief 沒寫好的 subagent，
前幾輪會浪費在重新發現你本來就有的 context。而且 subagent 在重複的類似查詢上
**完全沒有攤銷效益**，每次呼叫都從零開始；重置得太兇會逼它重新推導本來就有的東西，
每輪成本降了但總輪數變多。

所以規則是：

> **一次性的探索用 subagent；會被問第二次的，寫進檔案。**

這對上四個性質裡的 **recurring** —— 會再來第二次的東西不該重查，
該落成 issue、`.claude/handoff.md`、或 repo 的 `CLAUDE.md`。
第一波簡報本來就在做這件事：查一次，結論進 issue，第二波直接讀。

⚠️ **「pane 的 context 可以複用」是假的優勢。** 留著的 context 會劣化（goal drift），
留越久混越厲害。**真正可複用的東西應該在檔案裡，不在誰的 context 裡。**

---

## Context 成本

「10 個 agent 各自翻 repo 不是很燒？」總量確實變多，但**每個 agent 的 context 是乾淨的、只裝一件事**。
壓成一個 session 幫你查 10 件事才是死路 —— 第 4 件開始它就會混淆前面的。

磁碟不是成本：pnpm 的 `node_modules` 是 hardlink，五個 worktree 的實體只有一份
（`du -sh` 每個都算滿是重複計算）。

錢的部分用案例文那招 Mix and Match：查資料階段用便宜模型（它只是在 grep 和讀檔），
你決策完之後的實作階段才換貴的。

---

## 從哪開始

**不要一開始就開 10 個。從 2–3 個開始。**
你的瓶頸不是 agent 的速度，是你自己審核的速度。

建議順序：

1. 拿一件真的待辦，**手動跑一次上面那五行指令**，看簡報產得對不對
2. 簡報格式和「⚠️ 需要對齊 / ✅ 可以直接做」的判準定下來 ← **這步最值錢**
3. 才寫 script 把 spawn 自動化

---

## 還沒做的

- **`bin/fleet` script 還沒寫。** 上面的指令都手動驗證過，但還沒串成腳本。
  第一件該包進去的是 bootstrap 那兩行，不是 spawn —— spawn 你手打很快，
  環境沒起來才是每次都卡住的地方。
- ~~**判準還沒定。**~~ 2026-08-15 定了：四個性質當骨架、「答案在哪」當一句話版本，
  簡報的 ✅ / ⚠️ 用同一把尺。**還沒實跑驗證過**，跑個兩三件再回來修。
- **調度層還沒有。** 現在是手動開 session。
- **策略層（日記 agent）先不做。** 那層管的是「你有沒有在做對的事」，不是「事情做完沒」，
  等中層跑順了再說。

## 相關

- [1→1→N Agent Fleet 案例](../agent-fleet-case-study.md) —— 這套架構的來源
- [多 Agent 工具：怎麼看、怎麼比](../multi-agent-tools-landscape.md)
- `~/code/work-helper` 的 `bin/slack-list` 和 `skills/slack-todo/` —— 待辦從哪來
