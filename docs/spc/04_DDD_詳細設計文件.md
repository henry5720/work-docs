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
| 規則欄位 | 格式 | 範例 |
| :--- | :--- | :--- |
| `nelson_rules_1` | `N` | `1` → 1點超出 3σ |
| `nelson_rules_2` | `N,side` | `9,both` → 9點在同側 |
| `nelson_rules_3` | `N,side` | `6,upper` → 6點上升 |
| `nelson_rules_4` | `N` | `14` → 14點交替 |
| `nelson_rules_5` | `M,N` | `2,3` → 3點中2點超出 2σ |
| `nelson_rules_6` | `M,N` | `4,5` → 5點中4點超出 1σ |
| `nelson_rules_7` | `N` | `15` → 15點在 1σ 內 |
| `nelson_rules_8` | `N` | `8` → 8點在 1σ 外 |

### 2.3 偵測函數實作

```python
# Rule 1: 檢查 N 點是否超出 3σ
def _check_nelson_rule_1(values: List[float], mean: float, sigma: float, n: int) -> bool:
    if len(values) < n or sigma == 0:
        return False
    last_n = values[-n:]
    upper_limit = mean + 3 * sigma
    lower_limit = mean - 3 * sigma
    violations = sum(1 for v in last_n if v > upper_limit or v < lower_limit)
    return violations >= n

# Rule 2: 檢查 N 點是否在均值同側
def _check_nelson_rule_2(values: List[float], mean: float, n: int, side: str) -> bool:
    if len(values) < n:
        return False
    last_n = values[-n:]
    if side == "upper":
        return all(v > mean for v in last_n)
    elif side == "lower":
        return all(v < mean for v in last_n)
    else:  # both
        return all(v > mean for v in last_n) or all(v < mean for v in last_n)

# Rule 3: 檢查 N 點是否持續上升/下降
def _check_nelson_rule_3(values: List[float], n: int, side: str) -> bool:
    if len(values) < n:
        return False
    last_n = values[-n:]
    increasing = all(last_n[i] < last_n[i+1] for i in range(n-1))
    decreasing = all(last_n[i] > last_n[i+1] for i in range(n-1))
    if side == "upper":
        return increasing
    elif side == "lower":
        return decreasing
    else:
        return increasing or decreasing

# Rule 4: 檢查 N 點是否交替
def _check_nelson_rule_4(values: List[float], n: int) -> bool:
    if len(values) < n:
        return False
    last_n = values[-n:]
    for i in range(n - 2):
        diff1 = last_n[i+1] - last_n[i]
        diff2 = last_n[i+2] - last_n[i+1]
        if diff1 * diff2 >= 0:
            return False
    return True

# Rule 5: M/N 點超出 2σ
def _check_nelson_rule_5(values: List[float], mean: float, sigma: float, m: int, n: int) -> bool:
    if len(values) < n or sigma == 0:
        return False
    last_n = values[-n:]
    upper_2sigma = mean + 2 * sigma
    lower_2sigma = mean - 2 * sigma
    above_count = sum(1 for v in last_n if v > upper_2sigma)
    below_count = sum(1 for v in last_n if v < lower_2sigma)
    return above_count >= m or below_count >= m

# Rule 6: M/N 點超出 1σ
def _check_nelson_rule_6(values: List[float], mean: float, sigma: float, m: int, n: int) -> bool:
    if len(values) < n or sigma == 0:
        return False
    last_n = values[-n:]
    upper_1sigma = mean + sigma
    lower_1sigma = mean - sigma
    above_count = sum(1 for v in last_n if v > upper_1sigma)
    below_count = sum(1 for v in last_n if v < lower_1sigma)
    return above_count >= m or below_count >= m

# Rule 7: N 點在 1σ 內 (層化)
def _check_nelson_rule_7(values: List[float], mean: float, sigma: float, n: int) -> bool:
    if len(values) < n or sigma == 0:
        return False
    last_n = values[-n:]
    upper_1sigma = mean + sigma
    lower_1sigma = mean - sigma
    return all(lower_1sigma <= v <= upper_1sigma for v in last_n)

# Rule 8: N 點在 1σ 外 (混合)
def _check_nelson_rule_8(values: List[float], mean: float, sigma: float, n: int) -> bool:
    if len(values) < n or sigma == 0:
        return False
    last_n = values[-n:]
    upper_1sigma = mean + sigma
    lower_1sigma = mean - sigma
    all_outside = all(v > upper_1sigma or v < lower_1sigma for v in last_n)
    if not all_outside:
        return False
    has_above = any(v > upper_1sigma for v in last_n)
    has_below = any(v < lower_1sigma for v in last_n)
    return has_above and has_below
```

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
$$C_a = frac{X̄ - M}{(USL - LSL) / 2}$$
其中 $M = (USL + LSL) / 2$ (規格中心)

