# 08 API 規格文件 (API Specification)

本文件定義 SPC 系統中「Quantitative 定量管制」相關接口的通訊協議、調用流程與實作範例，內容與後端現行實作同步。

> - 欄位級 JSON 結構、型別與限制請參閱 **[09 JSON 格式規範](./09_JSON_格式規範.md)**。
> - 取得 Token 與可執行對接範例請參閱 **[11 對接快速指南](./11_對接快速指南.md)**。

---

# 第一部分：API 目錄 (API Index)

## 1.1 資源列表

| # | Resource（資源）| 功能說明 |
| :--- | :--- | :--- |
| 1 | **Control Plans 管制計畫** | 建立、管理 SPC 計畫（名稱、料號、批號、站別、層別資訊） |
| 2 | **Entities 管制項目** | 管制項目（如厚度、長度）及其排序 |
| 3 | **Chart Settings 管制圖設定** | 管制圖類型（X̄-R/X̄-S/X̄-MR）與界限（含能力指標） |
| 4 | **Sampling Settings 抽樣設定** | 樣本數、精度、抽樣頻率、方法 |
| 5 | **Alert Settings 警示設定** | Ca/Cp/Cpk 臨界值與警示界限 |
| 6 | **Samples 抽樣資料** | 樣本 CRUD、批量建立、計數、層別值 |
| 7 | **Capability 能力分析** | 依篩選集計算 Cp/Cpk/Pp/Ppk 與建議界限 |
| 8 | **Sample Alerts 樣本警報紀錄** | 查詢已觸發警報（Nelson Rules、界限超標）與計數 |
| 9 | **Nelson Rules Settings 尼爾森法則** | 8 種法則啟閉與參數 |
| 10 | **All-in-One 批量匯入** | 自動化一鍵匯入與規格比對預覽 |
| 11 | **Export 匯出** | Excel 匯出（v1 / v2） |
| 12 | **Import Presets 匯入預設** | 匯入預設設定（命名鍵、綁定站別、預設界限等） |
| 13 | **Permissions 權限** | SPC 角色權限查詢與管理 |

## 1.2 資源層級

```
Quantitative CCM（管制計畫）
├── QuantitativeCCMEntity（管制項目）
│   ├── QuantitativeCCMChartSetting（管制圖設定）
│   │   └── QuantitativeCCMChartLimit（管制界限 + 能力指標）
│   ├── QuantitativeCCMSamplingSetting（抽樣設定）
│   ├── QuantitativeCCMAlertSetting（警示設定）
│   └── QuantitativeCCMEntitySample（樣本資料）
│       └── QuantitativeCCMSampleAlert（樣本警報）
└── QuantNelsonRulesSetting（尼爾森法則）
```

## 1.3 批量匯入方式

| 方式 | 說明 | 適用場景 |
| :--- | :--- | :--- |
| **Method 1: 逐步建立** | 依序建立 CCM → Entity → Settings → Samples | 需細部控制 |
| **Method 2: All-in-One** | 一鍵匯入，系統自動建立所有資源 | 大量資料一次性匯入 |

> **Base Path**: `/private/ccm/quantitative`（以下各端點 Path 皆為相對此前綴）

---

# 第二部分：存取控制與權限模型

所有 `/private` 端點皆需帶 Bearer Token（取得方式見 [11](./11_對接快速指南.md)）。除認證外，Quantitative CCM 另有 **SPC 角色** 與 **部門級資料隔離**。

## 2.0.1 SPC 角色

| 角色 (`role`) | 說明 | 寫入權限 |
| :--- | :--- | :--- |
| `system_admin` | 系統管理者 | ✓ |
| `quality_staff` | 品保人員 | ✓ |
| `line_operator` | 線上操作員 | ✓ |
| `viewer` | 唯讀檢視者 | ✗（唯讀） |

- 未設定權限者，預設視為 `viewer`（唯讀）。
- **匯入預設 (Import Presets)** 寫入僅限 `system_admin`、`quality_staff`。
- 權限不足時回傳 `403 Forbidden`。

## 2.0.2 部門級資料隔離

