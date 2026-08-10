# Custom Tables 理解筆記

> **對象**：PM／RD／要決定「新模組怎麼做」的人
> **目的**：先建立心智模型,再談實作。這裡不是 API 文件,API 文件在 `custom-tables-docs`
> **對應版本**：teamsync-backend `5.7.1`（`328f7817`）／custom-tables-docs（`ed5bc4c`, 2026-08-02）／teamsync-frontend（`cbd123f2`, 2026-08-03）
> **撰寫日期**：2026-08-04
>
> ⚠️ **版本漂移**：[05](05_AI聊天室怎麼用資料表.md)、[06](06_前後端各自能動什麼.md) 與本頁「現況已知落差」表已於 2026-08-10
> 重新核對到 backend `5.7.2`（`f19ce7af2`）／frontend（`bffd65693`）；**01–04 仍是 08-04 的基準**。

---

## 這個目錄放什麼

只放「理解用」的文件。目標是讓一個沒碰過 Custom Tables 的人,讀完能回答三個問題:

1. 這東西到底在幹嘛?跟我平常寫後端有什麼關係?
2. 我的模組適不適合用它做?
3. 有哪些坑是官方文件散在二十幾頁裡、但一定會踩到的?

| 文件 | 讀完你會知道 |
| :--- | :--- |
| [01_心智模型.md](01_心智模型.md) | Custom Tables 是什麼、名詞跟你平常寫的 code 怎麼對照、它的代價 |
| [02_IaC.md](02_IaC.md) | IaC 是什麼、為什麼一定要用它、plan/apply 怎麼跑 |
| [03_設計時的三個決定.md](03_設計時的三個決定.md) | 動手前要按順序決定的三件事（哪些表一起寫 → 放哪一層 → tag 怎麼切），以及為什麼第二件不可逆 |
| [04_AI讀不到怎麼查.md](04_AI讀不到怎麼查.md) | 「AI 查不到我的表」的四個獨立原因與八步診斷流程 |
| [05_AI聊天室怎麼用資料表.md](05_AI聊天室怎麼用資料表.md) | 正常運作時的完整流程:`jobs` 怎麼組出工具箱、AI 靠什麼認識你的表、讀／寫／command 各自的機制與開關 |
| [06_前後端各自能動什麼.md](06_前後端各自能動什麼.md) | 每個可動之處分成三層（後端寫死／前端設定／前端宣告）+ 「我想改變 AI 的行為該去哪改」的決策流程 |
| [AUDIT.md](AUDIT.md) | 斷言自我審查紀錄 —— 哪些結論有 code 證據、哪些只有官方文件支持、以及過去改過哪些錯 |

> 💡 **看到「只有 X」「必須 X」這類斷言時,可以去 [AUDIT.md](AUDIT.md) 查它的證據等級。** 這份文件集改過三次事實錯誤,所以驗證紀錄是公開的。

### 誰該讀哪幾份

