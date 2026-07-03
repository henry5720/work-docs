# 09 JSON 格式定義 (JSON Schema)

本文件定義 Quantitative 定量管制接口之資料交換格式、結構標準與驗證規則，與後端現行實作同步。

> **提示**：接口路徑、調用流程與存取控制請參閱 **[08 API 規格文件](./08_API_規格與用法說明.md)**。型別以 OpenAPI 為準；標示 `null` 者為可選（可省略或傳 null）。

---

# 第一部分：批量匯入接口負載

## 1.1 單一項目 (AllInOnePayload)

用於 `POST /all-in-one` 的 `items[]`。

| 欄位 | 型別 | 必填 | 說明 / 限制 |
| :--- | :--- | :--- | :--- |
| `characteristic_name` | String | 是 | 管制項目名稱，上限 128 字元（DB，見下） |
| `station` | String | 是 | 站別（必填，1–128 字元；API 層驗證） |
| `category_information` | Array&lt;CategoryInfo&gt; | 是 | 層別資訊；未使用 preset 時至少一項 `naming=true` |
| `samples` | Array&lt;String&gt; | 是 | 樣本值（**字串**陣列，以字串傳遞避免浮點誤差；精度取小數點後有效位數最大值，見 08 §3.10） |
| `part_number` | String \| null | 否 | 產品料號，上限 128 字元（DB，見下） |
| `batch_number` | String \| null | 否 | 產品批號，上限 128 字元（DB，見下） |
| `ucl` | Number \| null | 否 | 規格上限（可於匯入時直接帶入） |
| `cl` | Number \| null | 否 | 規格中心值 |
| `lcl` | Number \| null | 否 | 規格下限 |

## 1.2 層別資訊單項 (CategoryInfo)

| 欄位 | 型別 | 必填 | 說明 / 限制 |
| :--- | :--- | :--- | :--- |
| `key` | String | 是 | 層別名稱（如：線別、機台） |
| `value` | String | 是 | 層別數值（如：A線、M01） |
| `order` | Integer | 是 | 命名拼接順序，**同項目內必須唯一** |
| `naming` | Boolean | 否 | `true`：參與計畫命名；`false`/省略：僅作紀錄 |

> **字串長度政策**：`characteristic_name`／`part_number`／`batch_number`／`station`（及逐步建立的 `name`／`spec`／`measurement_unit`）在資料庫層皆為 **VARCHAR(128)**，有效上限 **128** 字元；`operator_name` 為 **64**。
> **強制層級不同**：`station` 於 API 層驗證（超過回 `422`）；其餘欄位在 **All-in-One 路徑不做前置驗證**，超過 128 會在**寫入資料庫時失敗**（回 `500` 或依 DB 設定截斷），而非乾淨的 `422`。逐步建立（§2）API 多數欄位於 API 層即驗證 128。
> 層別 `category_information` 的 `key`／`value` 存於 **JSON 欄位，無長度上限**。

## 1.3 批量匯入根物件 (BulkAllInOnePayload)

| 欄位 | 型別 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| `items` | Array&lt;AllInOnePayload&gt; | 是 | 批量匯入項目，1–10,000 筆 |
| `preset_id` | String \| null | 否 | 匯入預設 ID；提供時套用該預設命名鍵，否則走 `naming=true` 邏輯 |

## 1.4 任務執行結果 (TaskStatusResult)

`GET /all-in-one/{task_id}` 的回傳。

| 欄位 | 型別 | 說明 |
| :--- | :--- | :--- |
| `task_id` | String | 任務唯一識別碼 |
| `status` | String | `pending` / `processing` / `completed` / `failed` |
| `total` | Integer | 總待處理項目數 |
| `processed` | Integer | 已處理數 |
| `errors` | Array&lt;String&gt; | 錯誤訊息列表 |
| `created_ccm_ids` | Array&lt;String&gt; | 建立的計畫 ID |
| `created_entity_ids` | Array&lt;String&gt; | 建立的管制項目 ID |

## 1.5 比對預覽 (CompareAllInOnePayload / CompareResponse)

`POST /all-in-one/compare`（無狀態預覽，不寫入）。

**Request（CompareAllInOnePayload）**：

| 欄位 | 型別 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| `import_items` | Array&lt;AllInOnePayload&gt; | 是 | 原始 SPC 匯入資料 |
| `teamsync_table_rows` | Array&lt;Object&gt; | 是 | 前端已扁平化的 TeamSync 規格表列 |
| `composite_keys` | Array&lt;KeyMapping&gt; | 是 | 複合比對鍵映射（`spc_column_key` ↔ `etl_column_key`） |
| `limit_mappings` | LimitMapping | 是 | 上/中/下限欄位映射（`ucl_/cl_/lcl_etl_column_key`） |
| `naming_keys` | Array&lt;String&gt; | 是 | 組裝計畫名稱的層別鍵 |