- 每筆計畫（CCM）與管制項目（Entity）綁定建立者的 `department_id`；**匯入預設（Import Presets）為租戶層級，不分部門**。
- 一般使用者**只能存取自己部門**的資料；跨部門資料不會出現在清單，存取會被拒。
- **精確比對**：部門比對為精確相等。既有 `department_id` 為 NULL 的歷史資料，對「已設定部門」的使用者**不可見**；無部門的使用者則只看得到 NULL 記錄。遷移上線前若要保留歷史資料可見，需先回填 `department_id`。
- 具跨部門讀取權限者（系統最高層級）方可讀取所有部門資料。
- **例外**：能力分析／樣本子集分析端點（§3.7 的 capability、capability/count、recommended-limits）**僅做租戶隔離、刻意不套部門可見性**，跨部門的 `entity_id` 亦可查詢成功。
- 因此「查不到某筆資料」或「回傳清單較少」可能是部門隔離所致，並非資料不存在。

---

# 第三部分：API 詳細規格

## 3.1 Control Plans 管制計畫

| # | Method | Path | 說明 |
| :--- | :--- | :--- | :--- |
| 1 | GET | `/` | 取得 CCM 清單（`offset`/`limit`≤100/`order`=asc\|desc） |
| 2 | GET | `/count` | 取得 CCM 總數 |
| 3 | GET | `/{ccm_id}` | 取得單一 CCM（含 entities） |
| 4 | POST | `/` | 建立 CCM |
| 5 | PUT | `/{ccm_id}` | 更新 CCM（部分更新） |
| 6 | DELETE | `/{ccm_id}` | 刪除 CCM（硬刪除，連帶移除設定與樣本） |

**建立 CCM — Request**（`CreateQuantitativeCCMPayload`）：
```json
{
  "source": "manual",
  "name": "A線_厚度",
  "part_number": "PN-001",
  "batch_number": "BN-2026",
  "spec": "10.0±0.5",
  "station": "Station-A",
  "category_information": { "線別": "A線", "班別": "早班" },
  "chatroom_ids": ["chatroom-uuid"]
}
```
> `source` 為列舉：`api` / `mqtt` / `manual`。`category_information` 此處為**物件**（鍵值對）。

**Response**（`QuantitativeCCMInfo`，節錄）：
```json
{
  "id": "ccm-uuid", "source": "manual", "name": "A線_厚度",
  "part_number": "PN-001", "batch_number": "BN-2026",
  "spec": "10.0±0.5", "station": "Station-A",
  "category_information": { "線別": "A線" },
  "chatroom_ids": ["chatroom-uuid"],
  "created_at": "2026-04-14T10:00:00", "updated_at": "2026-04-14T10:00:00",
  "entities": []
}
```

---

## 3.2 Entities 管制項目

| # | Method | Path | 說明 |
| :--- | :--- | :--- | :--- |
| 1 | GET | `/{ccm_id}/entities` | 取得 Entity 清單 |
| 2 | POST | `/{ccm_id}/entities` | 建立 Entity（基本，不含設定） |
| 3 | POST | `/{ccm_id}/entities/with-settings` | 一次建立 Entity + 所有設定 |
| 4 | PUT | `/{ccm_id}/entities/{entity_id}` | 更新 Entity（部分更新） |
| 5 | DELETE | `/{ccm_id}/entities/{entity_id}` | 刪除 Entity |
| 6 | PUT | `/{ccm_id}/entities/reorder` | 全量重新排序（傳入完整 `entity_ids` 順序） |
| 7 | PUT | `/{ccm_id}/entities/swap-order` | 交換兩個 Entity 的順序 |

**建立 Entity（基本）— Request**（`CreateQuantitativeCCMEntityPayload`）：
```json
{
  "characteristic_name": "鎳層厚度",
  "measurement_unit": "μm",
  "manufacturing_information": {}
}
```

