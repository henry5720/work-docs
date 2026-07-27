# SPC 批量匯入 JSON Schema 規範

## 概述
本文件定義了 SPC All-in-One 批量匯入接口 (`POST /private/ccm/quantitative/all-in-one`) 所使用的 JSON 數據結構、各欄位的型態、長度限制與邏輯約束。

---

## 1. 數據字典 (Data Dictionary) - API Payload 欄位

### 1.1 BulkAllInOnePayload (根物件)
| 欄位名稱 | JSON 型別 | 必填 | 長度/限制 | 說明 |
| :--- | :--- | :--- | :--- | :--- |
| `items` | Array | ✓ | 1 ~ 10,000 | 包含多筆待處理的匯入項目。 |

### 1.2 AllInOnePayload (items 內的項目)
| 欄位名稱 | JSON 型別 | 必填 | 長度/限制 | 說明 |
| :--- | :--- | :--- | :--- | :--- |
| `characteristic_name` | String | ✓ | 1 ~ 128 | 管制項目名稱（如：厚度、電阻）。 |
| `part_number` | String | ✓ | 1 ~ 128 | 產品料號。 |
| `batch_number` | String | ✓ | 1 ~ 128 | 產品批號。 |
| `category_information`| Array | ✓ | 1 ~ 20 | 層別資訊（用於計畫命名與篩選）。 |
| `samples` | Array | ✓ | 1 ~ 100 | 樣本觀測值列表。 |

### 1.3 CategoryInfo (層別資訊)
| 欄位名稱 | JSON 型別 | 必填 | 長度/限制 | 說明 |
| :--- | :--- | :--- | :--- | :--- |
| `key` | String | ✓ | 1 ~ 128 | 層別維度名稱（如：線別、機台）。 |
| `value` | String | ✓ | 1 ~ 128 | 層別具體數值（如：Line_A、M01）。 |
| `naming` | Boolean | ✓ | - | 是否將此欄位用於「計畫名稱」的組合。 |
| `order` | Integer | ✓ | 0 ~ 9999 | 組合名稱時的順序（由小到大排列）。 |

---

## 2. 標準 JSON Schema (Draft 7)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SPC All-in-One Import Payload",
  "description": "Schema for batch importing SPC measurement data",
  "type": "object",
  "required": ["items"],
  "properties": {
    "items": {
      "type": "array",
      "minItems": 1,
      "maxItems": 10000,
      "items": {
        "type": "object",
        "required": [
          "characteristic_name",
          "part_number",
          "batch_number",
          "category_information",
          "samples"
        ],
        "properties": {
          "characteristic_name": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128
          },
          "part_number": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128
          },
          "batch_number": {
            "type": "string",
            "minLength": 1,
            "maxLength": 128
          },
          "category_information": {
            "type": "array",
            "minItems": 1,
            "maxItems": 20,
            "items": {
              "type": "object",
              "required": ["key", "value", "naming", "order"],
              "properties": {
                "key": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                "value": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128
                },
                "naming": {
                  "type": "boolean"
                },
                "order": {
                  "type": "integer",
                  "minimum": 0,
                  "maximum": 9999
                }
              }
            }
          },
          "samples": {
            "type": "array",
            "minItems": 1,
            "maxItems": 100,
            "items": {
              "type": "string",
              "pattern": "^-?\\d+(\\.\\d+)?$"
            },
            "description": "樣本觀測值，請使用字串格式以避免浮點數精度問題"
          }
        }
      }
    }
  }
}
```

---

## 3. 邏輯校驗補充
除了 Schema 本身的格式規範外，系統還會執行以下邏輯校驗：
1. **n 值一致性**：同一批請求中，若針對已存在的管制項目上傳，其 `samples` 的陣列長度必須與系統紀錄的 `subgroup_size` 相同。
2. **命名必填**：`category_information` 中至少必須有一個項目的 `naming` 為 `true`。
3. **字串格式**：`samples` 陣列內的字串必須能成功解析為數值（Numeric）。
