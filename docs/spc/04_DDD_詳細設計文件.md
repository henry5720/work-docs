# 04 詳細設計文件 (DDD) - SPC 邏輯與統計細節 (詳細版)

## 1. 核心統計邏輯 (Statistical Core)

### 1.1 統計常數與精度推估
系統內建 AIAG 標準常數表 ($n=2 \sim 25$):
- **$d_2$ 近似值**: 當 $n > 25$ 時，採用 $3.087 - (0.083 / n)$。
- **$c_4$ 近似值**: 當 $n > 25$ 時，採用 $(4n - 4) / (4n - 3)$。
- **單位精確度**: 計算過程採用 `Decimal` 以防止浮點數精度丟失，僅在存儲與顯示時根據「單位辭庫」設定的 `Digits` 進行四捨五入。

### 1.2 等級基準判定算法 (Grade Selection)
- **輸入**: 當前計算之 Cpk 值。
- **邏輯**: 從快取讀取 `RankDefinitions` -> 按 `lower_bound` 降序排列 -> 尋找第一個 `cpk >= lower_bound` 的等級。
- **輸出**: 等級標籤 (A/B/C) 與對應的 16 進位顏色代碼。

---

## 1.3 完整 d₂ 常數表
| n | d₂ | n | d₂ | n | d₂ | n | d₂ | n | d₂ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2 | 1.128 | 7 | 2.704 | 12 | 3.258 | 17 | 3.588 | 22 | 3.819 |
| 3 | 1.693 | 8 | 2.847 | 13 | 3.336 | 18 | 3.640 | 23 | 3.858 |
| 4 | 2.059 | 9 | 2.970 | 14 | 3.407 | 19 | 3.689 | 24 | 3.895 |
| 5 | 2.326 | 10 | 3.078 | 15 | 3.472 | 20 | 3.735 | 25 | 3.931 |
| 6 | 2.534 | 11 | 3.173 | 16 | 3.532 | 21 | 3.778 | >25 | 3.087 - 0.083/n |

### 1.4 完整 c₄ 常數表
| n | c₄ | n | c₄ | n | c₄ | n | c₄ | n | c₄ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2 | 0.7979 | 7 | 0.9594 | 12 | 0.9776 | 17 | 0.9845 | 22 | 0.9882 |
| 3 | 0.8862 | 8 | 0.9650 | 13 | 0.9794 | 18 | 0.9854 | 23 | 0.9887 |
| 4 | 0.9213 | 9 | 0.9693 | 14 | 0.9810 | 19 | 0.9862 | 24 | 0.9892 |
| 5 | 0.9400 | 10 | 0.9727 | 15 | 0.9823 | 20 | 0.9869 | 25 | 0.9896 |
| 6 | 0.9515 | 11 | 0.9754 | 16 | 0.9835 | 21 | 0.9876 | >25 | 4(n-1)/(4n-3) |

---

## 2. Nelson Rules 詳細演算法

### 2.1 各規則說明
| 規則 | 名稱 | 觸發條件 | 建議動作 |
| :--- | :--- | :--- | :--- |
| **Rule 1** | 超出管制界限 | N 點超出 ±3σ | 立即檢查量測設備 |
| **Rule 2** | 連續偏移 | N 點在均值同側 | 檢查原物料/參數變更 |
| **Rule 3** | 趨勢異常 | N 點連續上升/下降 | 檢查刀具磨損 |
| **Rule 4** | 週期性振盪 | N 點交替上下 | 檢查 two-level 因子 |
| **Rule 5** | 偏移警告 (2σ) | M/N 點超出 ±2σ | 密切監控後續數據 |
| **Rule 6** | 偏移警告 (1σ) | M/N 點超出 ±1σ | 檢視細微變化 |
| **Rule 7** | 層化現象 | N 點在 ±1σ 內 | 檢查量測系統 |
| **Rule 8** | 混合模式 | N 點在 ±1σ 外兩側 | 檢查母體混合 |

