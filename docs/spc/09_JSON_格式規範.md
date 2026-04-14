# 09 JSON 格式定義 (JSON Schema)

本文件定義批量匯入與維護接口之資料交換格式、结构標準與系統核心業務驗證規則。

> **提示**：關於 API 的接口路徑、異步處理、自動化處理邏輯與調用範例，請參閱 **[08 API 規格文件](./08_API_規格與用法說明.md)**。

---

# 第一部分：批量匯入接口負載

## 1.1 單一項目 (AllInOnePayload)

用於 `POST /private/ccm/quantitative/all-in-one` 接口。

| 欄位名稱 | 型別 | 必填 | 說明 | 限制/驗證規則 |
| :--- | :--- | :--- | :--- | :--- |
| `characteristic_name` | String | 是 | 管制項目名稱 | 最大 128 字元。 |
| `part_number` | String | 否 | 產品料號 | 最大 128 字元。 |
| `batch_number` | String | 否 | 產品批號 | 最大 128 字元。 |
| `samples` | Array | 是 | 樣本值列表 | **字串數組**。建議保留位數 (如 `"1.250"`)。 |
| `category_information` | Array | 是 | 層別資訊 | 至少包含一個 `naming=True` 的項目。 |

## 1.2 層別資訊單項 (CategoryInfo)

| 欄位名稱 | 型別 | 必填 | 說明 | 限制/驗證規則 |
| :--- | :--- | :--- | :--- | :--- |
| `key` | String | 是 | 層別名稱 | 最大 128 字元 (如：線別、機台)。 |
| `value` | String | 是 | 層別數值 | 最大 128 字元 (如：A線、M01)。 |
| `naming` | Boolean | 是 | 參與命名 | `True`: 用於產生計畫名稱；`False`: 僅作紀錄。 |
| `order` | Integer | 是 | 排序權重 | 決定命名拼接順序，**同項目內必須唯一**。 |

## 1.3 任務執行結果 (TaskStatusResult)

這是 `GET /all-in-one/{task_id}` 的回傳結構。

| 欄位名稱 | 型別 | 說明 |
| :--- | :--- | :--- |
| `task_id` | String | 任務唯一識別碼。 |
| `status` | String | `pending`, `processing`, `completed`, `failed`。 |
| `total` | Integer | 總待處理項目數。 |
| `processed` | Integer | 已處理成功項目數。 |
| `errors` | Array[Str] | 錯誤訊息列表（僅於 `status=failed` 或部分失敗時出現）。 |
| `created_ccm_ids` | Array[Str] | 本次任務新建的 CCM ID。 |
| `created_entity_ids` | Array[Str] | 本次任務新建的 Entity ID。 |

---

# 第二部分：各資源 Payload（按 08 順序）

## 2.1 Control Plans 管制計畫

### 2.1.1 建立 (CreateCCMPayload)

用於 `POST /private/ccm/quantitative/` 接口。

| 欄位名稱 | 型別 | 必填 | 說明 | 限制/驗證規則 |
| :--- | :--- | :--- | :--- | :--- |
| `source` | String | 是 | 資料來源 | `api`, `mqtt`, `manual` |
| `name` | String | 是 | 計畫名稱 | 1-128 字元。 |
| `part_number` | String | 是 | 產品料號 | 1-128 字元。 |
| `batch_number` | String | 是 | 產品批號 | 1-128 字元。 |
| `spec` | String | 否 | 規格說明 | 最大 128 字元。 |
| `station` | String | 否 | 工站名稱 | 最大 128 字元。 |
| `category_information` | Dict | 是 | 層別字典 | 格式：`{ "Key": "Value" }`。 |
| `chatroom_ids` | Array | 否 | 通報群組 ID | 字串數組。 |

### 2.1.2 更新 (UpdateCCMPayload)

用於 `PUT /private/ccm/quantitative/{ccm_id}` 接口。

| 欄位名稱 | 型別 | 必填 | 說明 | 限制/驗證規則 |
| :--- | :--- | :--- | :--- | :--- |
| `name` | String | 否 | 計畫名稱 | 1-128 字元。 |
| `part_number` | String | 否 | 產品料號 | 1-128 字元。 |
| `batch_number` | String | 否 | 產品批號 | 1-128 字元。 |
| `spec` | String | 否 | 規格說明 | 最大 128 字元。 |
| `station` | String | 否 | 工站名稱 | 最大 128 字元。 |
| `category_information` | Dict | 否 | 層別字典 | 格式：`{ "Key": "Value" }`。 |
| `chatroom_ids` | Array | 否 | 通報群組 ID | 字串數組。 |

### 2.1.3 回傳 (CCMInfo)