- 正值表示製程偏向上限
- 負值表示製程偏向下限

#### CPU (Upper Process Capability Index)
$$C_{PU} = frac{USL - X̄}{3\sigma_{within}}$$

- 用於單邊上限公差 (USL only)

#### CPL (Lower Process Capability Index)
$$C_{PL} = frac{X̄ - LSL}{3\sigma_{within}}$$

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

### 3.4 後端計算實現

```python
@property
def sigma_within(self) -> float:
    """根據 chart_type 計算 within-subgroup sigma"""
    chart_setting = self._get_chart_setting()
    chart_type = chart_setting.chart_type
    n = chart_setting.subgroup_size

    if chart_type == "x_bar_mr":
        mr_avg = entity.samples_mr_avg
        return mr_avg / get_d2(2)
    elif chart_type == "x_bar_r":
        range_avg = entity.samples_range_avg
        return range_avg / get_d2(n)
    elif chart_type == "x_bar_s":
        std_dev_avg = entity.samples_std_dev_avg
        return std_dev_avg / get_c4(n)

@property
def cp(self) -> float | None:
    """Cp = (USL - LSL) / 6σ"""
    if self.ucl is None or self.lcl is None:
        return None  # 單邊公差
    sigma = self.sigma_within
    if sigma == 0:
        return 0.0
    return (self.ucl - self.lcl) / (6 * sigma)

@property
def cpk(self) -> float | None:
    """Cpk = min(CPU, CPL)"""
    cpu = self.cpu  # 自動處理單邊公差
    cpl = self.cpl
    if cpu is None and cpl is None:
        return None
    if cpu is None:
        return cpl
    if cpl is None:
        return cpu
    return min(cpu, cpl)
```

---

## 4. 推薦限制計算 (Recommended Limits)

### 4.1 反向 Capability 計算
給定目標 Cpk 值，推算所需的 USL/LSL：

$$USL = X̄ + 3σ \times Cpk$$
$$LSL = X̄ - 3σ \times Cpk$$

### 4.2 後端實現

```python
def compute_recommended_limits(
    target_cpk: float,
    current_mean: float,
    sigma: float,
    is_upper_only: bool = False,
    is_lower_only: bool = False
) -> dict:
    """根據目標 Cpk 計算推薦的 USL/LSL"""
    if is_upper_only:
        limits = {
            "ucl": current_mean + 3 * sigma * target_cpk,
            "lcl": None,
            "cl": current_mean
        }
    elif is_lower_only:
        limits = {
            "ucl": None,
            "lcl": current_mean - 3 * sigma * target_cpk,
            "cl": current_mean
        }
    else:
        limits = {
            "ucl": current_mean + 3 * sigma * target_cpk,
            "lcl": current_mean - 3 * sigma * target_cpk,
            "cl": current_mean
        }
    return limits
```

---

## 5. 分析工具實作邏輯 (Analysis Tool Implementation)

### 5.1 層化篩選 (Stratification SQL)
- **邏輯**: 利用 MySQL 8.0 `JSON_TABLE` 或 `JSON_EXTRACT` 提取 `category_information`。
- **範例**: `SELECT samples FROM quant_ccm_entity_samples WHERE JSON_UNQUOTE(category_information->'$.machine') = 'M01'`。