### 2.2 設定格式

API 契約中每條規則為**結構化物件**（未設定則為 `null` 表示停用），透過 `POST/PUT /{ccm_id}/nelson-rules` 傳遞：

| 規則欄位 | 物件格式 | 範例 (JSON) | 預設值 |
| :--- | :--- | :--- | :--- |
| `nelson_rules_1` | `{ n }` | `{"n": 1}` → 1點超出 3σ | N=1 |
| `nelson_rules_2` | `{ n, side }` | `{"n": 9, "side": "both"}` → 9點在同側 | N=9, side=both |
| `nelson_rules_3` | `{ n, side }` | `{"n": 6, "side": "upper"}` → 6點上升 | N=6, side=both |
| `nelson_rules_4` | `{ n }` | `{"n": 14}` → 14點交替 | N=14 |
| `nelson_rules_5` | `{ m, n }` | `{"m": 2, "n": 3}` → 3點中2點超出 2σ | M=2, N=3 |
| `nelson_rules_6` | `{ m, n }` | `{"m": 4, "n": 5}` → 5點中4點超出 1σ | M=4, N=5 |
| `nelson_rules_7` | `{ n }` | `{"n": 15}` → 15點在 1σ 內 | N=15 |
| `nelson_rules_8` | `{ n }` | `{"n": 8}` → 8點在 1σ 外 | N=8 |

其中 `side` 為 `both` / `upper` / `lower`（`NelsonRuleSide`）。

> **內部儲存格式**：後端資料表以逗號分隔字串儲存（如 `"9,both"`、`"2,3"`），由 API 層負責與上述結構化物件互轉；整合對接時一律使用結構化物件。

### 2.3 判定邏輯

偵測以子組平均值序列為對象，取最近的點數視窗（依各規則設定的 N/M）與製程中心線 μ、σ 帶界比對。各規則判定邏輯如下（σ=0 或點數不足時不觸發）：

| 規則 | 判定邏輯 |
| :--- | :--- |
| **Rule 1** | 最近 N 點皆落在 μ±3σ 之外 → 觸發 |
| **Rule 2** | 最近 N 點皆位於中心線同一側（依 `side`：upper 全大於 μ、lower 全小於 μ、both 任一側全滿足） |
| **Rule 3** | 最近 N 點連續遞增或遞減（upper=遞增、lower=遞減、both=任一） |
| **Rule 4** | 最近 N 點方向持續交替（相鄰兩差值正負相反） |
| **Rule 5** | 最近 N 點中，同方向有 ≥ M 點落在 μ±2σ 之外 |
| **Rule 6** | 最近 N 點中，同方向有 ≥ M 點落在 μ±1σ 之外 |
| **Rule 7** | 最近 N 點皆落在 μ±1σ 之內（層化，變異過小） |
| **Rule 8** | 最近 N 點皆落在 μ±1σ 之外，且中心線兩側皆有點（混合） |

### 2.4 規則觸發流程
```mermaid
flowchart TD
    A[樣本寫入/更新] --> B[查詢 Nelson Rules 設定]
    B --> C[取得最大 N 值需求]
    C --> D[取得最近 25 點均值]
    D --> E{計算 Sigma}
    E -->|X̄-MR| F[σ = MR̄ / d₂(2)]
    E -->|X̄-R| G[σ = R̄ / d₂(n)]
    E -->|X̄-S| H[σ = S̄ / c₄(n)]
    F --> I[執行 8 條規則偵測]
    G --> I
    H --> I
    I --> J{有異常?}
    J -->|No| K[結束]
    J -->|Yes| L[建立 Alert 記錄]
    L --> M[發送 Webhook]
    M --> N[更新 UI]
```

---

## 3. Capability 計算公式

### 3.1 Sigma 計算方式