| 欄位名稱 | 型別 | 說明 |
| :--- | :--- | :--- |
| `id` | String | 計畫唯一識別碼。 |
| `source` | String | 資料來源：`api`, `mqtt`, `manual`。 |
| `name` | String | 計畫名稱。 |
| `part_number` | String | 產品料號。 |
| `batch_number` | String | 產品批號。 |
| `spec` | String | 規格說明。 |
| `station` | String | 工站名稱。 |
| `category_information` | Dict | 層別資訊字典。 |
| `chatroom_ids` | Array | 通報群組 ID。 |
| `entities` | Array | 管制項目列表。 |
| `created_at` | DateTime | 建立時間 (ISO 8601)。 |
| `updated_at` | DateTime | 更新時間 (ISO 8601)。 |

---

## 2.2 Entities 管制項目

### 2.2.1 建立 (CreateEntityPayload)

用於 `POST /private/ccm/quantitative/{ccm_id}/entities` 接口。

| 欄位名稱 | 型別 | 必填 | 說明 | 限制/驗證規則 |
| :--- | :--- | :--- | :--- | :--- |
| `characteristic_name` | String | 是 | 管制項目名稱 | 1-128 字元。 |
| `measurement_unit` | String | 是 | 量測單位 | 1-128 字元。 |
| `manufacturing_information` | Dict | 是 | 製程資訊 | 格式：`{ "Key": "Value" }`。 |

### 2.2.2 建立（含所有設定）(CreateEntityWithSettingsPayload)

用於 `POST /private/ccm/quantitative/{ccm_id}/entities/with-settings` 接口。

| 欄位名稱 | 型別 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| `characteristic_name` | String | 是 | 管制項目名稱 |
| `measurement_unit` | String | 是 | 量測單位 |
| `manufacturing_information` | Dict | 是 | 製程資訊 |
| `chart_settings` | Array | 否 | Chart Setting 列表（含 limits） |
| `sampling_settings` | Array | 否 | Sampling Setting 列表 |
| `alert_settings` | Array | 否 | Alert Setting 列表 |

### 2.2.3 更新 (UpdateEntityPayload)

用於 `PUT /private/ccm/quantitative/{ccm_id}/entities/{entity_id}` 接口。

| 欄位名稱 | 型別 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| `characteristic_name` | String | 否 | 管制項目名稱 |
| `measurement_unit` | String | 否 | 量測單位 |
| `manufacturing_information` | Dict | 否 | 製程資訊 |

### 2.2.4 重新排序 (ReorderEntitiesPayload)

用於 `PUT /private/ccm/quantitative/{ccm_id}/entities/reorder` 接口。

| 欄位名稱 | 型別 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| `entity_ids` | Array | 是 | 所有 Entity ID，依排序順序排列 |

### 2.2.5 回傳 (EntityInfo)

| 欄位名稱 | 型別 | 說明 |
| :--- | :--- | :--- |
| `id` | String | 管制項目唯一識別碼。 |
| `characteristic_name` | String | 管制項目名稱。 |
| `measurement_unit` | String | 量測單位。 |
| `order` | Integer | 顯示順序。 |
| `manufacturing_information` | Dict | 製程資訊。 |
| `chart_settings` | Array | 管制圖設定列表。 |
| `sampling_settings` | Array | 抽樣設定列表。 |
| `alert_settings` | Array | 警示設定列表。 |
| `created_at` | DateTime | 建立時間。 |

---

## 2.3 Chart Settings 管制圖設定

### 2.3.1 建立 (CreateChartSettingPayload)

用於 `POST /.../chart-settings` 接口。

| 欄位名稱 | 型別 | 必填 | 說明 | 限制/驗證規則 |
| :--- | :--- | :--- | :--- | :--- |
| `chart_type` | String | 是 | 管制圖類型 | `x_bar_mr`, `x_bar_r`, `x_bar_s` |
| `subgroup_size` | Integer | 是 | 子組大小（n）| n≥1 |

> **chart_type 說明**:
> - `x_bar_mr`: X̄-MR 圖（n=1，均值-移動全距圖）
> - `x_bar_r`: X̄-R 圖（2≤n≤10，均值-全距圖）
> - `x_bar_s`: X̄-S 圖（n>10，均值-標準差圖）

### 2.3.2 更新 (UpdateChartSettingPayload)

用於 `PUT /.../chart-settings/{setting_id}` 接口。

| 欄位名稱 | 型別 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| `chart_type` | String | 否 | 管制圖類型 |
| `subgroup_size` | Integer | 否 | 子組大小（n） |

### 2.3.3 建立 Chart Limit (CreateChartLimitPayload)

用於 `POST /.../chart-settings/{setting_id}/limits` 接口。