### 5.2 趨勢檢測預警 (Trend Logic)
- **檢測窗口**: 取最後 50 點。
- **演算法**: 計算標準差的斜率。若 $\Delta \sigma / \Delta t > \text{threshold}$，則在 UI 的分析工具欄位觸發「變異擴大警告」。

---

## 6. 前端 Zustand Store 結構 (Frontend Slices)

### 6.1 useFileStore 詳解
**路徑**: `stores/useFileStore.js`

```javascript
const useFileStore = create((set, get) => ({
  // === 狀態 ===
  settings: {
    id: null,
    name: '',
    part_number: '',
    batch_number: '',
    spec: '',
    station: '',
    category_information: {},
    controlItems: [],  // 管制項目陣列
    testRuleConfig: {} // Nelson Rules 設定
  },
  selectedControlItemId: null,
  isDirty: false,
  nextTempId: -1,

  // === 動作 ===
  setFileBasicInfo: (info) => set((state) => ({
    settings: { ...state.settings, ...info }
  })),

  addControlItem: (name) => set((state) => ({
    settings: {
      ...state.settings,
      controlItems: [
        ...state.settings.controlItems,
        { id: state.nextTempId, name, ... }
      ]
    },
    nextTempId: state.nextTempId - 1
  })),

  updateControlItem: (id, updates) => set((state) => ({
    settings: {
      ...state.settings,
      controlItems: state.settings.controlItems.map(item =>
        item.id === id ? { ...item, ...updates } : item
      )
    }
  })),

  deleteControlItem: (id) => set((state) => ({
    settings: {
      ...state.settings,
      controlItems: state.settings.controlItems.filter(item => item.id !== id)
    }
  })),

  reorderControlItems: (fromIndex, toIndex) => set((state) => {
    const items = [...state.settings.controlItems];
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    return { settings: { ...state.settings, controlItems: items } };
  }),

  setCategories: (dimensions) => set((state) => ({
    settings: {
      ...state.settings,
      category_information: dimensions
    }
  })),

  setSelectedControlItemId: (id) => set({ selectedControlItemId: id }),

  reset: () => set({
    settings: { ... },
    selectedControlItemId: null,
    isDirty: false
  }),

  loadFileDataToStore: async (fileId) => {
    // 從 API 載入資料
    const data = await fetch(`/private/ccm/quantitative/ccm/${fileId}`);
    set({ settings: data, isDirty: false });
  }
}));
```

### 6.2 Store 模組化設計
- **`MasterDataSlice`**: 管理產品、站台、單位等快取數據。
- **`AnalysisSlice`**: 管理圖表縮放、層化過濾器狀態。
- **`FileTreeSlice`**: 管理檔案群組樹狀結構與 Drag-and-Drop 緩衝。

---

## 7. 辭庫關聯實作細節

### 7.1 檔案群組與 CCM 關聯
- 採用中間表 `CCM_Group_Association`。
- 支援「一個計畫屬於多個群組」的虛擬分類邏輯。

### 7.2 檢驗標準關聯
- 資料庫欄位 `standard_meta` (JSON)，儲存文件 ID、頁碼與對應的規格描述。

### 7.3 取樣資料 Event Listener

```python
@event.listens_for(QuantitativeCCMEntitySample, "before_insert")
def _set_sample_idx_and_validate(mapper, connection, target):
    """
    1. 驗證抽樣設定是否存在
    2. 按 num_of_digits 格式化樣本
    3. 自動遞增 idx
    4. 從 CCM 複製 category_information, part_number, batch_number
    """
    # 格式化樣本
    num_of_digits = sampling_result[0]
    raw_values = [float(s.strip()) for s in target.samples.split(",")]
    formatted_values = [f"{v:.{num_of_digits}f}" for v in raw_values]
    target.samples = ",".join(formatted_values)

    # 自動遞增 idx
    max_idx = connection.execute(
        select(Max(QuantitativeCCMEntitySample.idx))
        .where(QuantitativeCCMEntitySample.quant_ccm_entity_id == entity_id)
    ).scalar()
    target.idx = 0 if max_idx is None else max_idx + 1

    # 複製 category_information
    target.category_information = merged_category_info
    target.part_number = ccm_part_number
    target.batch_number = ccm_batch_number
```

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
