# 斷言自我審查紀錄

> **為什麼有這份**：這份文件集在前三輪出現過三次事實錯誤,模式都一樣 ——
> **從官方文件的一句話推論,而沒有回 code 確認那句話的適用範圍**。
> 所以把所有「只有 X」「必須 X」「不能 X」這類絕對斷言掃出來逐條驗證。
>
> **審查日期**：2026-08-04
> **審查基準**：teamsync-backend `5.7.1`（`328f7817`）／teamsync-frontend（`cbd123f2`）／custom-tables-docs（`ed5bc4c`）
> **範圍**：掃出 90 句含絕對詞的句子,其中 **26 條會改變設計決定**,逐條驗證。

---

## 結果總覽

| 結果 | 條數 |
| :--- | :--- |
| ✅ 回 code 驗證通過 | 20 |
| 📄 只有官方文件支持（沒有 code 二次確認） | 3 |
| ⚠️ 修正 | 2 |
| 🔴 審查中發現的新事實 | 1 |

---

## ✅ 回 code 驗證通過（20 條）

| # | 斷言 | 證據 |
| :--- | :--- | :--- |
| 1 | scope 建了不能改 | `CustomTableUpdatePayload` 只有 `name`／`description`；全 repo 無 transfer／move／change scope 的函式 |
| 2 | 關聯欄位只能由窄往寬 | `custom_table_links.py` → `validate_link_scope()`，downward／sibling／跨公司 fail closed |
| 3 | 一支 command 只能碰同一個 scope-local tag 底下的表 | `custom_table_commands/tags.py` 模組 docstring；錯誤碼 `tag_required`／`tag_not_found`／`tag_escaped` |
| 4 | `tag_id` 是 command 的必填欄位 | `schemas/custom_table_commands.py` `tag_id: str = Field(...)` |
| 5 | 一支 command 只能觸及一張有簽核規則的表 | `custom_table_commands/approval.py` → `multiple_approval_gated_tables` |
| 6 | 記錄查詢 API 沒有 JOIN | `CustomTableQueryRequest` 欄位只有 filters／sort_by／sort_order／limit／offset／computed_filters／stored_filters／q／any_of／sort —— **沒有 joins** |
| 7 | 「同一張表不同聊天室看不同列」只有 department | `custom_table_scp.py`：「the channel lane is **department-only** because only a department table can hold the chatroom grants」；「a governed table can only be department-scoped」 |
| 8 | 計算欄位不能當不可重複鍵 | `custom_table_rules.py`：`"computed columns cannot be unique components"` |
| 9 | 計算欄位不能用在權限的列過濾 | `custom_table_acl.py`：「must be a STORED SCALAR column (computed columns rejected)」 |
| 10 | `unique` 是 DB 層約束 | `custom_table_rules.py` docstring：「**SQL-level** unique constraints」；「unique rules materialize CustomTableUniqueConstraint + side-table」 |
| 11 | 時段表不能掛簽核規則 | `custom_table_triggers.py` → `approval_trigger_conflict` |
| 12 | `custom_tables` job → 聊天室表；`custom_tables_department` job → 部門表 | `custom_table_tool_runtime.py:174-177` |
| 13 | 兩個 job 是一個 toolkit 的兩個 scope,可同時開 | `tool_loader.py:82` 註解；`enums.py`「Not mutually exclusive」 |
| 14 | 一個 custom-table job 都沒開 → 拿到兩個 scope | `custom_table_tool_runtime.py:180` `return frozenset(scopes) if scopes else CT_SCOPES_ALL` |
| 15 | 聊天室自有表不經過 Insight flip 過濾 | `_insight_allowed_table_ids()` docstring：「Narrow only: result ⊆ dept_table_ids ∪ client_explicit_ids」 |
| 16 | untagged 的已授權部門表永遠載入 | 同上函式：`allowed | (set(dept_table_ids) - tagged) | enabled` |
| 17 | 主 agent 叫不到分析工具,要委派 `custom_tables_analyze` | `custom_table_analyst.py:4`「via a single `custom_tables_analyze` tool. The sub-agent owns the low-level…」+ `create_agent()` |
| 18 | 表格模組只認聊天室表 | `use-custom-forms.js` 匯入的六個 API 全是 `ModuleCustomTablesChatroom*`；`FormsInterface.tsx` 出現 "Department" **0 次**，唯一資料來源是 `useCustomForms(room?.id)` |
| 19 | 前端兩份 job 選單完全一樣、都只有 8 個選項 | `chat/…/JobsSelector.jsx` 與 `chatV2/…/jobOptions.ts` 逐項比對相同；後端 `ChatroomJobType` 有 12 個 |
| 20 | Insight flip 只有 service 層、0 個 UI consumer | `chatroomSettingsApi.js` 有 `listCustomTableSystemsForChatroom`，全前端無呼叫端 |