| 圖表類型 | Sigma 公式 | 說明 |
| :--- | :--- | :--- |
| **I-MR (n=1)** | σ = MR̄ / d₂(2) | MR̄ = 平均移動極差 |
| **X̄-R (2≤n≤10)** | σ = R̄ / d₂(n) | R̄ = 平均全距 |
| **X̄-S (n>10)** | σ = S̄ / c₄(n) | S̄ = 平均標準差 |

### 3.2 短期能力指數 (Within-Subgroup)

#### Cp (Process Capability)
$$C_p = \frac{USL - LSL}{6\sigma_{within}}$$

- 要求雙邊公差 (USL 和 LSL 均有值)
- σ_within 根據圖表類型計算

#### Ca (Capability Accuracy)
$$C_a = \frac{X̄ - M}{(USL - LSL) / 2}$$
其中 $M = (USL + LSL) / 2$ (規格中心)

- 正值表示製程偏向上限
- 負值表示製程偏向下限

#### CPU (Upper Process Capability Index)
$$C_{PU} = \frac{USL - X̄}{3\sigma_{within}}$$

- 用於單邊上限公差 (USL only)

#### CPL (Lower Process Capability Index)
$$C_{PL} = \frac{X̄ - LSL}{3\sigma_{within}}$$

- 用於單邊下限公差 (LSL only)

#### Cpk (Process Capability Index)
$$C_{pk} = min(C_{PU}, C_{PL})$$

- 雙邊公差：取兩者最小值
- 單邊公差：直接使用可用值

### 3.3 長期能力指數 (Overall)

- 使用 **整體標準差** σ_overall (所有樣本的真實標準差)
- 計算公式與短期相同，但σ來源不同：
  - Pp = (USL - LSL) / 6σ_overall
  - PPU = (USL - X̄) / 3σ_overall
  - PPL = (X̄ - LSL) / 3σ_overall
  - Ppk = min(PPU, PPL)

### 3.4 計算行為與取得方式

能力指標由後端依管制界限（USL/LSL/CL）、圖型（chart_type）與樣本聚合統計即時計算，計算行為如下：

- **σ_within** 依圖型選用對應估計式（MR̄/d₂、R̄/d₂、S̄/c₄）。
- **Cp** 需雙邊公差（USL、LSL 皆有）；缺一則為 `null`（單邊）。σ_within=0 時回 0。
- **Cpk** 取 min(CPU, CPL)；單邊公差時直接取可計算的一側（USL only→CPU、LSL only→CPL）。
- Pp/Ppk 邏輯相同，但改用 σ_overall。

整合方取得能力指標的端點：

- `GET /{ccm_id}/entities/{entity_id}/samples/capability`（可帶 `category_filters`、日期區間、`merge_duplicates` 等參數；回應含每組管制界限的 Cp/Ca/CPU/CPL/Cpk/Pp/PPU/PPL/Ppk 與 sigma_within）。
- 各 `chart_limit` 資訊（含能力指標）亦隨 CCM/Entity 查詢一併回傳。

---

## 4. 推薦限制計算 (Recommended Limits)

### 4.1 反向 Capability 計算
給定目標能力指數（`target_index` 可為 `cp` / `cpk` / `pp` / `ppk`）與目標值，推算所需的 USL/LSL（以製程平均值置中）：

$$USL = μ + 3σ \times target\_value$$
$$LSL = μ - 3σ \times target\_value$$
$$CL = μ$$

- 目標為 `cp` / `cpk` 時，σ 採 **σ_within**；目標為 `pp` / `ppk` 時，σ 採 **σ_overall**。
- 置中於製程平均值可使 Ca ≈ 0，因此 Cpk ≈ Cp（Ppk ≈ Pp）。

### 4.2 取得方式

推薦界限由端點提供：

