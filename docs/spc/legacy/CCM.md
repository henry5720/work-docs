# SPC 計畫管理 API 文件

## 概述
計畫管理 API 提供對 SPC 管制計畫（CCM）及其子項目（Entity）的生命週期管理。呼叫端可透過此 API 手動建立計畫、配置管制界限 (Limits) 以及抽樣規則 (Sampling Settings)。

---

## 基礎資訊
- **Base URL**: `/private/ccm/quantitative`
- **認證**: 需要 Header 帶入 `Authorization: Bearer YOUR_ACCESS_TOKEN`

---

## 計畫管理 (Control Plans)

### 1. 取得計畫列表
**GET** `/`

查詢租戶下所有 SPC 管制計畫的基本資訊。

---

### 2. 建立新計畫
**POST** `/`

手動建立一個 SPC 管制計畫容器。

#### 請求格式
```json
{
  "source": "manual",
  "name": "Line1_早班",
  "part_number": "PART-001",
  "batch_number": "BATCH-001",
  "spec": "A-Type",
  "station": "ST01",
  "category_information": [
    { "key": "線別", "value": "Line1", "naming": true, "order": 1 },
    { "key": "班別", "value": "早班", "naming": true, "order": 2 }
  ],
  "chatroom_ids": ["room-uuid-1"]
}
```

---

### 3. 修改計畫基本資訊
**PUT** `/{ccm_id}`

僅支援修改計畫元數據（如 `name`, `spec`, `station`, `chatroom_ids` 等），不影響已匯入的數據。

---

### 4. 刪除計畫
**DELETE** `/{ccm_id}`

**警告**：刪除計畫會連帶刪除其下所有的管制項目、抽樣設定、管制界限以及所有的歷史樣本資料，此操作不可撤銷。

---

## 管制項目管理 (Entities)

### 1. 取得計畫下的管制項目
**GET** `/{ccm_id}/entities`

列出該計畫中所有的管制項目（如：厚度、寬度、電阻值等）。

---

### 2. 新增管制項目與完整設定
**POST** `/{ccm_id}/entities/with-settings`

這是最推薦的建立方式，可一次完成項目名稱、管制圖類型、界限及抽樣規則的配置。

#### 請求格式
```json
{
  "characteristic_name": "厚度",
  "measurement_unit": "mm",
  "manufacturing_information": { "工序": "P01" },
  "chart_settings": [
    {
      "chart_type": "x_bar_r",
      "subgroup_size": 5,
      "limits": [
        { "entity_name": "x_bar", "ucl": 1.5, "lcl": 0.5, "cl": 1.0 },
        { "entity_name": "range", "ucl": 0.2, "lcl": 0, "cl": 0.1 }
      ]
    }
  ],
  "sampling_settings": [
    { "num_of_samples": 5, "num_of_digits": 3, "frequency": "1H/次", "sampling_method": "隨機" }
  ],
  "alert_settings": [
    { "ca_upper_limit": 0.125, "cp_upper_limit": 1.33, "cpk_lower_limit": 1.0 }
  ]
}
```

---

### 3. 調整顯示順序
**PUT** `/{ccm_id}/entities/swap-order` 或 `PUT** `/{ccm_id}/entities/reorder`

用於調整前端介面顯示項目的先後順序。

---

## 注意事項
- **n 值鎖定**：一旦管制項目建立且已有樣本資料，**請勿輕易修改 subgroup_size**，否則會導致歷史數據計算錯誤。若需調整 n 值，建議建立新的管制項目。
- **Unique Key**：同一計畫下的 `characteristic_name` 必須唯一。