**建立 Entity（含所有設定）— Request**（`CreateQuantitativeCCMEntityWithSettingsPayload`）：
```json
{
  "characteristic_name": "鎳層厚度",
  "measurement_unit": "μm",
  "manufacturing_information": {},
  "chart_settings": [
    {
      "chart_type": "x_bar_r",
      "subgroup_size": 5,
      "limits": [
        { "entity_name": "x_bar", "ucl": 10.5, "lcl": 9.5, "cl": 10.0 },
        { "entity_name": "range", "ucl": 1.5, "lcl": 0, "cl": 0.5 }
      ]
    }
  ],
  "sampling_settings": [
    { "num_of_samples": 5, "num_of_digits": 2, "frequency": "每2小時", "sampling_method": "隨機抽樣" }
  ],
  "alert_settings": [
    { "ca_upper_limit": 10.0, "cp_upper_limit": 2.0, "cpk_lower_limit": 1.33, "alert_upper_limit": 10.8, "alert_lower_limit": 9.2 }
  ]
}
```

**交換順序 — Request**（`SwapEntityOrderPayload`）：
```json
{ "entity_id_1": "entity-a", "entity_id_2": "entity-b" }
```

**重新排序 — Request**（`ReorderEntitiesPayload`）：
```json
{ "entity_ids": ["entity-id-1", "entity-id-2", "entity-id-3"] }
```

> Entity 回傳（`QuantitativeCCMEntityInfo`）含彙總統計：`total_samples_count`、`samples_mean_avg`（X̄̄）、`samples_overall_mean`、`samples_overall_std_dev`、`samples_range_avg`（R̄）、`samples_std_dev_avg`（S̄）、`samples_mr_avg`（MR̄），及巢狀 `chart_settings`/`sampling_settings`/`alert_settings`。

---

## 3.3 Chart Settings 管制圖設定

| # | Method | Path | 說明 |
| :--- | :--- | :--- | :--- |
| 1 | GET | `/{ccm_id}/entities/{entity_id}/chart-settings` | 取得清單 |
| 2 | POST | `/{ccm_id}/entities/{entity_id}/chart-settings` | 建立 |
| 3 | PUT | `.../chart-settings/{setting_id}` | 更新 |
| 4 | DELETE | `.../chart-settings/{setting_id}` | 刪除 |
| 5 | POST | `.../chart-settings/{setting_id}/limits` | 建立管制界限 |
| 6 | PUT | `.../chart-settings/{setting_id}/limits/{limit_id}` | 更新管制界限 |
| 7 | DELETE | `.../chart-settings/{setting_id}/limits/{limit_id}` | 刪除管制界限 |

**建立 Chart Setting — Request**：
```json
{ "chart_type": "x_bar_r", "subgroup_size": 5 }
```

> **chart_type 與 subgroup_size (n)**：
> - `x_bar_mr`：X̄-MR 圖（n=1）
> - `x_bar_r`：X̄-R 圖（2≤n≤10）
> - `x_bar_s`：X̄-S 圖（n>10）

**建立 Chart Limit — Request**（`CreateQuantitativeCCMChartLimitPayload`）：
```json
{
  "entity_name": "x_bar",
  "ucl": 10.5, "lcl": 9.5, "cl": 10.0,
  "ucl_management": 10.3, "lcl_management": 9.7, "cl_management": 10.0,
  "ucl_alarm": 10.8, "lcl_alarm": 9.2, "cl_alarm": 10.0
}
```

> **entity_name（`ChartLimitType`）**：`x_bar`（平均值/個別值圖）、`range`（全距圖，x_bar_r 用）、`std_dev`（標準差圖，x_bar_s 用）、`moving_range`（移動全距圖，x_bar_mr 用）。
>
> **公差類型**：雙邊（同時給 `ucl`+`lcl`）、上單邊（只給 `ucl`）、下單邊（只給 `lcl`）。
>
> **能力指標**：Chart Limit 回傳（`QuantitativeCCMChartLimitInfo`）會依樣本自動計算 `sigma_within` 與 `cp/ca/cpu/cpl/cpk/pp/ppu/ppl/ppk`（不適用時為 `null`）。詳見 §3.7 能力分析。

---

## 3.4 Sampling Settings 抽樣設定

