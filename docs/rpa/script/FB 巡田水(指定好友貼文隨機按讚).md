# FB 巡田水(指定好友貼文隨機按讚)

模擬真實使用者行為，邊滑個人貼文邊隨機決定是否按讚。

---

## 參數一覽

### 使用者可填參數

| 參數 | 必填 | 預設值 | 範圍 | 說明 |
|------|------|--------|------|------|
| `url` | ✓ | - | - | Facebook profile URL |
| `randomLikeRate` | ✗ | `0.5` | 0~1 | 每篇貼文按讚機率（0=不按, 1=必按） |
| `minScrolls` | ✗ | 隨機 1~5 | 1~50 | 至少滾動幾輪才允許停止 |
| `stopChance` | ✗ | 隨機 0.1~0.8 | 0~1 | 每輪停止機率（0=不停止, 1=必停止） |

### 內部參數（不給使用者填）

| 參數 | 值 | 說明 |
|------|-----|------|
| `scrollRounds` | `16` | 安全機制：最多滾 16 輪 |
| `delayMs` | 隨機 2000~6000 | 每次按讚後的延遲（ms） |

---

## 執行流程

```
開始
  │
  ├─ 解析參數
  │
  ├─ for each profileUrl:
  │   │
  │   ├─ 導航到 profile 頁面
  │   │
  │   ├─ for round = 0 to 16:
  │   │   │
  │   │   ├─ 1. 找讚按鈕
  │   │   │   └─ 沒有讚按鈕 → 停止
  │   │   │
  │   │   ├─ 2. 按讚（依 randomLikeRate 機率）
  │   │   │
  │   │   ├─ 3. 停止檢查
  │   │   │   └─ round >= minScrolls 且 Math.random() < stopChance → 停止
  │   │   │
  │   │   └─ 4. 滾動一次
  │   │
  │   └─ 結束
  │
  └─ 輸出 summary
```

---

## 停止條件

滿足任一即停止：

| 條件 | 說明 |
|------|------|
| 頁面沒有讚按鈕 | Facebook 無限滾動到底了 |
| round >= minScrolls 且隨機停止 | 模擬使用者離開 |
| scrollRounds 用完 | 安全機制（16 輪） |
| isRunning() 回傳 false | 使用者按停止 |

---

## 範例場景

### 場景 A：高按讚率

| 參數 | 值 |
|------|-----|
| randomLikeRate | 0.8 |
| minScrolls | 3 |
| stopChance | 0.2 |

```
Round 1: 找 3 個讚 → 點 2 個 → 停止檢查：false
Round 2: 找 2 個讚 → 點 1 個 → 停止檢查：false
Round 3: 找 4 個讚 → 點 3 個 → 停止檢查：false
Round 4: 找 3 個讚 → 點 2 個 → 停止檢查：true（觸發停止）
結果：4 輪，按 8 個讚
```

### 場景 B：低按讚率

| 參數 | 值 |
|------|-----|
| randomLikeRate | 0.1 |
| minScrolls | 2 |
| stopChance | 0.4 |

```
Round 1: 找 2 個讚 → 點 0 個 → 停止檢查：false
Round 2: 找 3 個讚 → 點 0 個 → 停止檢查：false
Round 3: 找 2 個讚 → 點 0 個 → 停止檢查：true（觸發停止）
結果：3 輪，按 0 個讚
```

---

## 輸出（summary）

```javascript
{
  totalProfiles: 1,
  totalCandidates: 36,     // 總共掃描到幾個讚按鈕
  totalLiked: 2,           // 實際按了幾個讚
  totalAlreadyLiked: 0,
  errors: 0,
  profiles: [{
    profileUrl: "https://...",
    candidates: 36,
    liked: 2,
    alreadyLiked: 0,
    errors: []
  }]
}
```

---

## Log 範例

```
Start. profiles=1, likeRate=0.5, minScrolls=3, stopChance=0.35
Open profile: https://www.facebook.com/profile.php?id=...
Round 1/17, buttons=3, clickable=3, clicked=2, liked=2
Liked [1]
Liked [2]
Round 2/17, buttons=5, clickable=3, clicked=1, liked=3
Liked [3]
Round 3/17, buttons=4, clickable=2, clicked=1, liked=4
Liked [4]
Decided to stop.
Done. candidates=12, liked=4, alreadyLiked=0, errors=0
```

---

## 使用方式

```javascript
// 最簡單：只填 URL，其他全部隨機
run(chromeInstance, { 
    url: 'https://...'
}, fns, isRunning)

// 部分自訂
run(chromeInstance, { 
    url: 'https://...',
    randomLikeRate: 0.3
}, fns, isRunning)

// 全部自訂
run(chromeInstance, { 
    url: 'https://...',
    randomLikeRate: 0.3,
    minScrolls: 3,
    stopChance: 0.5
}, fns, isRunning)
```

---

## 技術細節

### 讚按鈕偵測

使用 `aria-label` 屬性偵測讚按鈕：
- 匹配：`Like`、`讚`、`赞`
- 排除已按讚：`Unlike`、`Remove Like`、`Liked`、`已說讚`、`已讚`、`已赞`、`取消讚`、`收回讚`
- 驗證 action bar：必須在貼文互動列內（有 Like + Comment + Share 按鈕）

### 按讚邏輯

```javascript
// 每篇貼文獨立決定
if (Math.random() < randomLikeRate) {
    // 點擊讚按鈕
}
```

### 停止邏輯

```javascript
// 每輪結束檢查
if (round >= minScrolls && Math.random() < stopChance) {
    // 停止
}
```

---

## 注意事項

1. **低按讚率**（如 0.1）會導致需要更多輪才能按到讚
2. **低停止機率**（如 0.1）會導致腳本運行較久
3. **minScrolls=1** 表示第一次滾動後就可能停止
4. 腳本會在 profile 頁面上直接按讚，不需要導航到個別貼文
