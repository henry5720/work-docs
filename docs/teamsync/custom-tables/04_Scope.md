# Scope:chatroom / department / company 到底差在哪

> **對象**：要決定「我的表放哪一層」的 RD／PM
> **目的**：把 scope 的差異、不可逆性、以及它如何連動 link 與 command 講清楚
> **對應版本**：teamsync-backend `5.7.1`（`328f7817`）／custom-tables-docs（`ed5bc4c`）
> **撰寫日期**：2026-08-04

---

## 一句話總結

**Scope 決定三件事:表由誰擁有、URL 掛在哪裡、請求先過哪一層身分驗證。**

而且它 **建表時就決定,之後不能改**。這是整個 Custom Tables 裡最不可逆的一個決定。

---

## 0. 先給決策法則(其他都是推導)

```
    這張表會不會跟另一張表被「同一個動作」原子寫入?
                    │
        ┌───────────┴───────────┐
        是                      否
        │                       │
  必須同 scope 同 tag      看資料的擁有者是誰
        │                       │
        ▼                       ▼
  整組一起決定 scope      這批資料只屬於一個協作室? → chatroom
  （通常是 department）    由某部門維護、要分享給多個聊天室? → department
                          全公司共用的基準資料? → company
```

**最常見的錯誤是「主檔往上、交易資料往下」** —— 直覺對,但只要有一個動作需要同時原子寫兩層,就會撞上 `tag_escaped`。詳見第 6 節。

---

## 1. 三種 scope 的基本差異

| | **chatroom** | **department** | **company** |
| :--- | :--- | :--- | :--- |
| 擁有者 | 一個聊天室 | 一個部門 | 整間公司 |
| 一般掛載前綴 | `/chatroom/{chatroom_id}` | `/department/{department_id}` | `/company`（**沒有 id**） |
| 適合的資料 | 只屬於一個協作室的工作資料 | 由部門維護、要分享給多個聊天室的系統資料 | 全公司共用的基準資料 |
| 列表／建立表的門檻 | `ChatRoomJoinedRequired` 或 `ChatRoomAccessRequired` | `DepartmentAccessRequired` | `CompanyAccessRequired` |
| 能不能用 tag 組成 AI 的 Insight system | ❌ | ✅ **只有這一層可以** | ❌ |
| 能不能被 SCP（`channel` rule）逐房間切範圍 | ❌ | ✅ **只有這一層有意義** | ❌ |
| 資料列權限閘門 | `CustomTableReadRequired` / `InsertRequired` / `EditRequired` | 同左 | 同左 |

> Source：`src/routers/private/modules/custom_tables/{chatroom,department,company}_server.py`；
> `concepts/scopes.mdx`

### 資料列閘門三層都一樣,但「進得去」不代表「權限一樣」

路徑尾段相同不代表所需權限相同。驗證是兩步：

```
① 先確認你能進入該擁有 scope（上表第四列的門）
② 再合併「表管理者 + 使用者 + 部門 + 聊天室 + 預設 grant」
   算出有效的 can_read / can_insert / can_edit、列過濾、隱藏欄位
```

**相同 endpoint 在三個 scope 可能有不同管理門檻。** 官方文件點名三組已知會分歧的操作：**新增欄位**、**執行 diagnosis**、**解析連結**。

> ⚠️ **不要從 URL 推論角色。** 以各張參考卡片的 scope/auth matrix 為準。

---

## 2. ⛔ Scope 不能改 —— 這是最重要的一節

更新表的 payload **只有兩個欄位**：

```python
# src/schemas/custom_tables.py  CustomTableUpdatePayload
fields: ['name', 'description']
```

沒有 `chatroom_id`、`department_id`、`company_id`。**scope 由你 POST 到哪個掛載點決定,建完就固定了。**

| 想做的事 | 可行嗎 |
| :--- | :--- |
| 把 chatroom 表改成 department 表 | ❌ 沒有這個操作 |
| 把 department 表搬到另一個 department | ❌ 沒有這個操作 |
| 分享給別的聊天室／部門 | ✅ 用 grant,但**表不會搬家**（見第 3 節） |

**實務上的補救**（成本不低,而且要自己搬資料）：

