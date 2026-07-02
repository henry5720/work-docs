# 06 資料流程圖 (DFD)

> 本圖描述資料從外部系統進入 SPC 系統後的流動過程與核心處理邏輯。

## 1. 資料處理流程圖 (Mermaid)

```mermaid
graph TD
    A[外部系統 Payload] --> B{API Gateway 認證}
    B -->|認證通過| C[FastAPI POST /all-in-one]

    subgraph Phase1 [階段一：提交 (同步)]
        C --> P[建立任務 pending 寫入 Redis]
        P --> R202[立即回應 202 + task_id]
    end

    C -. 排程背景任務 .-> E

    subgraph Phase2 [階段二：背景處理 (FastAPI BackgroundTasks，進程內)]
        E[Data Validator] --> F{資料庫檢核 (Upsert)}
        F -->|依 name+station+tenant+department 匹配/建立| G[(MySQL: quant_ccms)]
        F -->|Entity 匹配/建立| H[(MySQL: quant_ccm_entities)]

        E --> I[計算統計常數 d2/c4 與 σ]
        I --> J[判定 Nelson Rules 異常]
        J --> K[(MySQL: quant_ccm_entity_samples)]
        J --> L[(MySQL: quant_ccm_sample_alerts)]

        K --> M[更新任務狀態 processing → completed/failed]
        M --> N[(Redis: 任務狀態，TTL 1 小時)]
    end

    subgraph Phase3 [階段三：查詢結果 (輪詢)]
        Q[外部系統輪詢 GET /all-in-one/task_id] --> N
    end
```

## 2. 核心處理節點說明

### 2.1 接收層 (API Layer)
- **POST /all-in-one**: 系統主要接收端點。收到 Payload 後建立一筆任務狀態（`pending`）寫入 Redis，透過 **FastAPI BackgroundTasks**（同一應用程式進程內的背景任務，**非** Redis 訊息佇列 / 非外部 worker）排程處理，並**立即回應 `202 Accepted` 與 `task_id`**，避免 API 阻塞。Redis 在此僅用於**儲存任務狀態與進度**，而非任務佇列。

### 2.2 背景處理 (Background Task)
- **Data Validator**: 負責根據 JSON Schema 檢核資料格式。
- **資料庫檢核 (Upsert 邏輯)**: 系統以 **`name`（由 naming 層別鍵組成）+ `station` + `tenant_id` + `department_id`** 作為匹配鍵，自動判斷計畫 (CCM) 是否已存在，若無則建立；`station` 為**必填**，`part_number`／`batch_number` 為**選填**。項目 (Entity) 則依 `characteristic_name` 匹配/建立，確保資料錄入之完整性。

### 2.3 計算與判定 (Logic Layer)
- **統計常數計算**: 系統自動根據樣本數選擇對應的常數（d2, c4 等）進行 $\sigma$ (Sigma) 計算。
- **Nelson Rules 判定**: 即時對新存入的數據點進行 1-8 號規則檢核。
- **警報觸發 (Alerting)**: 凡判定異常者，即時存入警報表，並視設定發送通知（如 Line/Teams）。

### 2.4 任務狀態查詢與緩存管理 (Task Status & Cache)
- **輪詢查詢**: 外部系統以提交時取得的 `task_id` 呼叫 `GET /all-in-one/{task_id}` 輪詢任務狀態（`pending` / `processing` / `completed` / `failed`）。系統**不使用 WebSocket 推播**。
- **Redis TTL**: 任務狀態存於 Redis，TTL 為 **1 小時（3600 秒）**，過期自動清除。
