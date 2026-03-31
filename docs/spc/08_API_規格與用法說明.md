# 08 API 規格與用法說明

## 1. 互動式文件 (Swagger)
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## 2. 異步任務追蹤邏輯 (Polling Mechanism)
> 回應提問 5：如何對應原始資料與系統產出。

### 2.1 ref_id 對應機制
為解決匯入多筆資料時之對帳問題，`BulkAllInOnePayload` 支援 `ref_id` 欄位：
1. **傳入**：客戶在 `items` 中帶入原始序號 `ref_id`。
2. **處理**：系統建立資料後，將 `ref_id` 關聯至 `created_sample_id`。
3. **回傳**：透過查詢 Task ID，系統會回傳映射清單。

## 3. 錯誤處理與重試
- **404 Task Expired**：任務結果已超過 24 小時。
- **429 Too Many Requests**：觸發頻率限制。
- **部分失敗處理**：若匯入過程中部分 CCM 群組失敗，系統將 Commit 成功之群組，並在 `errors` 中列出失敗原因。
