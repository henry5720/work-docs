# SPC All-in-One 批量匯入 API 文件

## 概述

All-in-One 批量匯入 API 提供一站式的 SPC（統計製程管制）資料匯入功能，可自動完成以下操作：

- ✅ 計畫建立與命名（依層別組合自動產生）
- ✅ 辭庫建立（SPCEntityGroup + SPCEntity）
- ✅ 管制圖設定（依樣本數量自動決定圖表類型）
- ✅ 抽樣設定（自動推斷小數位數）
- ✅ 樣本資料插入

**適用場景**：
- 批量匯入量測資料
- 自動建立新的管制計畫
- 快速部署 SPC 監控系統

---

## 實際使用場景
> - [可參考前端](http://holystone.scfg.io/spc/files/measurement-value/import-v2)
> - [匯入範例檔案](./assets/量測值匯入範本_AllInOne.csv)

## 認證

所有 API 請求需要在 Header 中提供有效的認證 Token：

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### 取得 ACCESS_TOKEN 的 api endpoint
```zsh
curl -X 'POST' \
  'https://api.cluster.scfg.io/public/auth/signin' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=password&username=username&password=password%20&scope=&client_id=company_uuid&client_secret='
```

---

## API 端點

### 1. 提交批量匯入任務

**POST** `/private/ccm/quantitative/all-in-one`

提交批量匯入請求，系統將在背景處理資料並回傳任務 ID。

#### 請求格式

```json
{
  "items": [
    {
      "characteristic_name": "鎳",
      "part_number": "AC20J106K101BBHTX",
      "batch_number": "R024745",
      "category_information": [
        {
          "key": "線別",
          "value": "A線",
          "naming": true,
          "order": 1
        },
        {
          "key": "班別",
          "value": "早班",
          "naming": true,
          "order": 2
        },
        {
          "key": "機台",
          "value": "M001",
          "naming": false,
          "order": 1000
        }
      ],
      "samples": ["9.781", "9.567", "9.461"]
    }
  ]
}
```

#### 欄位說明

##### BulkAllInOnePayload (根物件)

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `items` | Array&lt;AllInOnePayload&gt; | ✓ | 批量匯入項目列表，最少 1 筆，最多 10,000 筆 |

##### AllInOnePayload (items 內的每個項目)

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `characteristic_name` | string | ✓ | 管制項目名稱（例如：鎳、錫、銅、長度、厚度） |
| `part_number` | string | ✓ | 產品料號 |
| `batch_number` | string | ✓ | 產品批號 |
| `category_information` | Array&lt;CategoryInfo&gt; | ✓ | 層別資訊，至少需包含一個 `naming=true` 的項目 |
| `samples` | Array&lt;string&gt; | ✓ | 樣本值（以字串格式表示的數值），至少 1 個 |

##### CategoryInfo (category_information 內的每個項目)

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `key` | string | ✓ | 層別維度名稱（例如：線別、班別、機台） |
| `value` | string | ✓ | 層別值（例如：A線、早班、M001） |
| `naming` | boolean | ✓ | 是否用於計畫命名（true: 參與命名；false: 僅作為層別資訊） |
| `order` | integer | ✓ | 排序順序，**必須唯一**（命名層別通常為 1, 2, 3...；非命名層別建議從 1000 開始） |

#### 驗證規則

1. **至少一個命名層別**：每個 item 的 `category_information` 中必須至少有一個 `naming=true`
2. **order 唯一性**：同一 item 內的所有 `category_information` 的 `order` 值不可重複
3. **樣本值為數值**：`samples` 陣列中的每個字串必須可轉換為浮點數
4. **樣本數量一致性**：同一計畫（相同層別組合）下的同一管制項目，所有樣本批次的樣本數量必須一致

#### 計畫命名規則

計畫名稱由 `naming=true` 的層別組合而成，依 `order` 排序，使用 `_` 連接：

**範例 1**：
```json
[
  {"key": "線別", "value": "A線", "naming": true, "order": 1},
  {"key": "班別", "value": "早班", "naming": true, "order": 2}
]
```
→ 計畫名稱：`A線_早班`

**範例 2**：
```json
[
  {"key": "產線", "value": "Line1", "naming": true, "order": 1},
  {"key": "班別", "value": "Day", "naming": true, "order": 2},
  {"key": "機台", "value": "M001", "naming": false, "order": 1000}
]
```
→ 計畫名稱：`Line1_Day`（機台不參與命名）

#### 管制圖自動設定

系統依樣本數量 (n) 自動決定管制圖類型：

| 樣本數量 (n) | 管制圖類型 | 第二管制圖 |
|--------------|-----------|-----------|
| n = 1 | X̄-MR (均值-移動全距圖) | Moving Range |
| 2 ≤ n ≤ 10 | X̄-R (均值-全距圖) | Range |
| n > 10 | X̄-S (均值-標準差圖) | Standard Deviation |

#### 回應格式

**成功** (HTTP 202 Accepted)：
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**錯誤** (HTTP 400 Bad Request)：
```json
{
  "detail": "Item 0: at least one category_information must have naming=True"
}
```

```json
{
  "detail": "CCM 'A線_早班', entity '鎳': inconsistent sample sizes {3, 5}"
}
```

```json
{
  "detail": {
    "type": "value_error",
    "loc": ["body", "items", 0],
    "msg": "Value error, Category information must have unique orders",
    "input": { ... }
  }
}
```

---

### 2. 查詢任務狀態

**GET** `/private/ccm/quantitative/all-in-one/{task_id}`

查詢批量匯入任務的執行狀態與結果。

#### 路徑參數

| 參數 | 型別 | 說明 |
|------|------|------|
| `task_id` | string (UUID) | 提交任務時回傳的任務 ID |

#### 回應格式

```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "total": 100,
  "processed": 100,
  "errors": [],
  "created_ccm_ids": ["ccm-id-1", "ccm-id-2"],
  "created_entity_ids": ["entity-id-1", "entity-id-2", "entity-id-3"]
}
```

#### 欄位說明

| 欄位 | 型別 | 說明 |
|------|------|------|
| `task_id` | string | 任務 ID |
| `status` | string | 任務狀態：`pending`, `processing`, `completed`, `failed` |
| `total` | integer | 總筆數 |
| `processed` | integer | 已處理筆數 |
| `errors` | Array&lt;string&gt; | 錯誤訊息列表（若有） |
| `created_ccm_ids` | Array&lt;string&gt; | 已建立的計畫 ID 列表 |
| `created_entity_ids` | Array&lt;string&gt; | 已建立的管制項目 ID 列表 |

#### 任務狀態說明

| 狀態 | 說明 |
|------|------|
| `pending` | 任務已提交，等待處理 |
| `processing` | 任務處理中 |
| `completed` | 任務成功完成 |
| `failed` | 任務失敗（檢查 `errors` 欄位） |

#### 錯誤處理

**任務不存在或已過期** (HTTP 404 Not Found)：
```json
{
  "detail": "Task not found or expired"
}
```

**注意**：任務狀態在 Redis 中保存 1 小時（3600 秒），過期後將無法查詢。

---

## 完整範例

### 範例 1：單一計畫、單一管制項目

```json
{
  "items": [
    {
      "characteristic_name": "厚度",
      "part_number": "PART-001",
      "batch_number": "BATCH-20260324",
      "category_information": [
        {
          "key": "產線",
          "value": "Line1",
          "naming": true,
          "order": 1
        }
      ],
      "samples": ["1.23", "1.25", "1.24"]
    },
    {
      "characteristic_name": "厚度",
      "part_number": "PART-001",
      "batch_number": "BATCH-20260324",
      "category_information": [
        {
          "key": "產線",
          "value": "Line1",
          "naming": true,
          "order": 1
        }
      ],
      "samples": ["1.26", "1.24", "1.25"]
    }
  ]
}
```

**結果**：
- 建立計畫：`Line1`
- 建立管制項目：`厚度` (n=3, 管制圖類型：X̄-R)
- 插入 2 筆樣本資料

---

### 範例 2：多計畫、多管制項目

```json
{
  "items": [
    {
      "characteristic_name": "鎳",
      "part_number": "AC20J106",
      "batch_number": "R024745",
      "category_information": [
        {"key": "線別", "value": "A線", "naming": true, "order": 1},
        {"key": "班別", "value": "早班", "naming": true, "order": 2},
        {"key": "機台", "value": "M001", "naming": false, "order": 1000}
      ],
      "samples": ["9.781", "9.567", "9.461"]
    },
    {
      "characteristic_name": "錫",
      "part_number": "AC20J106",
      "batch_number": "R024745",
      "category_information": [
        {"key": "線別", "value": "A線", "naming": true, "order": 1},
        {"key": "班別", "value": "早班", "naming": true, "order": 2},
        {"key": "機台", "value": "M001", "naming": false, "order": 1000}
      ],
      "samples": ["8.234", "8.123", "8.056"]
    },
    {
      "characteristic_name": "鎳",
      "part_number": "AC20J106",
      "batch_number": "R024746",
      "category_information": [
        {"key": "線別", "value": "B線", "naming": true, "order": 1},
        {"key": "班別", "value": "晚班", "naming": true, "order": 2},
        {"key": "機台", "value": "M002", "naming": false, "order": 1000}
      ],
      "samples": ["9.234", "9.345", "9.123"]
    }
  ]
}
```

**結果**：
- 建立計畫：`A線_早班` (包含管制項目：鎳、錫)
- 建立計畫：`B線_晚班` (包含管制項目：鎳)
- 總共 3 個管制項目 (QuantitativeCCMEntity)
- 插入 3 筆樣本資料

---

### 範例 3：使用程式碼提交與輪詢

#### JavaScript (Fetch API)

```javascript
// 1. 提交批量匯入
async function submitImport(items) {
  const response = await fetch('https://your-api.com/private/ccm/quantitative/all-in-one', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ items })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail);
  }

  const { task_id } = await response.json();
  return task_id;
}

// 2. 輪詢任務狀態
async function pollTaskStatus(taskId, maxAttempts = 60, intervalMs = 1000) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `https://your-api.com/private/ccm/quantitative/all-in-one/${taskId}`,
      {
        headers: {
          'Authorization': 'Bearer YOUR_ACCESS_TOKEN'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch task status');
    }

    const status = await response.json();
    console.log(`Progress: ${status.processed}/${status.total}`);

    if (status.status === 'completed') {
      return status;
    }

    if (status.status === 'failed') {
      throw new Error(`Import failed: ${status.errors.join('; ')}`);
    }

    // 等待 1 秒後再查詢
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error('Import timeout');
}

// 使用範例
const items = [
  {
    characteristic_name: "厚度",
    part_number: "PART-001",
    batch_number: "BATCH-001",
    category_information: [
      { key: "產線", value: "Line1", naming: true, order: 1 }
    ],
    samples: ["1.23", "1.25", "1.24"]
  }
];

try {
  const taskId = await submitImport(items);
  console.log(`Task submitted: ${taskId}`);

  const result = await pollTaskStatus(taskId);
  console.log('Import completed:', result);
} catch (error) {
  console.error('Import failed:', error);
}
```

#### Python

```python
import time
import requests

def submit_import(items, api_url, token):
    response = requests.post(
        f"{api_url}/private/ccm/quantitative/all-in-one",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json={"items": items}
    )
    response.raise_for_status()
    return response.json()["task_id"]

def poll_task_status(task_id, api_url, token, max_attempts=60, interval=1):
    for i in range(max_attempts):
        response = requests.get(
            f"{api_url}/private/ccm/quantitative/all-in-one/{task_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        response.raise_for_status()

        status = response.json()
        print(f"Progress: {status['processed']}/{status['total']}")

        if status["status"] == "completed":
            return status

        if status["status"] == "failed":
            raise Exception(f"Import failed: {'; '.join(status['errors'])}")

        time.sleep(interval)

    raise TimeoutError("Import timeout")

# 使用範例
items = [
    {
        "characteristic_name": "厚度",
        "part_number": "PART-001",
        "batch_number": "BATCH-001",
        "category_information": [
            {"key": "產線", "value": "Line1", "naming": True, "order": 1}
        ],
        "samples": ["1.23", "1.25", "1.24"]
    }
]

try:
    task_id = submit_import(items, "https://your-api.com", "YOUR_TOKEN")
    print(f"Task submitted: {task_id}")

    result = poll_task_status(task_id, "https://your-api.com", "YOUR_TOKEN")
    print("Import completed:", result)
except Exception as e:
    print("Import failed:", e)
```

---

## 常見問題與最佳實踐

### Q1: 如何設定層別的 order 值？

**建議**：
- **命名層別**：使用連續整數 1, 2, 3...（決定計畫名稱中的順序）
- **非命名層別**：從 1000 開始遞增 1000, 1001, 1002...（避免與命名層別衝突）

**範例**：
```json
{
  "category_information": [
    {"key": "線別", "value": "A線", "naming": true, "order": 1},
    {"key": "班別", "value": "早班", "naming": true, "order": 2},
    {"key": "機台", "value": "M001", "naming": false, "order": 1000},
    {"key": "站別", "value": "ST01", "naming": false, "order": 1001}
  ]
}
```

### Q2: 為什麼樣本值要用字串格式？

**原因**：避免 JSON 解析時浮點數精度問題。

**範例**：
```json
// ✓ 正確
"samples": ["9.123456789", "8.987654321"]

// ✗ 錯誤（可能導致精度損失）
"samples": [9.123456789, 8.987654321]
```

### Q3: 每批最多可以匯入多少筆資料？

**限制**：單次請求最多 10,000 筆 items。

**建議**：
- 每批 1,000 筆為佳（平衡效能與錯誤處理）
- 大量資料分批提交，避免單一任務過大

### Q4: 如果部分資料匯入失敗怎麼辦？

系統採用「計畫分組」策略：
- 若某個計畫（CCM group）匯入失敗，**僅該計畫回滾**
- 其他計畫的匯入不受影響
- 失敗訊息會記錄在 `errors` 欄位

**建議**：
- 根據 `errors` 修正資料後重新提交失敗的計畫
- 使用 `created_ccm_ids` 和 `created_entity_ids` 追蹤成功建立的項目

### Q5: 任務狀態保存多久？

**保存時間**：1 小時（3600 秒）

**建議**：
- 匯入完成後立即查詢最終狀態並儲存結果
- 大批次匯入時預先估算處理時間，確保不超過 1 小時

### Q6: 如何處理相同計畫名稱的資料？

**行為**：
- **計畫已存在**：使用現有計畫，新增管制項目與樣本
- **管制項目已存在**：直接新增樣本（不會重新建立管制圖設定）
- **管制項目不存在**：建立新的管制項目與管制圖設定

**注意**：同一計畫下的同一管制項目，所有樣本批次的樣本數量必須一致。

---

## 錯誤碼參考

| HTTP 狀態碼 | 錯誤訊息 | 原因 | 解決方法 |
|------------|---------|------|---------|
| 400 | at least one category_information must have naming=True | 缺少命名層別 | 至少設定一個 `naming=true` |
| 400 | Category information must have unique orders | order 重複 | 確保每個 item 內的 order 值唯一 |
| 400 | Sample at index X is not a valid number | 樣本值非數值 | 檢查 samples 陣列內容 |
| 400 | inconsistent sample sizes | 樣本數量不一致 | 同一計畫、同一管制項目的所有批次樣本數量必須相同 |
| 404 | Task not found or expired | 任務不存在或已過期 | 檢查 task_id 是否正確，或任務是否已過期（1小時） |

---

## 版本資訊

**API 版本**：v1
**最後更新**：2026-03-24
**文件版本**：1.0.0

---

## 聯絡資訊

如有任何問題或建議，請聯絡：
- **技術支援**：[support@example.com](mailto:support@example.com)
- **開發團隊**：[dev@example.com](mailto:dev@example.com)