- `GET /{ccm_id}/entities/{entity_id}/samples/capability/recommended-limits`
- 查詢參數：`target_index`（`cp` / `cpk` / `pp` / `ppk`）、`target_value`，另可帶 `category_filters`、日期區間、`merge_duplicates`。
- 回應為每組管制圖設定的建議 `recommended_ucl` / `recommended_lcl` / `recommended_cl`，並回傳計算所用的製程平均值與 σ。

---

## 5. 分析工具實作邏輯 (Analysis Tool Implementation)

### 5.1 層化篩選 (Stratification)
- **機制**: 層別資訊（category_information）以 JSON 形式儲存於樣本上，後端以 MySQL JSON 查詢依指定層別鍵值過濾樣本子集後再計算。
- **使用方式**: 於樣本查詢、能力分析、匯出等端點帶入 `category_filters` 查詢參數即可取得指定層別的資料子集；可用層別值可透過 `GET /{ccm_id}/entities/{entity_id}/samples/category-values` 取得。

---

## 6. 前端狀態管理（概念）

前端採用集中式狀態管理（Zustand），將 CCM 編輯狀態與辭庫快取分層管理，供整合方理解互動模型：

- **檔案編輯狀態**: 保存目前編輯中的 CCM 基本資訊、層別資訊、管制項目清單與 Nelson Rules 設定，並追蹤「是否有未儲存變更（dirty）」；新增中的項目以暫時性負值 ID 標記，儲存後由後端換發正式 ID。
- **辭庫快取**: 產品、站台、量測單位等主資料的前端快取。
- **分析狀態**: 圖表縮放、層別過濾器等檢視狀態。
- **檔案樹狀態**: 檔案群組樹與拖放操作的暫存。

狀態與後端的資料交換一律經由 Quantitative CCM 的 REST 端點（Base Path `/private/ccm/quantitative`），詳見文件 08。

---

## 7. 樣本寫入處理機制

### 7.1 樣本新增／更新的自動處理

透過樣本端點（`POST /{ccm_id}/entities/{entity_id}/samples` 及批量寫入）新增樣本時，後端會自動執行下列處理，整合方無需自行處理：

1. **驗證抽樣設定**: 若該管制項目尚未設定抽樣設定，寫入會被拒絕。
2. **數值格式化**: 依抽樣設定的小數位數（num_of_digits）將樣本值格式化後儲存。
3. **序號 (idx) 自動遞增**: 在同一管制項目內依既有最大序號自動 +1，整合方送出樣本時不需帶 idx。
4. **欄位繼承**: 自所屬 CCM 複製 `category_information`、`part_number`、`batch_number`（層別資訊可於樣本層以 override 部分覆寫）。

樣本寫入後，即依 §2 的 Nelson Rules 邏輯進行異常偵測，命中則建立樣本警報並觸發通知。

---

## 8. 樣本資料計算屬性

### 8.1 樣本層級統計
每個 `QuantitativeCCMEntitySample` 有以下計算屬性：

| 屬性 | 公式 | 說明 |
| :--- | :--- | :--- |
| `total_value` | Σxᵢ | 樣本總和 |
| `mean_value` | Σxᵢ/n | 子組平均值 |
| `range_value` | max - min | 子組全距 |
| `std_dev` | √(Σ(xᵢ-x̄)²/(n-1)) | 子組標準差 |
| `mr_value` | \|xᵢ - xᵢ₋₁\| | 移動極差 (n=1時) |

### 8.2 Entity 層級聚合
每個 `QuantitativeCCMEntity` 有以下聚合屬性：

| 屬性 | 公式 | 用途 |
| :--- | :--- | :--- |
| `samples_mean_avg` | X̄ of means | X̄ 圖中心線 |
| `samples_range_avg` | R̄ | R 圖中心線 |
| `samples_std_dev_avg` | S̄ | S 圖中心線 |
| `samples_mr_avg` | MR̄ | MR 圖中心線 |
| `samples_overall_mean` | X̄ of all | Ca 計算 |
| `samples_overall_std_dev` | σ overall | Pp/Ppk 計算 |
