# 巡田水專案導航邏輯 (Navigation Logic)

本文件說明 `socialTend` 模組中，側邊欄專案切換與頁面引導的判定邏輯。

## 核心設計原則

系統採用 **數據驅動 (Data-Driven)**
的導航決策。當使用者在側邊欄切換專案時，系統會即時檢查該專案的實體數據狀態（帳號、好友數、任務進度），以決定最適合的落腳頁面。

## 判定矩陣

| 帳號 (Accounts) | 好友數 (Friends) | 同步任務狀態 (Crawl Task) | 導向頁面             | 狀態說明                               |
| :-------------- | :--------------- | :------------------------ | :------------------- | :------------------------------------- |
| 未連結          | 0                | 無                        | `SetupPage` (Step 2) | 初始狀態，需引導登入                   |
| 已連結          | 0                | **執行中 (Running)**      | `SetupPage` (Step 3) | 正在進行首批同步，顯示 Loading         |
| 已連結          | 0                | **已完成/失敗/無任務**    | `OverviewPage`       | 同步結束但無好友，允許進入主程式並提示 |
| 已連結          | > 0              | 不論狀態                  | `OverviewPage`       | 正常狀態，直接進入總覽                 |

## 特殊場景處理

### 1. Settings 頁面切換

若使用者目前正在某專案的「設定 (`SettingsPage`)」頁面，且切換到的目標專案已滿足進入
`OverviewPage` 的條件（即上述矩陣的後兩項），則系統會保持在 `SettingsPage`
並切換專案 ID，而非跳回 `OverviewPage`。

### 2. 「零好友」死循環防護

早期設計僅檢查
`friends.total > 0`，這會導致帳號若真的沒有好友，使用者會永遠被卡在
`SetupPage`。目前的邏輯增加了「任務狀態檢查」：

- 如果任務已結束 (Completed/Failed) 但好友數仍為 0，系統會認定「同步已盡力」，允許使用者進入
  `OverviewPage`。
- 在 `OverviewPage` 中，若偵測到好友數為 0，會顯示橫幅提示使用者檢查帳號。

## 實作位置

- **跳轉邏輯中心**：`frontend/src/app/modules/socialTend/components/Sidebar.jsx`
  中的 `setSelectedProject` 函式。
- **資料獲取方式**：透過 `queryClient.fetchQuery` 並複用 `hooks/` 導出的
  `fetchFriends` 與 `fetchTaskGroups` 純函式，確保與各頁面共用快取。
- **提示顯示**：`frontend/src/app/modules/socialTend/pages/OverviewPage.jsx`。
- **任務檢查 Hook**：`frontend/src/app/modules/socialTend/hooks/useSyncTracking.js`。
