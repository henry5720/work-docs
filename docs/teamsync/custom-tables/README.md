# Custom Tables 理解筆記

> **對象**：PM／RD／要決定「新模組怎麼做」的人
> **目的**：先建立心智模型,再談實作。這裡不是 API 文件,API 文件在 `custom-tables-docs`
> **對應版本**：teamsync-backend `5.7.1`（`328f7817`）／custom-tables-docs（`ed5bc4c`, 2026-08-02）／teamsync-frontend（`cbd123f2`, 2026-08-03）
> **撰寫日期**：2026-08-04

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
| [03_關鍵約束.md](03_關鍵約束.md) | 設計 schema 之前必須知道的硬約束與地雷 |

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
| 需要條件分支演算法（輪班分配、相似度比對、推薦） | ⚠️ 那部分寫 Python,其餘照用 |
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
                           │ 產生三種對外介面
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
     REST API         AI agent 工具      內建表單 UI
    （你的前端吃）   （聊天室 AI 自己查）（使用者直接用）
```

你只負責 **最上面那一層**,加上 **左下角的前端**。中間跟其他兩個出口是免費的。

---

## 現況已知落差

這些是讀 code 讀出來的,不在官方文件裡:

| 落差 | 影響 |
| :--- | :--- |
| Insight system 開關（`GET/PUT /private/chatrooms/setting/custom-table-tags/{chatroom_id}`）在前端 **只有 service 層,0 個 UI consumer** | 要讓 AI 讀得到部門表,目前只能用 API 開,沒有畫面 |
| `src/components/tools/custom/` 下的 `dentist_booking.py`、`salon_booking.py`、`wms.py`、`panco.py`、`booking/` 是**舊做法**（硬刻垂直 agent toolkit,`booking/backend.py` 完全沒有 `custom_table` 字樣） | 新模組不要照抄那套,官方 use-cases 就是要取代它們 |
| Custom Tables **沒有** MCP server 對外暴露。`src/routers/private/user/mcp.py` 是 Google OAuth 憑證管理,方向相反 | AI 存取一律走 agent toolkit 或 command 的 `agent_enabled`,不是 MCP |
| 前端 UI 名稱是「**表單管理**」(`locales/zh-TW/layout.json:32` `formManagement`),不是「智慧表格」 | 跟客戶／PM 溝通時要對齊名詞 |

---

## 相關資源

| 資源 | 位置 |
| :--- | :--- |
| API 文件站（含 Playground、IaC 工作台、精靈） | `/home/henry/code/custom-tables-docs` |
| 給 AI 讀的全文 | 文件站的 `/llms.txt`、`/llms-full.txt`,任何頁面加 `.md` |
| 實戰案例（一個領域一篇完整 schema 設計） | 文件站 `use-cases/`：`booking`、`crm`、`ecommerce`、`hr`、`pms`、`qa`、`support`、`wms` |
| 後端實作 | `teamsync-backend`：`src/crud/custom_table*`、`src/routers/private/modules/custom_tables/` |
| 前端現成 UI | `teamsync-frontend`：`frontend/src/app/chatV2/components/forms/` |
| 「bespoke 模組坐在 Custom Tables 上」的先例 | `teamsync-frontend`：`frontend/src/app/modules/spc/hooks/useTeamSyncSpecTable.js` |
