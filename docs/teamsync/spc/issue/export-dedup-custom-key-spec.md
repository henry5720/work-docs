# SPC 匯出／統計去重：自訂去重維度（Custom Dedup Key）需求規格

> 對象：後端團隊（spc-backend）
> 來源：前端 + PM 討論
> 目的：讓「畫面顯示、統計計算、Excel 匯出」三者的去重規則一致，且可由使用者自訂、可依站別儲存。

---

## 1. 背景與現狀

### 1.1 目前三個地方各自為政

| 環節 | 實作位置 | 去重規則 | 問題 |
|---|---|---|---|
| 畫面表格收合 | 前端 `dedupGroups.js`（純前端） | 使用者可自選維度（下拉），預設 料號+批號 | 只影響「藏列」，不重算 Cpk |
| 統計去重（Cpk／管制界限） | 後端 `deduplicate_samples_for_calculation` | **固定** 料號+批號+**整包層別** | 規則寫死，且見 1.2 |
| Excel 匯出 v2 | 後端 `ccm_excel_builder_v2` | 同上，**固定**且無條件去重 | 規則寫死，無法對應畫面 |

- 統計去重由 `samples/capability` 的 `merge_duplicates` query param 控制（預設 false）。
- v2 匯出**無條件**去重，且**不接受** `merge_duplicates`；只接受 `category_filters`（篩選 WHERE，非去重維度）。

### 1.2 現狀的根本缺陷（重點）

後端去重 key = `(part_number, batch_number, canonical_category_key(整包 category_information))`。
它把 **category_information 裡所有層別欄位**都納入 key。

**問題**：只要層別裡含有高基數欄位（例如「檢驗時間」、時間戳、序號），三元組幾乎永遠唯一
→ 去重一筆都收不掉 → 統計去重形同虛設、匯出結果等於原始 raw data。

這使得「固定用整包層別」不只是不夠彈性，而是在特定資料下**直接失效**。

### 1.3 當初的設計脈絡（去重是刻意分兩條管道的）

去重功能分兩個 commit 加入，兩條管道行為**故意不同**，並非疏漏：

- **A004（commit `739c7e8`, 2026-05-18）— `samples/capability`：只去重統計、故意回原始列**
  > - Apply deduplication **exclusively to the math engine pipeline** (`all_filtered_samples`) to ensure accurate CPK/PPK.
  > - **Preserve raw data in transport pipeline** (`paginated_samples`) **to support frontend UI expansion/folding logic.**
- **A005（commit `034f96e`, 2026-05-19）— `export/v2`：連逐筆明細一起去重**
  > - Apply dedup to filter **raw data rows** in export endpoints.
  > - Recalculate CPK/PPK and **MR** on the deduplicated sequence to ensure accurate Excel reporting.

**用途區分**：`samples/capability` 是「互動畫面」（需支援展開／收合，故逐筆明細**刻意回原始全量**，讓前端自行收合）；
`export/v2` 是「靜態報表」（無展開需求，故直接去重乾淨）。

**重要結論**：`samples/capability` 回傳原始列**是正確設計，本次不應更動**。
本需求要統一的是「**去重 key（規則）**」，讓統計與匯出用同一把 key，
而**非**改變 transport 回原始列的行為（否則會破壞前端展開／收合能力）。

---

## 2. 需求（PM 確認）

1. **自訂去重維度**：使用者能像畫面表格那樣，自由挑選「哪些維度」組成去重 key
   （料號 / 批號 / 任意層別子集），而非固定使用整包層別。
2. **三者一致**：所選維度要同時作用在
   （a）畫面 render、（b）統計 Cpk／管制界限、（c）Excel v2 匯出。
3. **可儲存、依站別套用**：不同站別會用不同設定
   （例：印疊站以「薄帶子批號」為關鍵維度），設定需可保存並在下次沿用。

---

## 3. 為什麼一定要改後端（不能只靠前端）

- 前端只能改「畫面 render」（藏列），**無法重算 Cpk／管制界限**——統計是後端算的。
- 正式 Excel（含圖表、capability 區塊、格式化排版）由後端 v2 產生，前端無法自行產出同格式。
- 因此「自訂 key 的去重」要反映到**統計與匯出**，後端必須以同一把 key 重新計算。