| 欄位名稱 | 型別 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| `entity_name` | String | 是 | 圖類型：`x_bar`, `range`, `std_dev`, `moving_range` |
| `ucl` | Float | 否 | 上規格限 (USL) |
| `lcl` | Float | 否 | 下規格限 (LSL) |
| `cl` | Float | 否 | 中心線 (CL) |
| `ucl_management` | Float | 否 | 上管理限 |
| `lcl_management` | Float | 否 | 下管理限 |
| `cl_management` | Float | 否 | 中心管理值 |
| `ucl_alarm` | Float | 否 | 上警戒限 |
| `lcl_alarm` | Float | 否 | 下警戒限 |
| `cl_alarm` | Float | 否 | 中心警戒值 |

> **entity_name 說明**:
> - `x_bar`: 均值圖界限
> - `range`: 全距圖界限（x_bar_r 使用）
> - `std_dev`: 標準差圖界限（x_bar_s 使用）
> - `moving_range`: 移動全距圖界限（x_bar_mr 使用）

### 2.3.4 更新 Chart Limit (UpdateChartLimitPayload)

用於 `PUT /.../limits/{limit_id}` 接口（同 2.3.3 結構，可 partial update）。

### 2.3.5 回傳 (ChartSettingInfo)

| 欄位名稱 | 型別 | 說明 |
| :--- | :--- | :--- |
| `id` | String | 設定 ID。 |
| `chart_type` | String | 管制圖類型。 |
| `subgroup_size` | Integer | 子組大小。 |
| `limits` | Array | 管制界限列表。 |

---

## 2.4 Sampling Settings 抽樣設定

### 2.4.1 建立 (CreateSamplingSettingPayload)

用於 `POST /.../sampling-settings` 接口。

| 欄位名稱 | 型別 | 必填 | 說明 | 限制/驗證規則 |
| :--- | :--- | :--- | :--- | :--- |
| `num_of_samples` | Integer | 是 | 樣本數（n）| n≥1 |
| `num_of_digits` | Integer | 是 | 小數位數 | n≥0 |
| `frequency` | String | 是 | 抽樣頻率 | 1-128 字元。 |
| `sampling_method` | String | 是 | 抽樣方法 | 1-128 字元。 |

### 2.4.2 更新 (UpdateSamplingSettingPayload)

用於 `PUT /.../sampling-settings/{setting_id}` 接口。

| 欄位名稱 | 型別 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| `num_of_samples` | Integer | 否 | 樣本數（n） |
| `num_of_digits` | Integer | 否 | 小數位數 |
| `frequency` | String | 否 | 抽樣頻率 |
| `sampling_method` | String | 否 | 抽樣方法 |

### 2.4.3 回傳 (SamplingSettingInfo)

| 欄位名稱 | 型別 | 說明 |
| :--- | :--- | :--- |
| `id` | String | 設定 ID。 |
| `num_of_samples` | Integer | 樣本數。 |
| `num_of_digits` | Integer | 小數位數。 |
| `frequency` | String | 抽樣頻率。 |
| `sampling_method` | String | 抽樣方法。 |

---

## 2.5 Alert Settings 警示設定

### 2.5.1 建立 (CreateAlertSettingPayload)

用於 `POST /.../alert-settings` 接口。

| 欄位名稱 | 型別 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| `ca_upper_limit` | Float | 是 | CA 上限 |
| `cp_upper_limit` | Float | 是 | CP 上限 |
| `cpk_lower_limit` | Float | 是 | Cpk 下限 |
| `alert_upper_limit` | Float | 是 | 警示上限 |
| `alert_lower_limit` | Float | 是 | 警示下限 |

### 2.5.2 更新 (UpdateAlertSettingPayload)

用於 `PUT /.../alert-settings/{setting_id}` 接口。

| 欄位名稱 | 型別 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| `ca_upper_limit` | Float | 否 | CA 上限 |
| `cp_upper_limit` | Float | 否 | CP 上限 |
| `cpk_lower_limit` | Float | 否 | Cpk 下限 |
| `alert_upper_limit` | Float | 否 | 警示上限 |
| `alert_lower_limit` | Float | 否 | 警示下限 |

### 2.5.3 回傳 (AlertSettingInfo)

| 欄位名稱 | 型別 | 說明 |
| :--- | :--- | :--- |
| `id` | String | 設定 ID。 |
| `ca_upper_limit` | Float | CA 上限。 |
| `cp_upper_limit` | Float | CP 上限。 |
| `cpk_lower_limit` | Float | Cpk 下限。 |
| `alert_upper_limit` | Float | 警示上限。 |
| `alert_lower_limit` | Float | 警示下限。 |

---

## 2.6 Samples 抽樣資料

### 2.6.1 建立 (CreateSamplePayload)

用於 `POST /.../samples` 接口。

| 欄位名稱 | 型別 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| `samples` | Array | 是 | 樣本值列表（需與 sampling_settings.num_of_samples 一致） |
| `operator_name` | String | 是 | 操作員名稱 |
| `category_information` | Dict | 否 | 層別資訊（覆蓋 CCM 預設值） |