| # | Method | Path | 說明 |
| :--- | :--- | :--- | :--- |
| 1 | GET | `/{ccm_id}/entities/{entity_id}/sampling-settings` | 取得清單 |
| 2 | POST | `.../sampling-settings` | 建立 |
| 3 | PUT | `.../sampling-settings/{setting_id}` | 更新 |
| 4 | DELETE | `.../sampling-settings/{setting_id}` | 刪除 |

**Request**：
```json
{ "num_of_samples": 5, "num_of_digits": 2, "frequency": "每2小時", "sampling_method": "隨機抽樣" }
```
> `num_of_samples`=子組大小 n；`num_of_digits`=小數位精度。

---

## 3.5 Alert Settings 警示設定

| # | Method | Path | 說明 |
| :--- | :--- | :--- | :--- |
| 1 | GET | `/{ccm_id}/entities/{entity_id}/alert-settings` | 取得清單 |
| 2 | POST | `.../alert-settings` | 建立 |
| 3 | PUT | `.../alert-settings/{setting_id}` | 更新 |
| 4 | DELETE | `.../alert-settings/{setting_id}` | 刪除 |

**Request**（建立時 5 欄皆必填）：
```json
{
  "ca_upper_limit": 10.0, "cp_upper_limit": 2.0, "cpk_lower_limit": 1.33,
  "alert_upper_limit": 10.8, "alert_lower_limit": 9.2
}
```

---

## 3.6 Samples 抽樣資料

| # | Method | Path | 說明 |
| :--- | :--- | :--- | :--- |
| 1 | GET | `/{ccm_id}/entities/{entity_id}/samples` | 取得樣本（分頁+日期篩選） |
| 2 | GET | `.../samples/count` | 取得樣本總數（`start_date`/`end_date`） |
| 3 | GET | `.../samples/category-values` | 取得各層別鍵的唯一值集合 |
| 4 | POST | `.../samples` | 建立單一樣本 |
| 5 | POST | `.../samples/bulk` | 批量建立樣本 |
| 6 | PUT | `.../samples/{sample_id}` | 更新樣本 |
| 7 | DELETE | `.../samples/{sample_id}` | 刪除樣本 |

**GET 查詢參數**：`offset`、`limit`（≤100）、`order`（asc\|desc）、`start_date`、`end_date`（YYYY-MM-DD）。

**建立單一樣本 — Request**（`CreateQuantitativeCCMEntitySamplePayload`）：
```json
{
  "samples": [9.85, 9.84, 9.86, 9.83, 9.85],
  "operator_name": "張小明",
  "category_information": { "線別": "A線" }
}
```
> **注意**：此端點 `samples` 為**數值陣列**（與 all-in-one 的字串陣列不同）。`category_information` 可選，提供時覆寫父 CCM 的層別。建立前須先設定 Sampling Setting。

**批量建立 — Request**（`BulkCreateQuantitativeCCMEntitySamplePayload`）：
```json
{
  "samples": [
    { "samples": [9.85, 9.84, 9.86, 9.83, 9.85], "operator_name": "張小明" },
    { "samples": [9.87, 9.85, 9.88, 9.84, 9.86], "operator_name": "李小華" }
  ]
}
```

**樣本回傳**（`QuantitativeCCMEntitySampleInfo`）含 `mean_value`、`range_value`、`std_dev`、`mr_value`、`total_value`、`idx` 及 `part_number`/`batch_number`/`category_information`（由 CCM 複製）。

**Category Values 回傳**（`CategoryUniqueValuesResponse`）：
```json
{ "values": { "線別": ["A線", "B線"], "班別": ["早班", "晚班"] } }
```

---

## 3.7 Capability 能力分析

依「篩選後的樣本集」計算製程能力指標。

> **隔離注意**：能力分析端點僅租戶層級隔離、**不受部門隔離**（見 §2.0.2 例外），跨部門 `entity_id` 亦可查詢成功。

| # | Method | Path | 說明 |
| :--- | :--- | :--- | :--- |
| 1 | GET | `.../samples/capability` | 篩選樣本 + 能力指標 |
| 2 | GET | `.../samples/capability/count` | 篩選後樣本數 |
| 3 | GET | `.../samples/capability/recommended-limits` | 依目標指標推算建議界限 |