```
iac.export（原 scope）→ 改掛載點 apply（新 scope）→ 資料另外搬 →
更新所有 link / rollup / lookup 的 target → 重建 grant / rules / triggers
```

⚠️ 但 `iac.export` 遇到懸空引用是 **fail-closed**（直接拋錯而非輸出原始 UUID），所以有 `materialize_slots` 之類跨表 trigger 的系統,搬起來更麻煩。

> **所以選 scope 要在建表前想清楚。** 這是本文存在的主要理由。

---

## 3. 分享 ≠ 搬家(最常見的誤解)

> **分享只增加存取權,不會搬動或複製資料表。**

部門表分享給聊天室之後：

```
✅ 資料列 API 仍然走  /department/{department_id}/tables/{table_id}/records
❌ 不是改走          /chatroom/{chatroom_id}/tables/{table_id}/records
```

接 API 最常搞錯這件事。判斷方式：**從表回應的 `chatroom_id` / `department_id` / `company_id` 判斷擁有 scope**,再選對應掛載點 —— 不是從「我是誰」推。

### 跨 scope 分享的兩個方向

端點 **永遠掛在「表的擁有 scope」**：

| 目的 | 表擁有 scope | 路由族群 |
| :--- | :--- | :--- |
| 讓一個**部門**存取**聊天室**表 | chatroom | `/chatroom/{chatroom_id}/tables/{table_id}/department-permissions/{department_id}` |
| 讓一個**聊天室**存取**部門**表 | department | `/department/{department_id}/tables/{table_id}/chatroom-permissions/{chatroom_id}` |

`departmentPermissions.*` **只存在 chatroom scope**；`chatroomPermissions.*` **只存在 department scope**。
> Source：`chatroom_server.py` / `department_server.py` 的路徑定義

### 怎麼發現「有誰分享給我」

有兩個**完全沒有 scope 前綴**的端點：

```
/private/module/custom_tables/shared-with-me
/private/module/custom_tables/tables/resolve
```

```python
# server.py:16
# Cross-scope share discovery ("shared with me") — no scope prefix on
# purpose: the caller cannot know which department/room shared with them.
```

聊天室成員也可用 `GET .../chatroom/{chatroom_id}/tables/shared` 發現已授權給該室的部門表 —— 但之後 **仍用回傳表的部門掛載** 讀寫。

---

## 4. URL 有四種形狀,不是三種

這裡官方文件看起來自相矛盾：

- `concepts/scopes.mdx` 說 company「路徑本來就沒有 `company_id`」
- `concepts/commands/index.mdx` 說「company 掛載點同樣帶有明確的 `{company_id}` path 區段」

**兩邊都對 —— 它們在講不同的路由族。** 實際掛載長這樣：

| 路由族 | chatroom | department | company |
| :--- | :--- | :--- | :--- |
| 一般（表／列／欄位／規則／檢視／IaC…） | `/chatroom/{chatroom_id}/…` | `/department/{department_id}/…` | `/company/…` ← **無 id** |
| **commands** | `/chatroom/{chatroom_id}/commands/…` | `/department/{department_id}/commands/…` | `/company/{company_id}/commands/…` ← **有 id** |
| **attachments（blobs）** | `/chatroom/tables/{table_id}/blobs/…` | `/department/tables/…` | `/company/tables/…` ← **三個都無 id** |
| **public-read-tokens** | `/chatroom/tables/…` | `/department/tables/…` | `/company/tables/…` ← **三個都無 id** |
| **背景遷移狀態** | `/{scopeName}/migrations/{migration_id}/status` ← **無 scope id** | | |
| **跨 scope 發現** | `/shared-with-me`、`/tables/resolve` ← **完全沒有 scope 前綴** | | |

> Source：`src/routers/private/modules/custom_tables/server.py:14-85`
> 註解原文：`# Commands carry an explicit scope id in every mount, including company scope.`

**無 scope id 的路徑不是繞過 scope。** 伺服器會從 table id（或全域唯一的 migration id）找回擁有範圍並重新驗證呼叫者。你仍要選對 `chatroom` / `department` / `company` 前綴。

---