### 2.6.2 批量建立 (BulkCreateSamplePayload)

用於 `POST /.../samples/bulk` 接口。

| 欄位名稱 | 型別 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| `samples` | Array | 是 | 多筆 CreateSamplePayload |

### 2.6.3 更新 (UpdateSamplePayload)

用於 `PUT /.../samples/{sample_id}` 接口。

| 欄位名稱 | 型別 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| `samples` | Array | 否 | 樣本值列表 |
| `operator_name` | String | 否 | 操作員名稱 |

### 2.6.4 回傳 (SampleInfo)

| 欄位名稱 | 型別 | 說明 |
| :--- | :--- | :--- |
| `id` | String | 樣本 ID。 |
| `idx` | Integer | 樣本序號（系統自動遞增）。 |
| `samples` | Array[Float] | 量測值列表。 |
| `mean_value` | Float | 樣本平均值。 |
| `range_value` | Float | 樣本全距 (Max - Min)。 |
| `std_dev` | Float | 樣本標準差（n>10 時）。 |
| `operator_name` | String | 操作員名稱。 |
| `category_information` | Dict | 層別資訊。 |
| `created_at` | DateTime | 建立時間。 |

---

## 2.7 Nelson Rules Settings 尼爾森法則

### 2.7.1 建立 (CreateNelsonRulesPayload)

用於 `POST /.../nelson-rules` 接口。

| 欄位名稱 | 型別 | 必填 | 說明 |
| :--- | :--- | :--- | :--- |
| `nelson_rules_1` | String | 否 | 法則 1（格式：`N(x)`） |
| `nelson_rules_2` | String | 否 | 法則 2（格式：`N(x):S(y)`） |
| `nelson_rules_3` | String | 否 | 法則 3 |
| `nelson_rules_4` | String | 否 | 法則 4 |
| `nelson_rules_5` | String | 否 | 法則 5（格式：`M(x)/N(x):S(y)`） |
| `nelson_rules_6` | String | 否 | 法則 6 |
| `nelson_rules_7` | String | 否 | 法則 7（格式：`N(x)`） |
| `nelson_rules_8` | String | 否 | 法則 8 |

> **格式說明**:
> - `N`: 連續點數
> - `M`: 點數閾值
> - `S` 方向: `both`, `upper`, `lower`
> - 範例：`"N(1)"`, `"N(9):S(both)"`, `"M(2)/N(3):S(lower)"`

### 2.7.2 更新 (UpdateNelsonRulesPayload)

用於 `PUT /.../nelson-rules/{setting_id}` 接口（同 2.7.1 結構，可 partial update）。

### 2.7.3 回傳 (NelsonRulesInfo)

| 欄位名稱 | 型別 | 說明 |
| :--- | :--- | :--- |
| `id` | String | 設定 ID。 |
| `nelson_rules_1` | String | 法則 1 設定。 |
| `nelson_rules_2` | String | 法則 2 設定。 |
| ... | ... | ... |
| `nelson_rules_8` | String | 法則 8 設定。 |

---

## 2.8 Sample Alerts 樣本警報紀錄

### 2.8.1 回傳 (SampleAlertInfo)

| 欄位名稱 | 型別 | 說明 |
| :--- | :--- | :--- |
| `id` | String | 警報 ID。 |
| `sample_id` | String | 關聯樣本 ID。 |
| `alert_type` | String | 警報類型：`nelson_rule`, `alarm_limit`。 |
| `rule_id` | Integer | 觸發的法則編號（1-8）。 |
| `message` | String | 警報訊息。 |
| `created_at` | DateTime | 觸發時間。 |

---

# 附錄：常見類型枚舉值

## Chart Type (管制圖類型)

| 值 | 說明 |
| :--- | :--- |
| `x_bar_mr` | X̄-MR 圖（n=1） |
| `x_bar_r` | X̄-R 圖（2≤n≤10） |
| `x_bar_s` | X̄-S 圖（n>10） |

## Chart Limit Entity Name

| 值 | 說明 |
| :--- | :--- |
| `x_bar` | 均值圖 |
| `range` | 全距圖 |
| `std_dev` | 標準差圖 |
| `moving_range` | 移動全距圖 |

## Source (資料來源)

| 值 | 說明 |
| :--- | :--- |
| `api` | API 匯入 |
| `mqtt` | MQTT 訊息 |
| `manual` | 手動輸入 |

## Alert Type

| 值 | 說明 |
| :--- | :--- |
| `nelson_rule` | 尼爾森法則觸發 |
| `alarm_limit` | 界限超標觸發 |

---

# 修訂歷史

| 日期 | 版本 | 說明 |
| :--- | :--- | :--- |
| 2026-04-14 | 1.0 | 初始版本，按 08 順序擴充 |