**Response（CompareResponse.comparisons[] = PlanCompareResult）**：`plan_name`、`station`、`characteristic_name`、`ucl`/`cl`/`lcl`（映射後）、`samples_count`、`source_rows[]`（`spc_row_index`、`category_values`、映射 `ucl`/`cl`/`lcl`）。

---

# 第二部分：各資源 Payload（按 08 順序）

## 2.1 Control Plans 管制計畫

**建立 (CreateQuantitativeCCMPayload)**

| 欄位 | 型別 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| `source` | String(enum) | 是 | `api` / `mqtt` / `manual` |
| `name` | String | 是 | 計畫名稱 |
| `part_number` | String | 是 | 產品料號 |
| `batch_number` | String | 是 | 產品批號 |
| `category_information` | Object | 是 | 層別資訊（**物件**鍵值對，如 `{"線別":"A線"}`） |
| `spec` | String \| null | 否 | 規格 |
| `station` | String \| null | 否 | 站別 |
| `chatroom_ids` | Array&lt;String&gt; \| null | 否 | 通知聊天室 ID |

**更新 (UpdateQuantitativeCCMPayload)**：上述欄位皆為選填（部分更新）。

**回傳 (QuantitativeCCMInfo)**：`id`、上述欄位、`created_at`、`updated_at`、`entities[]`。清單版 `QuantitativeCCMBasicInfo` 不含 `entities`。

## 2.2 Entities 管制項目

**建立（基本，CreateQuantitativeCCMEntityPayload）**

| 欄位 | 型別 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| `characteristic_name` | String | 是 | 管制項目名稱 |
| `measurement_unit` | String | 是 | 量測單位 |
| `manufacturing_information` | Object | 是 | 製造資訊（可為 `{}`） |

**建立（含設定，CreateQuantitativeCCMEntityWithSettingsPayload）**：上述 + `chart_settings[]`（ChartSettingWithLimitsPayload）+ `sampling_settings[]` + `alert_settings[]`。

**更新 (UpdateQuantitativeCCMEntityPayload)**：`characteristic_name`、`measurement_unit`、`manufacturing_information` 皆選填。

**排序**：`ReorderEntitiesPayload` = `{ entity_ids: [...] }`（全量）；`SwapEntityOrderPayload` = `{ entity_id_1, entity_id_2 }`（交換）。

**回傳 (QuantitativeCCMEntityInfo)**：`id`、`order`、`characteristic_name`、`measurement_unit`、`manufacturing_information`，彙總統計 `total_samples_count`、`samples_mean_avg`、`samples_overall_mean`、`samples_overall_std_dev`、`samples_range_avg`、`samples_std_dev_avg`、`samples_mr_avg`，及 `chart_settings[]`/`sampling_settings[]`/`alert_settings[]`。

## 2.3 Chart Settings 管制圖設定

**建立 (CreateQuantitativeCCMChartSettingPayload)**

| 欄位 | 型別 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| `chart_type` | String(enum) | 是 | `x_bar_mr` / `x_bar_r` / `x_bar_s` |
| `subgroup_size` | Integer | 是 | 子組大小 n（1 / 2–10 / >10） |

**更新 (UpdateQuantitativeCCMChartSettingPayload)**：`chart_type`、`subgroup_size` 選填。

**建立管制界限 (CreateQuantitativeCCMChartLimitPayload)**

| 欄位 | 型別 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| `entity_name` | String(enum) | 是 | `x_bar` / `range` / `moving_range` / `std_dev` |
| `ucl` | Number \| null | 否 | 上規格限（上單邊/雙邊需要） |
| `lcl` | Number \| null | 否 | 下規格限（下單邊/雙邊需要） |
| `cl` | Number \| null | 否 | 中心線/目標值（Ca 計算需要） |
| `ucl_management` / `lcl_management` / `cl_management` | Number \| null | 否 | 管理限 |
| `ucl_alarm` / `lcl_alarm` / `cl_alarm` | Number \| null | 否 | 警戒限 |

> **公差類型**：雙邊（ucl+lcl）、上單邊（僅 ucl）、下單邊（僅 lcl）。
> **更新 (UpdateQuantitativeCCMChartLimitPayload)**：所有欄位選填；設為 `null` 可清除該界限（轉為單邊）。

**回傳 (QuantitativeCCMChartLimitInfo)**：上述界限欄位 + `sigma_within` + 能力指標 `cp`/`ca`/`cpu`/`cpl`/`cpk`/`pp`/`ppu`/`ppl`/`ppk`（不適用時 `null`）。

