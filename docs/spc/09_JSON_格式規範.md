# 09 JSON 格式定義 (JSON Schema)

本文件定義批量匯入與維護接口之資料交換格式、結構標準與系統核心業務驗證規則。

> **提示**：關於 API 的接口路徑、異步處理、自動化處理邏輯與調用範例，請參閱 **[08 API 規格文件](./08_API_規格與用法說明.md)**。

---

## 1. 批量匯入接口負載 (Bulk Import Payload)

### 1.1 單一項目 (AllInOnePayload)

| 欄位名稱 | 型別 | 必填 | 說明 | 限制/驗證規則 |
| :--- | :--- | :--- | :--- | :--- |
| `characteristic_name` | String | 是 | 管制項目名稱 | 最大 128 字元。 |
| `part_number` | String | 否 | 產品料號 | 最大 128 字元。 |
| `batch_number` | String | 否 | 產品批號 | 最大 128 字元。 |
| `samples` | Array | 是 | 樣本值列表 | **字串數組**。建議保留位數 (如 `"1.250"`)。 |
| `category_information` | Array | 是 | 層別資訊 | 至少包含一個 `naming=True` 的項目。 |

### 1.2 層別資訊單項 (CategoryInfo)

| 欄位名稱 | 型別 | 必填 | 說明 | 限制/驗證規則 |
| :--- | :--- | :--- | :--- | :--- |
| `key` | String | 是 | 層別名稱 | 最大 128 字元 (如：線別、機台)。 |
| `value` | String | 是 | 層別數值 | 最大 128 字元 (如：A線、M01)。 |
| `naming` | Boolean | 是 | 參與命名 | `True`: 用於產生計畫名稱；`False`: 僅作紀錄。 |
| `order` | Integer | 是 | 排序權重 | 決定命名拼接順序，**同項目內必須唯一**。 |

### 1.3 任務執行結果 (TaskStatusResult)

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

## 2. 維護接口 Payload 規範 (Maintenance Payloads)

用於數據維護接口之修正作業。

### 2.1 管制計畫更新 (UpdateCCMPayload)

此規格用於 `PUT /private/ccm/quantitative/{ccm_id}` 接口。

| 欄位名稱 | 型別 | 必填 | 說明 | 限制/驗證規則 |
| :--- | :--- | :--- | :--- | :--- |
| `name` | String | 否 | 計畫名稱 | 1 - 128 字元。 |
| `part_number` | String | 否 | 產品料號 | 1 - 128 字元。 |
| `batch_number` | String | 否 | 產品批號 | 1 - 128 字元。 |
| `spec` | String | 否 | 規格說明 | 最大 128 字元。 |
| `station` | String | 否 | 工站名稱 | 最大 128 字元。 |
| `category_information` | Dict | 否 | 層別字典 | 格式：`{ "Key": "Value" }`。 |
| `chatroom_ids` | Array | 否 | 通報群組 ID | 字串數組。 |

### 2.2 樣本資料更新 (UpdateSamplePayload)

此規格用於 `PUT /.../samples/{sample_id}` 接口。

| 欄位名稱 | 型別 | 必填 | 說明 | 限制/驗證規則 |
| :--- | :--- | :--- | :--- | :--- |
| `samples` | Array | 否 | 樣本值數組 | **數值數組** (如 `[9.851, 9.842]`)。 |
| `operator_name` | String | 否 | 操作員名稱 | 1 - 64 字元。 |

### 2.3 核心物件回傳規格 (Core Response Models)

以下為維護接口 (`PUT`) 與查詢接口 (`GET`) 的標準回傳物件結構。

#### 2.3.1 管制計畫資訊 (CCMInfo)

| 欄位名稱 | 型別 | 說明 |
| :--- | :--- | :--- |
| `id` | String | 計畫唯一識別碼。 |
| `source` | String | 資料來源：`api`, `mqtt`, `manual`。 |
| `name` | String | 計畫名稱。 |
| `part_number` | String | 產品料號。 |
| `batch_number` | String | 產品批號。 |
| `category_information` | Dict | 層別資訊字典。 |
| `entities` | Array | 管制項目列表 (QuantitativeCCMEntityInfo)。 |
| `created_at` | DateTime | 建立時間 (ISO 8601)。 |

#### 2.3.2 樣本資料資訊 (SampleInfo)

| 欄位名稱 | 型別 | 說明 |
| :--- | :--- | :--- |
| `id` | String | 樣本唯一識別碼。 |
| `idx` | Integer | 樣本序號（由系統自動遞增）。 |
| `samples` | Array[Float] | 量測數值數組。 |
| `mean_value` | Float | 樣本平均值。 |
| `range_value` | Float | 樣本全距 (Max - Min)。 |
| `operator_name` | String | 操作員名稱。 |
| `created_at` | DateTime | 建立時間 (ISO 8601)。 |
