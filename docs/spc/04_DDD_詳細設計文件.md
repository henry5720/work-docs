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

## 2. 分析工具實作邏輯 (Analysis Tool Implementation)

### 2.1 層化篩選 (Stratification SQL)
- **邏輯**: 利用 MySQL 8.0 `JSON_TABLE` 或 `JSON_EXTRACT` 提取 `category_information`。
- **範例**: `SELECT samples FROM quant_ccm_entity_samples WHERE JSON_UNQUOTE(category_information->'$.machine') = 'M01'`。

### 2.2 趨勢檢測預警 (Trend Logic)
- **檢測窗口**: 取最後 50 點。
- **演算法**: 計算標準差的斜率。若 $\Delta \sigma / \Delta t > \text{threshold}$，則在 UI 的分析工具欄位觸發「變異擴大警告」。

---

## 3. 前端 Zustand Store 結構 (Frontend Slices)
為了應對複雜的辭庫與分析功能，Store 採模組化設計：
- **`MasterDataSlice`**: 管理產品、站台、單位等快取數據。
- **`AnalysisSlice`**: 管理圖表縮放、層化過濾器狀態。
- **`FileTreeSlice`**: 管理檔案群組樹狀結構與 Drag-and-Drop 緩衝。

---

## 4. 辭庫關聯實作細節
- **檔案群組與 CCM 關聯**: 
    - 採用中間表 `CCM_Group_Association`。
    - 支援「一個計畫屬於多個群組」的虛擬分類邏輯。
- **檢驗標準關聯**: 
    - 資料庫欄位 `standard_meta` (JSON)，儲存文件 ID、頁碼與對應的規格描述。
