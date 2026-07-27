# [DEPRECATED] SPC All-in-One 批量匯入 API 文件

⚠️ **注意：本文件已廢棄** ⚠️
本文件內容已整合至以下新版文件體系，請停止引用此舊版內容：

1. **[08 API 規格與用法說明](../08_API_規格與用法說明.md)**：包含 API Endpoint、異步流程與維護接口。
2. **[09 JSON 格式規範](../09_JSON_格式規範.md)**：包含詳細的欄位限制與數據處理邏輯。
3. **[10 FAQ 技術提問回覆](../10_FAQ_技術提問回覆.md)**：包含常見問題與技術細節。

---

## 概述 (舊版內容僅供存檔備查)

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
| `characteristic_name` | string | ✓ | 管制項目名稱 |
| `part_number` | string | ✓ | 產品料號 |
| `batch_number` | string | ✓ | 產品批號 |
| `category_information` | Array&lt;CategoryInfo&gt; | ✓ | 層別資訊 |
| `samples` | Array&lt;string&gt; | ✓ | 樣本值（以字串格式表示的數值） |

##### CategoryInfo (category_information 內的每個項目)

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `key` | string | ✓ | 層別維度名稱 |
| `value` | string | ✓ | 層別值 |
| `naming` | boolean | ✓ | 是否用於計畫命名 |
| `order` | integer | ✓ | 排序順序 |

#### 回應格式

**成功** (HTTP 202 Accepted)：
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### 2. 查詢任務狀態

**GET** `/private/ccm/quantitative/all-in-one/{task_id}`

查詢批量匯入任務的執行狀態與結果。

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

---

## 程式碼實作範例

### JavaScript (Fetch API)

```javascript
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

async function pollTaskStatus(taskId, maxAttempts = 60, intervalMs = 1000) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `https://your-api.com/private/ccm/quantitative/all-in-one/${taskId}`,
      { headers: { 'Authorization': 'Bearer YOUR_ACCESS_TOKEN' } }
    );

    if (!response.ok) throw new Error('Failed to fetch task status');

    const status = await response.json();
    console.log(`Progress: ${status.processed}/${status.total}`);

    if (status.status === 'completed') return status;
    if (status.status === 'failed') throw new Error(`Import failed: ${status.errors.join('; ')}`);

    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error('Import timeout');
}
```

### Python

```python
import time
import requests