**能力分析查詢參數**：`category_filters`（JSON 層別篩選）、`start_date`、`end_date`、`merge_duplicates`（是否合併重複）、`offset`/`limit`/`order`。

**能力分析回傳**（`CapabilityAnalysisResponse`）：
```json
{
  "capability": {
    "total_samples_count": 120,
    "samples_mean_avg": 9.85, "samples_overall_mean": 9.85,
    "samples_overall_std_dev": 0.12, "samples_range_avg": 0.30,
    "samples_std_dev_avg": 0.11, "samples_mr_avg": 0.10,
    "chart_limits": [
      {
        "chart_setting_id": "cs-uuid", "chart_type": "x_bar_r", "subgroup_size": 5,
        "limit_id": "lim-uuid", "entity_name": "x_bar",
        "ucl": 10.5, "lcl": 9.5, "cl": 10.0, "sigma_within": 0.13,
        "cp": 1.28, "ca": 0.10, "cpu": 1.66, "cpl": 0.89, "cpk": 0.89,
        "pp": 1.20, "ppu": 1.55, "ppl": 0.83, "ppk": 0.83
      }
    ]
  },
  "samples": []
}
```

**建議界限查詢參數**：`target_index`（`cp`/`cpk`/`pp`/`ppk`）、`target_value`（number）、`category_filters`、`start_date`、`end_date`、`merge_duplicates`。
**回傳**（`RecommendedLimitsResponse`）：含 `target_index`、`target_value`、製程 `samples_overall_mean`/`samples_overall_std_dev`，以及每個 chart setting 的 `recommended_ucl`/`recommended_lcl`/`recommended_cl`。

> 能力指標定義：`Cp=(USL-LSL)/(6σ_within)`、`Cpk=min(CPU,CPL)`、`Ca=|μ-CL|/((USL-LSL)/2)`；Pp/Ppk 以 σ_overall 計算。單邊公差時對應指標為 `null`。

---

## 3.8 Sample Alerts 樣本警報紀錄

| # | Method | Path | 說明 |
| :--- | :--- | :--- | :--- |
| 1 | GET | `.../sample-alerts` | 查詢警報（`alert_type`=nelson_rule\|alarm_limit，分頁） |
| 2 | GET | `.../sample-alerts/count` | 警報數量（可帶 `alert_type`） |

**回傳**（`QuantitativeCCMSampleAlertInfo`）含 `alert_type`、`rule_number`（Nelson 1-8）、`entity_name`/`direction`/`actual_value`/`limit_value`（alarm_limit 用）、`description` 與觸發的 `sample`。

---

## 3.9 Nelson Rules Settings 尼爾森法則

| # | Method | Path | 說明 |
| :--- | :--- | :--- | :--- |
| 1 | GET | `/{ccm_id}/nelson-rules` | 取得清單 |
| 2 | POST | `/{ccm_id}/nelson-rules` | 建立（回 201） |
| 3 | GET | `/{ccm_id}/nelson-rules/{setting_id}` | 取得單一 |
| 4 | PUT | `/{ccm_id}/nelson-rules/{setting_id}` | 更新（部分更新；設為 `null` 停用該法則） |
| 5 | DELETE | `/{ccm_id}/nelson-rules/{setting_id}` | 刪除 |

> **格式（重要）**：每條法則為**結構化物件**（非字串），**不支援舊版 `N(x):S(y)` 字串格式**。未提供或設為 `null` 表示停用該法則。

**Request**（`CreateQuantNelsonRulesSettingPayload`，各法則皆選填）：
```json
{
  "nelson_rules_1": { "n": 1 },
  "nelson_rules_2": { "n": 9, "side": "both" },
  "nelson_rules_3": { "n": 6, "side": "both" },
  "nelson_rules_4": { "n": 14 },
  "nelson_rules_5": { "m": 2, "n": 3 },
  "nelson_rules_6": { "m": 4, "n": 5 },
  "nelson_rules_7": { "n": 15 },
  "nelson_rules_8": { "n": 8 }
}
```