## 2.4 Sampling Settings 抽樣設定

**建立 (CreateQuantitativeCCMSamplingSettingPayload)**

| 欄位 | 型別 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| `num_of_samples` | Integer | 是 | 子組大小 n |
| `num_of_digits` | Integer | 是 | 小數位精度 |
| `frequency` | String | 是 | 抽樣頻率 |
| `sampling_method` | String | 是 | 抽樣方法 |

**更新**：以上皆選填。**回傳 (SamplingSettingInfo)**：+ `id`。

## 2.5 Alert Settings 警示設定

**建立 (CreateQuantitativeCCMAlertSettingPayload)**：`ca_upper_limit`、`cp_upper_limit`、`cpk_lower_limit`、`alert_upper_limit`、`alert_lower_limit`（皆為 Number，建立時必填）。
**更新**：以上皆選填。**回傳**：+ `id`。

## 2.6 Samples 抽樣資料

**建立單一 (CreateQuantitativeCCMEntitySamplePayload)**

| 欄位 | 型別 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| `samples` | Array&lt;Number&gt; | 是 | 樣本值（**數值**陣列；注意與 all-in-one 的字串陣列不同） |
| `operator_name` | String | 是 | 操作員（最大 64 字元） |
| `category_information` | Object \| null | 否 | 覆寫層別（提供至少一組鍵值時覆寫父 CCM） |

**批量 (BulkCreateQuantitativeCCMEntitySamplePayload)**：`{ samples: [CreateSamplePayload, ...] }`。
**更新 (UpdateQuantitativeCCMEntitySamplePayload)**：`samples`、`operator_name` 選填。

**回傳 (QuantitativeCCMEntitySampleInfo)**

| 欄位 | 型別 | 說明 |
| :--- | :--- | :--- |
| `id` / `idx` | String / Integer | 樣本 ID / 索引 |
| `samples` | Array&lt;Number&gt; | 樣本值 |
| `mean_value` | Number | 平均值 |
| `range_value` | Number | 全距（max−min，X̄-R 用） |
| `std_dev` | Number | 標準差（X̄-S，n=1 時為 0） |
| `mr_value` | Number | 移動全距（X̄-MR，n>1 或首筆為 0） |
| `total_value` | Number | 總和 |
| `operator_name` | String | 操作員 |
| `part_number` / `batch_number` / `category_information` | — | 由 CCM 複製 |
| `created_at` | String | 建立時間 |

**層別唯一值 (CategoryUniqueValuesResponse)**：`{ "values": { "<key>": ["v1","v2"] } }`。

## 2.7 Capability 能力分析

**CapabilityIndicesInfo**：`total_samples_count`、`samples_mean_avg`、`samples_overall_mean`、`samples_overall_std_dev`、`samples_range_avg`、`samples_std_dev_avg`、`samples_mr_avg`、`chart_limits[]`。

**FilteredChartLimitCapabilityInfo**（`chart_limits[]` 元素）：`chart_setting_id`、`chart_type`、`subgroup_size`、`limit_id`、`entity_name`、`ucl`/`lcl`/`cl`、`sigma_within`，及 `cp`/`ca`/`cpu`/`cpl`/`cpk`/`pp`/`ppu`/`ppl`/`ppk`（不適用 `null`）。

**CapabilityAnalysisResponse**：`{ capability: CapabilityIndicesInfo, samples: [...] }`。

**RecommendedLimitsResponse**：`target_index`(cp/cpk/pp/ppk)、`target_value`、`total_samples_count`、`samples_overall_mean`、`samples_overall_std_dev`、`recommendations[]`（每 chart setting 的 `recommended_ucl`/`recommended_lcl`/`recommended_cl`、`sigma_within`）。

## 2.8 Nelson Rules Settings 尼爾森法則

**建立 (CreateQuantNelsonRulesSettingPayload)** — 各法則為**結構化物件**（不支援舊版 `N(x):S(y)` 字串格式），未提供或 `null` = 停用。

| 欄位 | 型別 | 參數（預設） |
| :--- | :--- | :--- |
| `nelson_rules_1` | Object \| null | `{ n }`（n=1） |
| `nelson_rules_2` | Object \| null | `{ n, side }`（n=9, side=both） |
| `nelson_rules_3` | Object \| null | `{ n, side }`（n=6, side=both） |
| `nelson_rules_4` | Object \| null | `{ n }`（n=14） |
| `nelson_rules_5` | Object \| null | `{ m, n }`（m=2, n=3） |
| `nelson_rules_6` | Object \| null | `{ m, n }`（m=4, n=5） |
| `nelson_rules_7` | Object \| null | `{ n }`（n=15） |
| `nelson_rules_8` | Object \| null | `{ n }`（n=8） |