## 5. LINK 只能向上 —— scope 選擇的第一道約束

> Source：`src/crud/custom_table_links.py:623` `validate_link_scope`

```
       company（最廣）
          ▲
          │ 可以 link
     department
          ▲
          │ 可以 link
      chatroom（最窄）
```

| 從 → 到 | 結果 |
| :--- | :--- |
| chatroom → department / company（同公司） | ✅ 合法 |
| chatroom → 完全同 scope | ✅ 合法 |
| department → chatroom | ❌ 拒絕（向下） |
| chatroom A → chatroom B | ❌ 拒絕（平行） |
| 任何 → 跨公司 | ❌ 拒絕 |

規則：**目標表必須與來源表完全同 scope,或在同一間公司內的更廣 scope。** downward / sibling 一律 fail closed。

**設計含意**：主檔放上層、交易資料放下層,link 方向是對的 ✅ —— 但下一節會推翻這個直覺。

---

## 6. Command 綁死單一 scope-local tag —— 第二道約束,而且它更強

> Source：`src/crud/custom_table_commands/tags.py:1`

```python
"""A command belongs to exactly one scope-local tag and may reference only
live tables assigned to that tag."""
```

Tag 是 **scope-local** 的 → **command 無法跨 scope**。

### 具體怎麼撞牆

```
chatroom scope   : 案件 Cases
department scope : 時段 Slots、班表 Shifts、建案、業務

link 方向合法（Cases → Slots，向上）✅

但「認領」= update Slot(佔位) + update Case(填負責人)，必須原子
      ↓
   command 只能綁一個 scope-local tag
      ↓
   Slot 在 department、Case 在 chatroom  →  tag_escaped ❌
```

沒有原子性 → 併發認領時兩個人搶到同一個時段。

### ✅ 所以真正的準則是

> **凡是要被同一支 command 一起寫入的表,必須同 scope、同 tag。**
>
> 這條 **勝過** 「主檔往上、交易往下」的直覺。

實務上這通常意味著:**整個系統的表全部放 department scope**,再用 chatroom grant 分享出去。

---

## 7. 為什麼 department 幾乎總是正確答案

| 你需要的 | department scope 給你什麼 |
| :--- | :--- |
| 跨聊天室共用 | chatroom grant —— 分享不搬資料 |
| command 原子性 | 所有表同 scope,可放同一個 tag |
| **AI 能讀** | 部門 tag = Insight system,**只有 department 這層有這個機制** |
| **逐房間切資料範圍** | `channel` rule（SCP）—— **只有 department 這層有意義** |
| 未來分公司／區域擴充 | 一個分公司一個 department |

反過來看另外兩層的限制：

| Scope | 什麼時候真的該用 | 為什麼通常不該用 |
| :--- | :--- | :--- |
| **chatroom** | 這批資料**永遠**只屬於這一個協作室,不會分享,也不需要 AI 跨室查 | 不能組 Insight system、不能被 SCP 切範圍、不能被別的聊天室看到（只能反向 grant 給部門） |
| **company** | 全公司唯一的基準資料（幣別、稅率、產品分類） | 沒有 SCP 房間隔離、沒有 Insight tag 機制,權限只能靠 ACL grant 逐一給 |

---

## 8. 權限是三層,不要混著看

```
① 進 scope 的門    ChatRoomJoined / DepartmentAccess / CompanyAccess
                   「你能不能碰這個 scope」
        ↓
② ACL / grant      can_read / can_insert / can_edit + 列過濾 + 隱藏欄位
                   「你能不能用這張表、用到什麼程度」
        ↓
③ SCP（channel）   以你被授權的那些房間,可碰哪些列
                   「同一張部門表,A 室看 A 的料,B 室看 B 的料」
```

第三層只有 department scope 有意義（部門表被多個 chatroom 共用時）。

### SCP 的關鍵行為：**呼叫者永遠不指定房間**

伺服器逐表解析 channel floor：

- **表管理者** → 豁免
- **其他人** → 拿到「所屬、存活、且對該表持有 internal grant 的每個聊天室」的 `scope_values` **聯集**

推論（這幾點常被誤判為 bug）：