| 法則 | 參數 | 預設 | 說明 |
| :--- | :--- | :--- | :--- |
| 1 | `n` | 1 | 超出 A 區（>3σ）的點數 |
| 2 | `n`,`side` | 9, both | 連續同側於中心線的點數 |
| 3 | `n`,`side` | 6, both | 連續遞增/遞減的點數 |
| 4 | `n` | 14 | 連續交替方向的點數 |
| 5 | `m`,`n` | 2, 3 | N 點中 M 點 >2σ 同側 |
| 6 | `m`,`n` | 4, 5 | N 點中 M 點 >1σ 同側 |
| 7 | `n` | 15 | 連續在 1σ 內的點數 |
| 8 | `n` | 8 | 連續皆不在 1σ 內（雙向） |

> `side`（`NelsonRuleSide`）：`both` / `upper` / `lower`。

---

## 3.10 All-in-One 批量匯入

| # | Method | Path | 說明 |
| :--- | :--- | :--- | :--- |
| 1 | POST | `/all-in-one` | 提交匯入任務（`202 Accepted`，回 `task_id`） |
| 2 | GET | `/all-in-one/{task_id}` | 查詢任務狀態 |
| 3 | POST | `/all-in-one/compare` | 規格界限比對整併預覽（無狀態，不寫入） |

**提交匯入 — Request**（`BulkAllInOnePayload`）：
```json
{
  "preset_id": null,
  "items": [
    {
      "characteristic_name": "鎳層厚度",
      "station": "電鍍",
      "part_number": "PN-001",
      "batch_number": "BN-2026",
      "category_information": [
        { "key": "線別", "value": "A線", "naming": true, "order": 1 }
      ],
      "samples": ["9.85", "9.84", "9.86", "9.83", "9.85"],
      "ucl": 10.5, "cl": 10.0, "lcl": 9.5
    }
  ]
}
```

> **欄位重點**（`AllInOnePayload`）：
> - `characteristic_name`、`station`、`category_information`、`samples` **為必填**（`station` 為新增必填欄）。
> - `part_number`、`batch_number` 為選填。
> - `ucl`/`cl`/`lcl` 為選填規格界限，可於匯入時直接帶入。
> - `samples` 為**字串陣列**（以字串傳遞以避免浮點誤差、保留數值原樣），至少 1 筆。詳見下方「精度自動推斷」。
> - `station` 長度 1–128 字元、前後空白會被去除；**恆為必填**。若使用綁定站別的 `preset_id`，該 preset 的站別會**覆寫**此處送出的 `station`。
> - `BulkAllInOnePayload.preset_id` 選填；提供時套用該匯入預設（命名鍵、綁定站別等），否則走 `naming=true` 邏輯。
> - **自動抽出料號/批號**：若 `category_information` 含鍵 `料號`/`part_number` 或 `批號`/`batch_number`，系統會將其值填入 `part_number`/`batch_number`，並**從層別清單移除**（不再作為一般層別）。

**自動圖型判定**：不需指定 chart_type，系統依每筆 `samples` 長度 `n` 自動決定，並自動推斷小數位數。

| 樣本數 `n` | 主圖 | 副圖 |
| :--- | :--- | :--- |
| `n = 1` | X̄-MR | `moving_range` |
| `2 ≤ n ≤ 10` | X̄-R | `range` |
| `n > 10` | X̄-S | `std_dev` |

> 同一 `characteristic_name` 單次呼叫內的 `samples` 長度須一致，否則回 `Inconsistent sample sizes`。

### 精度自動推斷 (Precision Inference) {#precision-inference}

匯入時系統會掃描該次全部 `samples` 字串，取小數點後**有效位數（去除尾端 0）的最大值**作為該計畫的小數位數（`num_of_digits`），後續統計計算與顯示皆以此精度為準。

- 例：整批最精細為 `"1.251"` → 3 位；`"1.250"` 會被視為 **2 位**（尾端 0 不計入）。若需固定位數，請確保資料中確有該精度的值。
- 以字串（而非數值）傳遞，可避免浮點解析誤差（如 `1.24999999`）影響 Cp/Cpk 統計。