> `side`（`NelsonRuleSide`）：`both` / `upper` / `lower`。
> **更新 (UpdateQuantNelsonRulesSettingPayload)**：部分更新；設 `null` 停用該法則。
> **回傳 (QuantNelsonRulesSettingInfo)**：`id`、`quant_ccm_id`、`created_at`、`updated_at` + 各法則 Info 物件（含實際參數）。

## 2.9 Sample Alerts 樣本警報紀錄

**回傳 (QuantitativeCCMSampleAlertInfo)**

| 欄位 | 型別 | 說明 |
| :--- | :--- | :--- |
| `id` / `created_at` | String | 警報 ID / 時間 |
| `quant_ccm_entity_id` | String | 管制項目 ID |
| `quant_ccm_entity_sample_id` | String | 觸發樣本 ID |
| `alert_type` | String(enum) | `nelson_rule` / `alarm_limit` |
| `rule_number` | Integer \| null | Nelson 法則編號（1–8，nelson_rule 用） |
| `entity_name` | String \| null | 界限類型（alarm_limit 用） |
| `direction` | String \| null | 超標方向 upper/lower（alarm_limit 用） |
| `actual_value` / `limit_value` | Number \| null | 觸發值 / 被超越的界限值 |
| `description` | String | 可讀警報描述 |
| `sample` | Object | 觸發的樣本（SampleInfo） |

---

# 第三部分：Import Presets 與 Permissions

## 3.1 匯入預設 (ImportPresetCreate / ImportPresetResponse)

| 欄位 | 型別 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| `name` | String | 是 | 預設名稱 |
| `naming_keys` | Array&lt;String&gt; | 是 | 命名鍵（支援 `_part_number_`、`_batch_number_`） |
| `station_id` | String \| null | 否 | 綁定站別 ID |
| `chatroom_id` | String \| null | 否 | 匯入 UI 預設聊天室 ID |
| `table_id` | String \| null | 否 | 匯入 UI 預設 TeamSync 表格 ID |
| `timestamp_key` | String \| null | 否 | 時間格式的層別欄位名 |
| `default_ucl` / `default_cl` / `default_lcl` | Number \| null | 否 | 預設規格界限 |
| `composite_keys` / `limit_mappings` | Array / Object | 否 | 保留欄位（僅儲存與回傳） |

回傳額外含：`id`、`tenant_id`、`created_at`、`updated_at`。

## 3.2 權限 (SPCPermission*)

**設定 (SPCPermissionUpsert)**：`{ "role": "<SPCPermissionRole>" }`。

**自己的權限 (SPCMyPermissionResponse)**：`user_id`、`tenant_id`、`role`、`is_default`、`can_manage_permissions`、`can_read_all_departments`。

**列表項 (SPCPermissionResponse)**：`id`、`tenant_id`、`user_id`、`role`、`created_at`、`updated_at`。

---

# 附錄：常見類型枚舉值

## Control Chart Type (`chart_type`)
| 值 | 說明 |
| :--- | :--- |
| `x_bar_mr` | X̄-MR（n=1） |
| `x_bar_r` | X̄-R（2≤n≤10） |
| `x_bar_s` | X̄-S（n>10） |

## Chart Limit Entity Name (`entity_name`)
| 值 | 說明 |
| :--- | :--- |
| `x_bar` | 平均值/個別值圖 |
| `range` | 全距圖（x_bar_r） |
| `moving_range` | 移動全距圖（x_bar_mr） |
| `std_dev` | 標準差圖（x_bar_s） |

## Source (`source`)
| 值 | 說明 |
| :--- | :--- |
| `api` | API 匯入 |
| `mqtt` | MQTT 串流 |
| `manual` | 手動建立 |

## Alert Type (`alert_type`)
| 值 | 說明 |
| :--- | :--- |
| `nelson_rule` | 尼爾森法則觸發 |
| `alarm_limit` | 界限超標觸發 |

## Nelson Rule Side (`side`)
`both` / `upper` / `lower`

## SPC Permission Role (`role`)
| 值 | 寫入 | 說明 |
| :--- | :--- | :--- |
| `system_admin` | ✓ | 系統管理者 |
| `quality_staff` | ✓ | 品保人員 |
| `line_operator` | ✓ | 線上操作員 |
| `viewer` | ✗ | 唯讀檢視者（預設） |

> **修訂歷史**已統一彙整至 [12 文件版次異動 (Changelog)](./12_版次異動差異化說明.md)。
