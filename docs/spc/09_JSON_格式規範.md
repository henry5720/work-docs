# 09 JSON 格式規範

## 1. 批量匯入 JSON Schema (Draft)

```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "characteristic_name": { "type": "string", "maxLength": 128 },
          "part_number": { "type": "string", "maxLength": 128 },
          "batch_number": { "type": "string", "maxLength": 128 },
          "ref_id": { "type": "string", "maxLength": 64 },
          "samples": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      }
    }
  }
}
```

## 2. 資料傳輸規範
- **字串化數值**：所有 `samples` 內的數值必須以字串傳遞（如 `"1.250"`），以確保高精度計算時不發生浮點數截斷。