---

## 4. 建議的後端變更

### 4.1 去重 key 從「整包層別」改為「可指定的維度子集」

- 新增參數（建議命名）`dedup_keys`：一個維度識別碼清單，元素形如：
  - `part_number`
  - `batch_number`
  - `category:<groupId>`（指定某個層別群組，對應 `category_information` 的 key）
- 去重時只用「被選中的維度」組 key，**其餘層別欄位不納入 key**。
- `canonical_category_key` 需改為「只正規化被選中的層別子集」，而非整包 dict。
  （前端 `dedupGroups.js` 的 `canonicalCategoryKey` 已與後端演算法對齊，改為子集後兩邊需同步。）

### 4.2 套用範圍

同一把 `dedup_keys` 需能傳給：

| Endpoint | 現狀 | 需變更 |
|---|---|---|
| `GET .../samples/capability` | 有 `merge_duplicates`（固定 key） | 增加 `dedup_keys`，**統計**改用此 key；**逐筆明細仍回原始全量**（維持 A004 設計，供前端展開／收合） |
| `GET .../export/v2`（全計畫） | 無條件固定 key | 增加 `dedup_keys`，統計＋逐筆明細皆用此 key |
| `GET .../entities/{entity_id}/export/v2`（單項目） | 同上 | 同上 |

> ⚠️ 注意 `samples/capability` 與 `export/v2` 的差異：前者逐筆明細**保留原始列**、只有統計用 `dedup_keys`；後者逐筆明細與統計**都**用 `dedup_keys`。此差異沿用 1.3 的既有設計，**本次不改變**。

### 4.3 語意與邊界（需後端與 PM 共同拍板）

- **空 `dedup_keys`** = 不去重（輸出全量 raw）？還是沿用預設？需定義。
- **向後相容**：未帶 `dedup_keys` 的舊呼叫，維持現狀（整包層別）還是改用新預設？建議明確版本切換。
- **高基數警告**：若使用者把「檢驗時間」這類欄位選入 key，去重會近乎無效。
  建議前端在 UI 提示，但後端也應能正確處理（不報錯，只是收不掉）。
- **v2 目前的 400 限制**（缺管制界限、印疊站缺「薄帶子批號」）在新流程下維持不變，需一併回傳可辨識的錯誤碼供前端提示。

---

## 5. 設定儲存（需資料模型決策）

需求 3 要求「依站別儲存」，需後端與 PM 決定：

- **儲存層級**：per-計畫（ccm）／per-項目（entity）／per-站別範本？
  （「站別」是跨計畫的概念，印疊站都用薄帶子批號 → 傾向站別範本或計畫層級預設。）
- **是否沿用既有 preset 機制**：系統已有匯入 preset／Excel 表頭固定欄位 preset，
  可考慮擴充加上 `dedup_keys` 欄位，或新開獨立設定。
- **套用時機**：儲存後，畫面 render、統計、匯出三處是否都自動帶入此設定？

---

## 6. 待後端確認的問題（Checklist）

- [ ] `dedup_keys` 參數格式（陣列 / JSON 字串？維度識別碼命名）是否可接受？
- [ ] 三個 endpoint 是否都能接同一把 key？工時評估？
- [ ] `canonical_category_key` 改為子集版本的影響範圍（是否有其他呼叫端依賴整包版本）？
- [ ] 空 key／未帶參數／向後相容的行為定義？
- [ ] 設定儲存的層級與資料表設計？沿用 preset 或新建？
- [ ] v2 現有 400 限制與新流程的互動？

---

## 7. 一句話總結

現狀「固定料號+批號+整包層別」在層別含高基數欄位（如檢驗時間）時**去重會失效**；
PM 需求是讓使用者**自選去重維度**並**可依站別儲存**，且畫面、統計、匯出三者一致。
由於去重會改變 Cpk／管制界限（後端計算）與正式 Excel（後端產生），
**此需求必須由後端提供可傳入的去重維度參數才能達成，前端無法獨立完成。**
