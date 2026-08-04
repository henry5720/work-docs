# IaC 是什麼、為什麼一定要用

> **對象**：PM／RD
> **目的**：白話解釋 Custom Tables 的 IaC,以及它跟 alembic / terraform 的關係
> **對應版本**：custom-tables-docs（`ed5bc4c`, 2026-08-02）
> **撰寫日期**：2026-08-04

---

## 1. 一句話

**IaC = Infrastructure as Code。白話:把整套設定寫成一份文字檔。**

在 Custom Tables 裡,「整套設定」指的是：表 + 欄位 + 關聯 + 計算欄位 + 規則 + 觸發器 + 檢視 + 權限 + 自動化 + 種子資料 —— **全部**。

---

## 2. 沒有 IaC 的話會怎樣

你得用 API 一步一步戳：

```
POST 建表「客戶」            → 拿到 table_id: 4a7f...
POST 建欄位「公司名」         → 要填上面那個 4a7f...
POST 建表「商機」            → 拿到 table_id: 9b2c...
POST 建欄位「客戶」type=link  → target 要填 4a7f...
POST 設定 rules
POST 設定 grants
...  三十幾次呼叫,每次都要接上一次回傳的 UUID
```

兩個致命問題：

| 問題 | 後果 |
| :--- | :--- |
| **沒有版控** | 誰改了什麼、為什麼改,沒人知道。線上 schema 是黑盒 |
| **不能複製** | 測試環境弄好了,正式環境要重戳三十次,而且 UUID 全都不一樣 |

---

## 3. IaC 怎麼解決

把那三十次呼叫寫成一份 JSONL 檔案,**用名字代替 UUID**：

```jsonl
{"kind":"header","version":1,"system":"acme-crm","description":"ACME sales CRM"}
{"kind":"table","ref":"accounts","spec":{"name":"客戶","key":"name"}}
{"kind":"column","table":"accounts","ref":"name","spec":{"name":"公司名","type":"string","required":true}}
{"kind":"table","ref":"deals","spec":{"name":"商機","key":"name"}}
{"kind":"column","table":"deals","ref":"amount","spec":{"name":"金額","type":"float"}}
{"kind":"column","table":"deals","ref":"probability","spec":{"name":"成交機率","type":"float"}}
{"kind":"column","table":"deals","ref":"account","spec":{"name":"客戶","type":"link","target":"accounts","cardinality":"one"}}
{"kind":"column","table":"deals","ref":"weighted","spec":{"name":"加權金額","type":"formula","expression":"[金額] * [成交機率]"}}
```

**關鍵在 `"target":"accounts"`** —— 這裡寫的是 `ref` 名字,不是 UUID。套用時引擎自己換成真實 UUID。

於是這份檔案：

- ✅ 可以進 git,誰改什麼看 diff 就知道
- ✅ 測試環境套用一次、正式環境再套用一次,**同一份檔案**
- ✅ 賣給第二個客戶,同一份檔案再套用一次

---

## 4. 跟你熟的東西對照

| 你熟的 | Custom Tables IaC |
| :--- | :--- |
| `terraform plan` | `iac.plan` —— 先看「將會做什麼」,還沒真的動 |
| `terraform apply` | `iac.apply` —— 帶著 `plan_hash` 送出 |
| `terraform import` / `state pull` | `iac.export` —— 反向把線上狀態倒出成檔案 |
| alembic migration | 同樣是 schema 進版控,但 IaC 是**宣告式**（寫最終狀態）而非**命令式**（寫變更步驟） |
| `docker-compose.yml` | 一份文件描述整個系統,而不是一堆手動指令 |

### plan → apply 的防呆

`iac.plan` 會回一個 `plan_hash`。`iac.apply` 要把**同一份文件**連同那個 hash 一起送回去,對不上就擋下來。

這防的是「你 review 過的計畫」和「實際執行的計畫」不一致 —— 有人在中間偷改文件就會被發現。

> 官方文件的措辭是「逐位元組相同」;實作上 `plan_hash` 是把解析後的 fingerprint 折疊進去（`custom_table_iac/refs.py`）,不是單純對原始 bytes 取雜湊。要精確判斷什麼算「改過」→ [reference/iac](https://docs.customtable.teamsync.com.tw/zh-TW/reference/iac)。

---

## 5. 三種可攜的 ref token

| Token | 指向 | 套用前要不要改 |
| :--- | :--- | :--- |
| `$table:<ref>` | 同一份 bundle 內宣告的表 | ❌ 不用,文件內部自己解析 |
| `$dept:<名稱>` | 貴公司**真實存在**的部門 | ✅ **要改成你自己的部門** |
| `$smc:line:<...>` | 真實的 social media client | ✅ **要改** |

> 官方 use-case 文件末尾通常有幾行 `record` 種子資料（例如 `Dr. Chen`、`Scaling`）—— 那些要換成你自己的,或直接刪掉套用一個空系統。

### 前向引用是允許的

同一份 bundle 內,A 引用了還沒 apply 的 B,**不是 plan error**。executor 會在延後的第二輪解析它。

### export 是 fail-closed

`iac.export` 會把 live UUID 改寫回 `$table:<ref>`。如果有懸空引用（例如 `materialize_slots` 的目標表已不存在、或不在匯出範圍內），**export 直接拋錯,而不是輸出原始 UUID**。這是刻意的：寧可失敗,不要產出一份不可攜的假 bundle。

---

## 6. `system` 欄位 = 一份 bundle 一個系統

header 帶 `system` 欄位。這不是註解,它就是設計意圖：

> **一份 IaC 文件 = 一個系統。**

官方 `use-cases/booking.mdx` 的原話是「**整間診所就是一份 IaC 文件**」—— 七張依相依順序排好的表、lookup 與 rollup、兩條 rule、每晚的時段掃描、各角色的 view、對外的匿名預約頁、櫃檯與診間的權限分界,全部在一份 JSONL 裡。

所以不同的業務系統要分成不同 bundle。這不只是整理習慣,還跟 command 的 tag 邊界對齊 → 見 [03_設計時的三個決定.md](03_設計時的三個決定.md)。

---

## 7. 撰寫順序

依相依關係排：

```
header
  ↓
tables（主檔先於明細）
  ↓
columns（基本欄位 → link → lookup/rollup/formula）
  ↓
rules
  ↓
triggers
  ↓
views
  ↓
grants / permissions
  ↓
record（種子資料,選填）
```

---

## 8. IaC 通道跟 REST 通道行為不一樣的地方

這個差異會咬人：

| 情況 | REST | IaC |
| :--- | :--- | :--- |
| `require_approval` 規則引用的 review template 無效 | `400`,detail 是單一字串 | **`200`**。executor 接住錯誤,把它記成該資源行在 apply 報告裡的 apply error,**其他每一行照常執行** |
| `materialize_slots` 的 `target.table_id` 寫 `$table:` token | 被拒絕（IaC-only） | 允許,驗證前先解析成 live table id |

**所以 IaC apply 回 `200` 不等於全部成功。** 要讀 apply 報告的逐行結果。

---

## 9. 動手玩

文件站有兩個工具：

| 工具 | 用途 |
| :--- | :--- |
| `/tools/iac-workbench` | 貼一份 JSONL 直接 plan,看清楚每個 action |
| `/tools/playground` | 選 scope,確認實際展開的 URL 與 auth 說明 |
| `/tools/wizards` | 審批設定精靈、建立系統精靈（用合成資料走完流程） |

建議第一次就拿 `use-cases/crm.mdx` 或 `use-cases/booking.mdx` 裡的完整 bundle 貼進 workbench 跑 plan,不要自己從零寫。
