# SPC 抽樣資料 API 文件

## 概述
抽樣資料 API 提供對 SPC 管制計畫中單筆或多筆樣本的精細化管理。與 All-in-One API 不同，本 API 支援完整的 CRUD（建立、讀取、更新、刪除）操作，適用於資料更正、手動補登或過時數據清理。

---

## 基礎資訊
- **Base URL**: `/private/ccm/quantitative`
- **認證**: 需要 Header 帶入 `Authorization: Bearer YOUR_ACCESS_TOKEN`

---

## API 端點

### 1. 取得樣本列表
**GET** `/{ccm_id}/entities/{entity_id}/samples`

查詢指定管制項目的歷史樣本數據。

#### 查詢參數
| 參數 | 型別 | 說明 | 預設值 |
|:---|:---|:---|:---|
| `offset` | integer | 跳過的筆數 | 0 |
| `limit` | integer | 取得的筆數（最大 100） | 10 |
| `order` | string | 排序方式 (`asc`, `desc`) | `desc` |
| `start_date`| string | 開始日期 (YYYY-MM-DD) | - |
| `end_date` | string | 結束日期 (YYYY-MM-DD) | - |

---

### 2. 建立單筆樣本
**POST** `/{ccm_id}/entities/{entity_id}/samples`

#### 請求格式
```json
{
  "samples": ["1.234", "1.236", "1.235"],
  "operator_name": "張三",
  "category_information": {
    "機台": "M001"
  }
}
```

#### 行為特性
1. **自動格式化**：系統會依據該項目的「抽樣設定（num_of_digits）」自動對數值進行四捨五入與格式化。
2. **自動編號**：系統會自動產生該樣本在該項目下的唯一序號 `idx`。
3. **異常檢測**：新增樣本後，系統會自動在背景執行 **Nelson Rules (尼爾森法則)** 檢測，若發現異常會觸發警報通知。

---

### 3. 批量建立樣本
**POST** `/{ccm_id}/entities/{entity_id}/samples/bulk`

#### 請求格式
```json
{
  "samples": [
    { "samples": ["1.1", "1.2"], "operator_name": "A" },
    { "samples": ["1.3", "1.4"], "operator_name": "B" }
  ]
}
```
> **注意**：批量操作具備原子性 (Atomic)，若其中一筆失敗，整批都會回滾。

---

### 4. 更新樣本資料
**PUT** `/{ccm_id}/entities/{entity_id}/samples/{sample_id}`

用於更正已匯入的錯誤數據。僅支援修改 `samples` 與 `operator_name`。

#### 請求格式
```json
{
  "samples": ["1.230", "1.231", "1.232"],
  "operator_name": "更正人"
}
```

---

### 5. 刪除樣本
**DELETE** `/{ccm_id}/entities/{entity_id}/samples/{sample_id}`

永久刪除指定的樣本記錄。

---

## 注意事項
- **n 值校驗**：提交的 `samples` 陣列長度必須符合該管制項目的子組大小 (subgroup_size)，否則將回傳 400 錯誤。
- **資料連動**：更新或刪除樣本後，相關的管制圖（均值、全距等）會自動在前端重新計算呈現。