**查詢任務狀態 — Response**：
```json
{
  "task_id": "uuid", "status": "completed",
  "total": 1, "processed": 1, "errors": [],
  "created_ccm_ids": ["ccm-uuid"], "created_entity_ids": ["entity-uuid"]
}
```
| 狀態 | 說明 |
| :--- | :--- |
| `pending` | 等待處理 |
| `processing` | 處理中 |
| `completed` | 成功 |
| `failed` | 失敗（詳見 `errors`） |

**比對預覽 — Request**（`CompareAllInOnePayload`）：用於將 SPC 匯入資料與 TeamSync 規格表進行界限映射整併的**預覽**（不寫入資料）。主要欄位：`import_items`（同 all-in-one items）、`teamsync_table_rows`（前端已扁平化的規格列）、`composite_keys`（複合比對鍵映射）、`limit_mappings`（上下限欄位映射）、`naming_keys`（組裝計畫名稱的層別鍵）。
**Response**（`CompareResponse`）：`comparisons[]`（`PlanCompareResult`：`plan_name`、`station`、`characteristic_name`、映射後 `ucl`/`cl`/`lcl`、`samples_count`、`source_rows` 明細）。

---

## 3.11 Export 匯出

| # | Method | Path | 說明 |
| :--- | :--- | :--- | :--- |
| 1 | GET | `/{ccm_id}/export` | 匯出 CCM（含所有 Entity）為 Excel |
| 2 | GET | `/{ccm_id}/export/v2` | 匯出 CCM（v2，含資料去重） |
| 3 | GET | `/{ccm_id}/entities/{entity_id}/export` | 匯出單一 Entity |
| 4 | GET | `/{ccm_id}/entities/{entity_id}/export/v2` | 匯出單一 Entity（v2） |

**查詢參數**：`start_date`、`end_date`、`category_filters`（JSON 層別篩選）。
**回應**：`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`。
> v2 相對 v1 加入資料去重（重複量測列合併），適合避免重複資料造成的統計失真。

---

## 3.12 Import Presets 匯入預設

匯入 UI 使用的預設設定（命名鍵、綁定站別/聊天室/表格、預設界限）。**為租戶層級（不分部門）**。**讀取**需 `system_admin` / `quality_staff` / `line_operator`（viewer 讀取會回 `403`）；**寫入**僅限 `system_admin`、`quality_staff`。

| # | Method | Path | 說明 |
| :--- | :--- | :--- | :--- |
| 1 | GET | `/import-presets` | 清單 |
| 2 | POST | `/import-presets` | 建立 |
| 3 | GET | `/import-presets/{preset_id}` | 取得單一 |
| 4 | PUT | `/import-presets/{preset_id}` | 更新 |
| 5 | DELETE | `/import-presets/{preset_id}` | 刪除 |

**Request**（`ImportPresetCreate`）：
```json
{
  "name": "電鍍線預設",
  "station_id": "station-uuid",
  "chatroom_id": null,
  "table_id": null,
  "naming_keys": ["線別", "班別"],
  "timestamp_key": "檢驗時間",
  "default_ucl": 10.5, "default_cl": 10.0, "default_lcl": 9.5
}
```
> `naming_keys` **必填且至少 1 個鍵**（空陣列回 `422`）；支援特殊符 `_part_number_`、`_batch_number_`。
> `timestamp_key`：指定後，匯入時系統依該層別欄位的時間值排序決定樣本順序（`idx`）；**不含時區的時間一律視為 UTC**；無法解析的非空時間值會使該計畫匯入失敗。
> `composite_keys`/`limit_mappings` 目前為保留欄位（僅儲存與回傳）。

---

## 3.13 Permissions 權限

管理 SPC 角色（見第二部分權限模型）。管理端點需具權限管理資格。

| # | Method | Path | 說明 |
| :--- | :--- | :--- | :--- |
| 1 | GET | `/permissions/me` | 取得自己的權限 |
| 2 | GET | `/permissions` | 列出所有權限 |
| 3 | PUT | `/permissions/{user_id}` | 設定/更新某使用者角色 |
| 4 | DELETE | `/permissions/{user_id}` | 移除某使用者權限 |