def submit_import(items, api_url, token):
    response = requests.post(
        f"{api_url}/private/ccm/quantitative/all-in-one",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
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
        if status["status"] == "completed": return status
        if status["status"] == "failed": raise Exception(f"Import failed: {'; '.join(status['errors'])}")
        time.sleep(interval)
    raise TimeoutError("Import timeout")
```

---

## 核心技術規格 (Technical Specifications)

本章節詳述系統對接時的關鍵行為特性與限制。

### 1. 資料生命週期管理 (CRUD)
All-in-One API 是針對 **「高吞吐量數據採集」** 設計的快捷介面，其行為特性如下：
- **僅限追加 (Append Only)**：此 API 專為「新增樣本」與「自動建立關聯節點」設計。
- **不支援修改與刪除**：若需更正匯入錯誤的數據、刪除過時計畫或更新樣本值，請根據系統回傳的 `ccm_id` 或 `sample_id` 使用專屬的 [抽樣資料 API](./SAMPLES.md) 或 [計畫管理 API](./CCM.md) 執行 `PUT` 或 `DELETE` 操作。
- **自動對接機制**：若上傳時指定的計畫名稱（Plan Name）或管制項目（Entity Name）已存在，系統會自動將新樣本掛載至現有計畫下，不會產生多餘的計畫容器。

### 2. 唯一鍵定義與重複數據處理
系統在不同層級的唯一性判定邏輯如下：
| 層級 | 唯一性定義 (Unique Key) | 重複上傳行為 (Duplicate Handling) |
|:---|:---|:---|
| **計畫 (Plan)** | `tenant_id` + `name` | 名稱由 `naming=true` 的層別依 `order` 組合。若名稱相同，系統會 **沿用既有計畫**，不重複建立。 |
| **管制項目 (Entity)** | `ccm_id` + `characteristic_name` | 若同一計畫下已存在同名項目，系統會 **沿用既有項目** 與其圖表設定。 |
| **樣本資料 (Sample)** | **無唯一鍵 (No Unique Constraint)** | **系統視每一筆 `samples` 為獨立量測結果。** 若同批號 (batch_number) 資料重複發送，系統會產生兩筆紀錄。呼叫端應自行維護發送狀態以避免數據重複。 |

### 3. 計畫管理與變更彈性 (n 值變更)
- **n 值鎖定限制**：同一計畫下的同一管制項目，其子組大小 (n) 在建立第一個樣本時即鎖定。
- **變更建議**：若製程中抽樣標準改變（如從 n=3 改為 n=5），為確保歷史統計數據（如 Cpk、管制界限）的一致性，**嚴禁在原項目直接修改 n 值**。
- **正確操作方案**：請透過 API 建立一個新的管制項目（例如 `characteristic_name` 命名為 "厚度_v2" 或加註版本），並設定新的 n 值。

### 4. 欄位規範與系統限制
- **字串長度限制**：`characteristic_name`、`part_number`、`batch_number` 與 `category_information` 的 `key`/`value` 最大長度均為 **128 字元**。
- **特殊符號**：支援常用特殊符號（如 `-`, `_`, `/`），但建議避免使用 `&`, `?`, `#` 等 URL 敏感字元。
- **呼叫頻率 (Rate Limit)**：
  - **建議**：每批次 1,000 筆資料。
  - **速率限制**：單一租戶併發提交頻率建議 **< 20 次請求/分鐘**。高頻率呼叫可能導致資料庫鎖定或處理延遲。

### 5. 任務結果追蹤與關聯性
當一次提交包含多筆（最多 10,000 筆）資料時：
- **異步處理特性**：系統採用背景分組處理，回傳的 `created_ccm_ids` 與 `created_entity_ids` 是該次任務產生之所有 ID 列表，無法與原始 `items` 進行 1:1 索引對應。
- **推薦做法**：
  1. **預先分組**：建議呼叫端在提交前，自行按「計畫」進行預先分組（例如一個請求只含一個計畫的資料）。
  2. **元數據對應**：利用 `batch_number` 作為關聯鍵。匯入完成後，透過 `GET /{ccm_id}/entities/{entity_id}/samples` 查詢即可依批號找回對應的系統 ID。

### 6. 錯誤處理與重試策略
- **原子性原則 (Plan Atomic)**：系統按「計畫」分組處理。若一次請求包含計畫 A 與 B，A 成功但 B 失敗，則 **A 會寫入資料，B 會整批回滾**，並在 `errors` 列表中詳細說明計畫 B 的失敗原因。
- **任務效期**：任務狀態在 Redis 中僅保存 **1 小時**。開發者應在收到 `task_id` 後立即進行輪詢，並將最終結果（含錯誤原因）存入本地端日誌系統，以供後續對帳。
- **網路異常處理**：若發生網路中斷，應先以 `task_id` 查詢狀態，而非直接重發請求，以避免資料重複匯入。

---

## 常見問題 (FAQ)

### Q1: 如何設定層別的 order 值？
**建議**：命名層別使用連續整數 1, 2, 3...；非命名層別從 1000 開始。
**範例**：
```json
{
  "category_information": [
    {"key": "線別", "value": "A線", "naming": true, "order": 1},
    {"key": "機台", "value": "M001", "naming": false, "order": 1000}
  ]
}
```

### Q2: 為什麼樣本值要用字串格式？
**原因**：避免 JSON 解析時浮點數精度問題。
**範例**：`"samples": ["9.123456", "8.987654"]`

### Q3: 如何處理相同計畫名稱的資料？
沿用既有計畫與管制項目，直接新增樣本。

### Q4: 任務狀態可以保存更久嗎？
固定保存 1 小時。請在提交後立即完成輪詢並存入本地日誌。

---

## 錯誤碼參考
| HTTP 狀態碼 | 錯誤訊息 | 原因 | 解決方法 |
|------------|---------|------|---------|
| 400 | at least one category_information must have naming=True | 缺少命名層別 | 至少設定一個 `naming=true` |
| 400 | inconsistent sample sizes | 樣本數量不一致 | 同一計畫、同一管制項目的所有批次樣本數量必須相同 |
| 404 | Task not found or expired | 任務不存在或已過期 | 檢查 task_id 是否正確，或任務是否已過期（1小時） |

---

## 版本資訊
**API 版本**：v1 | **最後更新**：2026-03-30 | **文件版本**：1.2.0

## 聯絡資訊
- **技術支援**：[support@example.com](mailto:support@example.com)
- **開發團隊**：[dev@example.com](mailto:dev@example.com)
