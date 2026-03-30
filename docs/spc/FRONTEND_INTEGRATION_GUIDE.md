# SPC 系統對接與整合指南 (Frontend Integration Guide)

## 概述
本文件說明 TeamSync Frontend 是如何使用後端 SPC All-in-One API 進行高效率、大數據量的資料匯入。第三方系統開發者可參考此邏輯實現自動化對接。

---

## 1. 數據分批處理 (Chunking & Batching)
當待匯入數據超過 1,000 筆時，前端不會一次性發送所有數據，而是採取 **「分批提交」** 策略。
- **批次大小 (Batch Size)**：建議每 1,000 筆資料為一組 (Batch)。
- **優點**：
  1. 避免單次 HTTP 請求 Payload 過大（防止 413 錯誤或網路逾時）。
  2. 縮短單一任務在背景執行的鎖定時間。
  3. 提供即時進度反饋（Progress Bar）。

---

## 2. 任務輪詢與持久化機制 (Task Polling)
由於匯入是異步（Asynchronous）處理，前端實現了以下機制來確保任務追蹤：
- **遞迴輪詢 (Recursive Polling)**：
  1. 提交 `POST` 請求並獲得 `task_id`。
  2. 每隔 1,000ms 發送一次 `GET /all-in-one/{task_id}` 請求。
  3. 直到 `status` 為 `completed` 或 `failed`。
- **任務持久化 (Task Persistence)**：
  - 前端會將 `task_id` 存入瀏覽器的 `localStorage`。
  - **異常處理**：若使用者在匯入期間關閉瀏覽器或刷新頁面，前端重新加載後會讀取 `localStorage` 中的 `task_id` 繼續監控匯入進度。

---

## 3. 網路異常與重試策略 (Retry Strategy)
針對網路不穩定導致的請求失敗，前端採用了 **「指數退避 (Exponential Backoff)」** 的重試機制：
- **重試條件**：僅針對網路錯誤（如 `Connection Timeout`、`ECONNRESET`）或系統級錯誤 (HTTP 5xx) 進行重試。
- **重試次數**：最多 3 次。
- **間隔時間**：第 1 次重試間隔 2s，第 2 次 4s，第 3 次 8s。

---

## 4. 數據分組與預校驗 (Data Grouping & Pre-validation)
為了解決客戶提問中提到的「任務結果 ID 對應困難」，前端在提交前會執行 **「分組預處理」**：
- **前端分組**：依據「計畫名稱 (Plan Name)」+「管制項目 (Characteristic Name)」將資料在前端先行分組。
- **預校驗 (Pre-flight Check)**：
  1. 檢查 `samples` 陣列長度是否一致。
  2. 檢查 `characteristic_name`、`part_number` 等必填欄位是否齊全。
- **優點**：確保送往 API 的數據是經過結構化且高機率能成功處理的，減少 API 回傳 `failed` 的頻率。

---

## 5. 錯誤日誌管理 (Error Logging)
- **錯誤呈現**：當輪詢結果回傳 `failed` 時，前端會從 `errors` 列表中提取詳細原因（例如：`Plan [A_B] contains inconsistent sample sizes`）。
- **使用者導向**：前端會標示出該批次中哪幾筆資料發生問題，供使用者下載「錯誤報表」以便修正後重新上傳。

---

## 參考程式碼 (邏輯虛擬碼)
第三方開發者可參照以下邏輯實現對接：

```javascript
async function robustImport(items) {
  const BATCH_SIZE = 1000;
  const chunks = splitIntoChunks(items, BATCH_SIZE);

  for (const chunk of chunks) {
    // 1. 提交
    const taskId = await submitWithRetry(chunk);
    
    // 2. 輪詢
    let result = null;
    while (true) {
      result = await getTaskStatus(taskId);
      if (result.status === 'completed') break;
      if (result.status === 'failed') throw new Error(result.errors.join('; '));
      await sleep(1000); // 等待 1 秒
    }
    
    console.log(`批次處理完成，建立計畫數: ${result.created_ccm_ids.length}`);
  }
}
```