---

## 📄 只有官方文件支持（3 條）

這幾條**沒有回 code 二次確認**,可信度低一級。若要據此做設計決定,請先自行驗證。

| 斷言 | 來源 |
| :--- | :--- |
| 時段掃描只會新增,從不修改或刪除；已取消的時段不會被重新掃描復活 | `concepts/triggers/materialize-slots` |
| `immutable_when` 以寫入**之前**的資料判斷（其他規則的 `when` 用寫入後） | `concepts/rules/immutable-when` |
| `iac.export` 遇懸空引用 fail-closed（拋錯而非輸出原始 UUID） | `concepts/triggers/materialize-slots` |

---

## ⚠️ 本次修正（2 條）

### 1. `03`：company scope 的「AI 讀得到嗎」原本寫「⚠️ 見 04」

**問題**：模糊,實際上是明確的「讀不到」。
**已改為**：❌ 完全讀不到,並附 code 證據。

### 2. `02_IaC`：「`iac.apply` 必須送**逐位元組相同**的文件」

**問題**：「逐位元組」是官方文件的措辭,但實作上 `plan_hash` 是把解析後的 fingerprint 折疊進去（`custom_table_iac/refs.py`），不是對原始 bytes 取雜湊。而且依[本文件集的編輯原則](README.md#-編輯原則寫這裡的東西之前先看這個)，這種精度本來就不該寫死。
**已改為**：「要把同一份文件連同那個 hash 一起送回去,對不上就擋下來」，並標註官方措辭與實作差異。

---

## 🔴 審查中發現的新事實（1 條）

### company scope 的表,AI agent 讀不到

```python
# src/components/tools/custom/custom_table_tool_constants.py
CT_SCOPE_CHATROOM = "chatroom"
CT_SCOPE_DEPARTMENT = "department"
CT_SCOPES_ALL = frozenset({CT_SCOPE_CHATROOM, CT_SCOPE_DEPARTMENT})
```

**沒有 company**，`ChatroomJobType` 也沒有對應的 job。

**設計含意**：「全公司共用的基準資料」（幣別、稅率、產品分類）如果需要 AI 查得到,**不能放 company scope** —— 得放 department 再分享給聊天室。

已補進 [03](03_設計時的三個決定.md) 與 [04](04_AI讀不到怎麼查.md)。

---

## 前三輪的錯誤紀錄（留著當教訓）

| 輪次 | 錯誤結論 | 真相 | 錯誤成因 |
| :--- | :--- | :--- | :--- |
| 1 | 「command 沒有 if/else、沒有迴圈」 | 有 `$case`、step 的 `when`、`for_each` | 只讀了 step kind 清單就下結論,沒讀完運算式詞彙那一節 |
| 2 | 「全 repo 找不到『智慧表格』」 | 實際字串是「**智慧資料表**」 | 用一個猜的關鍵字搜,沒中就當成不存在 |
| 3 | 「只有部門表能被 AI 看到」 | 剛好相反 —— 聊天室表 1 道關、部門表 3 道關 | 讀到「只有部門表能用 tag 組成 system」，把只描述**第三層**的句子擴大成全域結論 |

**共同模式**：把一句有限定範圍的話,推論成沒有限定的結論。

**對策（已寫進 [README 的編輯原則](README.md)）**：凡是要寫「只有 X」「必須 X」「不能 X」,先回 code 確認那句話管的是哪一層。寫不出 code 證據的,就標成「只有官方文件支持」。