**自己的權限 — Response**（`SPCMyPermissionResponse`）：
```json
{
  "user_id": "ts-user-id", "tenant_id": "tenant-id",
  "role": "quality_staff", "is_default": false,
  "can_manage_permissions": true, "can_read_all_departments": false
}
```

**設定角色 — Request**（`SPCPermissionUpsert`）：
```json
{ "role": "line_operator" }
```
> `role`（`SPCPermissionRole`）：`system_admin` / `quality_staff` / `line_operator` / `viewer`。

---

# 第四部分：調用情境指南

## 4.1 情境 A：逐步建立並匯入（Method 1）

| 順序 | API | 說明 |
| :--- | :--- | :--- |
| 1 | `POST /` | 建立 CCM |
| 2 | `POST /{ccm_id}/entities/with-settings` | 一次建立 Entity + 所有設定 |
| 3 | `POST /{ccm_id}/entities/{entity_id}/samples/bulk` | 批量建立樣本 |

## 4.2 情境 B：一鍵匯入（Method 2）

| 順序 | API | 說明 |
| :--- | :--- | :--- |
| 1 | `POST /all-in-one` | 提交匯入任務（需含 `station`） |
| 2 | `GET /all-in-one/{task_id}` | 輪詢任務狀態 |

> 可執行程式碼範例見 [11 對接快速指南](./11_對接快速指南.md)。

## 4.3 情境 C：修正量測值

| 順序 | API | 說明 |
| :--- | :--- | :--- |
| 1 | `GET .../samples` | 找到要修正的 `sample_id` |
| 2 | `PUT .../samples/{sample_id}` | 修正樣本值（系統重算統計） |

> **實務建議**：多數客戶採「刪除後重新匯入」（`DELETE` → `POST`），而非直接修改。

## 4.4 情境 D：能力分析與建議界限

| 順序 | API | 說明 |
| :--- | :--- | :--- |
| 1 | `GET .../samples/capability?category_filters=...` | 取得指定層別的 Cp/Cpk 等 |
| 2 | `GET .../samples/capability/recommended-limits?target_index=cpk&target_value=1.33` | 依目標 Cpk 推算建議界限 |

---

# 附錄：認證與錯誤處理

## HTTP 狀態碼

| 狀態碼 | 說明 | 建議操作 |
| :--- | :--- | :--- |
| `200` | 成功 | 正常處理 |
| `201` | 建立成功 | 正常處理 |
| `202` | 已受理（異步） | 以 `task_id` 輪詢 |
| `204` | 刪除成功 | 無回傳內容 |
| `400` | 業務校驗失敗 | 修正 Payload 後重試 |
| `401` | 認證失效 | 重新取得 Bearer Token |
| `403` | 權限不足 | 確認 SPC 角色與部門權限（見第二部分） |
| `404` | 資源不存在 | 確認 ID、TTL 與部門可見性 |
| `409` | 衝突（如重複資料） | 檢查資料唯一性 |
| `422` | 參數格式錯誤 | 檢查必填欄位與型別 |
| `500` | 系統內部異常 | 記錄錯誤並回報 |

## 常見錯誤訊息

| 錯誤訊息 | 說明 |
| :--- | :--- |
| `Inconsistent sample sizes` | 同一 characteristic_name 單次呼叫內樣本數不一致 |
| `at least one category_information must have naming=True` | 缺少命名層別（未使用 preset 時） |
| `CCM not found` / `Entity not found` / `Sample not found` | ID 不存在、無權限或非本部門 |
| `Sample size mismatch` | 樣本數與設定不符（需先建立 Sampling Setting） |
| `Duplicate chart type` | 同一 entity 已有相同 chart type 的設定 |
| `Cannot delete: referenced by other records` | 有其他資料關聯，無法刪除 |

> **修訂歷史**已統一彙整至 [12 文件版次異動 (Changelog)](./12_版次異動差異化說明.md)。