| 你是 | 讀 |
| :--- | :--- |
| 第一次聽到 Custom Tables,想知道這是什麼 | README + **01** |
| 要評估「我這個案子該不該用它」 | README + **01** |
| 要開始設計 schema | **01 → 02 → 03**（03 一定要在建表前讀完,因為 scope 改不了） |
| 想知道 AI 聊天室到底怎麼用這些表 | **05** |
| 想改變 AI 的行為,但不知道該改哪裡 | **06** |
| 已經上線,AI 讀不到資料 | **04**（查完還想懂原理 → **05**） |
| 要接 API 寫前端 | 這份不夠 —— 直接看[官方文件站](https://docs.customtable.teamsync.com.tw/zh-TW/)與 Playground |

### 貫穿全部文件的一個視角:人 vs AI agent

很多事情對「人」和對「AI agent」不一樣,所以各份文件會反覆分開講：

| 議題 | 對人 | 對 AI agent |
| :--- | :--- | :--- |
| **聊天室表** | 表格模組直接就能用 | **開 1 道關**（`custom_tables` job,UI 上叫「任務：智慧資料表」） |
| **部門表** | ❌ 表格模組打不開,只能自己刻頁面 | **要開 3 道關**：grant + `custom_tables_department` job + 系統勾選 |
| **權限層數** | 2 層：能不能用這張表 + 能看哪些列 | 聊天室表 3 層、**部門表 4 層** |
| **command** | 一支 API 給前端呼叫 | `agent_enabled` 預設 true,但**還要房間開 `custom_table_commands` job** 才會露出（見 05 §⑥） |
| **目前缺口** | 表格模組只認聊天室表 | job 選單沒有 `custom_table_commands`（2026-08-10 核對:v1 選單已補上 `custom_tables_department`,chatV2 還沒） |

> ⚠️ **聊天室表對 AI 是最簡單的,部門表才最麻煩** —— 跟直覺相反,別搞錯方向。

---

## 這份跟官方文件站的關係

官方 API 文件站在 **<https://docs.customtable.teamsync.com.tw/zh-TW/>**（本機 repo：`/home/henry/code/custom-tables-docs`）。

**兩邊視角刻意不同,不要互相複製：**

| | 官方文件站 | 這份 work-docs |
| :--- | :--- | :--- |
| 讀者 | 已決定要用、正在接 API 的人 | 還在問「這什麼?我該不該用?」的人 |
| 內容 | endpoint、參數、錯誤碼、逐項契約 | 心智模型、名詞對照、決策判斷、跨頁推導出的隱含約束 |
| 組織方式 | 依 **API 分組**（tables / columns / rules…） | 依 **你腦中的問題**（這是什麼 → 怎麼宣告 → 有哪些坑） |
| 正確性保證 | CI 拿 OpenAPI snapshot 比對測試環境,**路由沒文件會讓 CI 失敗** | 人工註記版本,**會靜默過期** |
| 不可替代的價值 | 唯一的契約真相來源 | 把散在 20+ 頁的約束收斂成一句話結論;記錄「讀 code 才知道、文件沒寫」的落差 |

**一句話:官方文件回答「怎麼呼叫」,這份回答「為什麼這樣設計、我該怎麼選」。**

### ✍️ 編輯原則(寫這裡的東西之前先看這個)

| ✅ 該寫進來 | ❌ 不要寫進來（去看官方文件） |
| :--- | :--- |
| 比喻與心智模型（「command 就是 stored procedure」） | 精確的錯誤碼與錯誤訊息字串 |
| 「該不該用」「該怎麼選」的決策依據 | 精確的數字上限、欄位長度 |
| **跨頁推導**出來的結論（散在 5 頁的約束合起來意味著什麼） | 逐欄位的 payload 契約 |
| **不可逆**的事（例如 scope 建完改不了） | 完整 endpoint 清單與參數表 |
| 讀 code 才知道、官方文件沒寫的**現況落差** | 任何 Playground / codegen 已經能產出的東西 |
| 「這裡會出乎意料」的**方向性**警告 | 那個警告的精確數值與觸發條件 |

**判斷方式**：如果這段話在官方文件裡有、而且會隨版本變動 → 不要抄,放連結。
官方站的 Playground 與程式碼產生器讀的是同一份端點目錄,永遠比手抄準;而且它的 CI 會拿 OpenAPI snapshot 比對測試環境,**這份不會**。

---

## 一句話總結

**Custom Tables 是 TeamSync 內建的 Airtable —— 一個「用宣告取代寫後端」的引擎。**

你宣告要什麼表、什麼欄位、什麼規則,它自動長出 CRUD API、權限、稽核、附件、匯入匯出、AI 查詢能力。你省下的是後端,**不是前端**。

---

## 什麼時候該用、什麼時候不該用

判斷標準只有一句:

> 你的模組是不是「一堆表 + 一堆欄位 + 一堆規則 + 一堆權限」?

| 情況 | 建議 |
| :--- | :--- |
| 表單、主檔、案件管理、CRM、預約排班、庫存 | ✅ 用它,後端可省 80~90% |
| 需要條件、迴圈、JOIN、彙總的業務邏輯 | ✅ command v2 做得到（`$case`／`when`／`for_each`／`joins`／`group_by`） |
| 需要 while／遞迴／模糊比對／呼叫外部服務 | ⚠️ 那部分寫 Python,其餘照用 |
| 重運算、重外部整合（OCR、報表引擎、第三方 API） | ⚠️ 同上,Custom Tables 只當資料層 |
| 高頻寫入、要自己調 index 與 SQL | ❌ 不適合 |

---

## 站在哪裡看整件事

```
        ┌─────────────────────────────────────────┐
        │  你寫的:一份 IaC 文件（宣告要什麼）      │
        └──────────────────┬──────────────────────┘
                    plan → apply
                           ▼
        ┌─────────────────────────────────────────┐
        │  Custom Tables 引擎（自動長出以下全部）  │
        │  表 / 欄位 / 關聯 / 計算 / 規則 /        │
        │  觸發器 / 權限 / 稽核 / 匯入 / 附件      │
        └──────────────────┬──────────────────────┘
                           │
                    同一份資料，三種殼
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
     ① 表格模組        ② AI 聊天室    ③ 自己刻的模組頁面
    （通用，已有）     （開 job 即可）  （by case 自己做）
     使用者自己建表      用嘴問         客戶要的專屬流程
```

**不是三份資料,是一份資料三個入口。** 從自己刻的頁面改一筆,使用者從表格模組看也是改過的,AI 問也是新的 —— 不存在同步問題。

你只負責 **最上面那一層**,加上 **殼 ③**。殼 ① 和 ② 是免費的。

---

## 現況已知落差

這些是讀 code 讀出來的,不在官方文件裡（**job 選單與 UI 兩條 2026-08-10 重新核對過**）:

| 落差 | 影響 |
| :--- | :--- |
| 後端 `ChatroomJobType` 有 12 個值,但**前端兩份 job 選單都沒有 `custom_table_commands`**（`JobsSelector.jsx` 11 個、`app/chatV2/components/settings/basic/jobOptions.ts` 10 個,後者另缺 `custom_tables_department`） | **command 完全無法從畫面開啟**,AI 因此只有通用寫入可用。後端 `validate_jobs` 只檢查 enum 與互斥,這個 job **沒有**任何 property 前置需求也不互斥 —— 現有 `PUT jobs` 端點原本就吃它,**缺的純粹是選單裡的一個選項** |
| Insight system 開關（`GET/PUT /private/chatrooms/setting/custom-table-tags/{chatroom_id}`）**v1 已有 UI**（`app/chat/components/chatSettings/basic/CustomTableSystemsSelector.jsx`）,**chatV2 仍無** | 同一個房間在兩個前端版本的設定能力不一致 |
| command 服務憑證（`CUSTOM_TABLE_COMMAND_SERVICE_TOKEN` + service URL）未設時,command 工具**靜默完全不載入** | 症狀與「模型不理工具」一模一樣。後端有針對這情境的 warning log,但畫面上分不出來 |
| 寫入的兩段式確認需要 Redis,缺席時 **fail-open** 退回舊的 prompt-level 確認 | 不擋寫入,但「使用者核准的 payload 與實際執行的 payload 相同」這個保證消失,只留 log |
| `src/components/tools/custom/` 下的 `dentist_booking.py`、`salon_booking.py`、`wms.py`、`panco.py`、`booking/` 是**舊做法**（硬刻垂直 agent toolkit,`booking/backend.py` 完全沒有 `custom_table` 字樣） | 新模組不要照抄那套,官方 use-cases 就是要取代它們 |
| Custom Tables **沒有** MCP server 對外暴露。`src/routers/private/user/mcp.py` 是 Google OAuth 憑證管理,方向相反 | AI 存取一律走 agent toolkit 或 command 的 `agent_enabled`,不是 MCP |

### 名詞對齊

| 場合 | 正確名稱 | 位置 |
| :--- | :--- | :--- |
| 側邊欄／模組名 | **表單管理** | `locales/zh-TW/layout.json:32` `formManagement` |
| 模組內部領域名 | **表格模組 (Chat Forms)** | `app/chat/components/forms/README.md` |
| 開啟 AI 查詢表格的 job | **任務：智慧資料表** | `EnableSmartTableModal.tsx`：「偵測到您尚未開啟任務：智慧資料表,開啟後即可在AI聊天室查詢內容」 |

> 三個名字指三件不同的事,不要混用。「智慧資料表」不是表格功能本身,是 **AI 能不能查它**（往 chatroom `jobs` 加 `custom_tables`）。

---

## 相關資源

| 資源 | 位置 |
| :--- | :--- |
| **官方 API 文件站** | <https://docs.customtable.teamsync.com.tw/zh-TW/> |
| ↳ 本機 repo（含 Playground、IaC 工作台、設定精靈的原始碼） | `/home/henry/code/custom-tables-docs` |
| ↳ API Playground（選 scope,看實際展開的 URL 與 auth） | [/zh-TW/tools/playground](https://docs.customtable.teamsync.com.tw/zh-TW/tools/playground) |
| ↳ IaC 工作台（貼 JSONL 直接 plan） | [/zh-TW/tools/iac-workbench](https://docs.customtable.teamsync.com.tw/zh-TW/tools/iac-workbench) |
| ↳ 設定精靈（審批設定、建立系統) | [/zh-TW/tools/wizards](https://docs.customtable.teamsync.com.tw/zh-TW/tools/wizards) |
| ↳ 程式碼產生器（跟 Playground 讀同一份端點目錄） | [/zh-TW/tools/codegen](https://docs.customtable.teamsync.com.tw/zh-TW/tools/codegen) |
| 給 AI 讀的全文 | [/llms.txt](https://docs.customtable.teamsync.com.tw/llms.txt)、`/llms-full.txt`,任何頁面加 `.md` |
| 實戰案例（一個領域一篇完整 schema 設計） | [/zh-TW/use-cases](https://docs.customtable.teamsync.com.tw/zh-TW/use-cases)：`booking`、`crm`、`ecommerce`、`hr`、`pms`、`qa`、`support`、`wms` |
| 後端實作 | `teamsync-backend`：`src/crud/custom_table*`、`src/routers/private/modules/custom_tables/` |
| 前端現成 UI（表格模組,**主力版本**） | `teamsync-frontend`：`frontend/src/app/chat/components/forms/`<br>入口 `app/chat/interfaces/FormsInterface.tsx`<br>先讀模組自己的 `README.md`（導覽地圖）與 `CONTEXT.md`（領域詞彙） |
| ↳ 舊版（`chatV2`,檔案較少、無 README/CONTEXT） | `frontend/src/app/chatV2/components/forms/` —— 參考時以 `chat/` 那份為準 |
| 「bespoke 模組坐在 Custom Tables 上」的先例 | `teamsync-frontend`：`frontend/src/app/modules/spc/hooks/useTeamSyncSpecTable.js` |