| 現象 | 原因 |
| :--- | :--- |
| 表清單／詳情頁的 `record_count` 比預期大 | 它就是那個聯集的計數 |
| 多房間成員在詳情頁拿到 `200`（過去是 `400`） | 聯集後不再需要指定房間 |
| 沒有任何合格房間 → 讀取 `200` 零列或 uniform `404` | 讀取不要求你指定房間 |
| 沒有任何合格房間 → 寫入被 `403 {"error":"scp_scope_undeclared"}` 拒絕 | 只有寫入需要宣告範圍 |

---

## 9. ⚠️ `acting_chatroom_id` 已死,但它不會報錯

2026-07-29 起,五個 `*Scoped` dependency 變體全部刪除,`?acting_chatroom_id` 從全部 **57 個** custom-table 操作移除。

**危險不在於它壞了,而在於它靜默：**

```
你仍然送  ?acting_chatroom_id=<id>
    ↓
FastAPI 丟棄未知的 query parameter
    ↓
請求照樣回 200
    ↓
但你指名的房間根本不被採用 —— 你拿到的是「所有合格房間的聯集」
```

**不會有任何訊息告訴你它失效了。** 還在釘選房間的用戶端必須把這個參數移除。

---

## 10. 反模式清單

| ❌ 反模式 | 為什麼錯 | ✅ 改成 |
| :--- | :--- | :--- |
| 「主檔放 department、交易資料放 chatroom」 | 只要有跨兩層的原子寫入就 `tag_escaped` | 要一起原子寫的表全部同 scope 同 tag |
| 「先建 chatroom 表,以後要共用再搬上去」 | **scope 不能改**,只能 export + 重建 + 自己搬資料 | 一開始就評估會不會共用;有疑慮先放 department |
| 「department 表分享給聊天室後,改用 chatroom 路徑讀」 | 分享不搬家,路徑仍是 department | 從表回應判斷擁有 scope |
| 「送 `acting_chatroom_id` 指定代表哪個房間」 | 參數已移除,靜默失效 | 移除它,理解伺服器用的是聯集 |
| 「把 company 表當成 department 表用（反正全公司都看得到）」 | 沒有 SCP 房間隔離、沒有 Insight tag | 需要逐房間切範圍就必須是 department |
| 「從 URL 尾段一樣,推論權限一樣」 | 新增欄位、diagnosis、解析連結三組操作在三個 scope 已知會分歧 | 查該 endpoint 的 scope/auth matrix |

---

## 11. 組路徑前的檢查順序

1. 從表回應的 `chatroom_id` / `department_id` / `company_id` 判斷**擁有 scope**
2. 選用該 scope 的掛載與 endpoint 參考卡片（注意第 4 節那四種 URL 形狀）
3. 受治理的部門表：呼叫者的房間未宣告 scope 時,**預期看到空頁而不是錯誤**;而且永遠不要送 `acting_chatroom_id`
4. 跨 scope 分享後**保留原擁有 scope**,只更新 grant 與本地可用表清單

---

## 12. 建表前的自我檢查

- [ ] 這張表會不會跟另一張表被**同一個動作原子寫入**?那些表全部同 scope 同 tag 了嗎?
- [ ] 未來 12 個月內,這批資料有可能要分享給第二個聊天室嗎?（會 → 不要放 chatroom）
- [ ] 需要讓聊天室 AI 查這批資料嗎?（要 → 必須 department,才能組 Insight system）
- [ ] 需要「同一張表,不同聊天室看不同列」嗎?（要 → 必須 department,才有 SCP）
- [ ] 有沒有 link 是向下或平行的?（會被拒絕）
- [ ] 我確定 **scope 之後改不了** 這件事嗎?

---

## 延伸

- 其他硬約束（rules、`materialize_slots` 地雷）→ [03_關鍵約束.md](03_關鍵約束.md)
- Command 能力邊界 → [01_心智模型.md](01_心智模型.md) 第 5 節
- 用 IaC 宣告整個 scope 的內容 → [02_IaC.md](02_IaC.md)
- 官方 API 契約（scope/auth matrix、錯誤模型）→ <https://docs.customtable.teamsync.com.tw/zh-TW/concepts/scopes>
