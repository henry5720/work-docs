# 04 詳細設計文件 (DDD)

## 1. 統計判異算法 (Nelson Rules)
系統自動檢測 8 種尼爾森法則異常模式，判定邏輯如下：
- **Rule 1**：點位超出 3σ。
- **Rule 2**：連續 9 點落在中心線同一側。
- **Rule 3**：連續 6 點呈現上升或下降趨勢。
- (其餘規則參閱源碼 `src/database/models/quant_ccm.py` 第 931 行)

## 2. 統計係數計算
- **Subgroup Size (n)**：直接影響 $d_2$ 與 $c_4$ 常數選用。
- **計算公式**：
  - $\sigma_{\text{within}} = \bar{R} / d_2$
  - $\sigma_{\text{overall}} = \text{Stdev}(x)$
