# 登入流程說明 (Login Flow)

## 概覽

社群帳號綁定支援兩種模式：

- **快速登入 (Quick Login)**
  — 只填帳號，由後端透過 GoLogin 開啟雲端瀏覽器，使用者在該瀏覽器手動登入社群平台
- **金鑰登入 (Key Login)** — 填寫帳號 + 密碼 + Secret
  Key，直接由後端代理登入（略過 GoLogin）

---

## 狀態機定義

定義於 `hooks/useSocialTendStore.js`，Zustand store 中的 `loginState`：

```
idle → queuing → ready → verifying → task_created → idle
  |       |         |        |
  |       └→ failed └→ failed  └→ failed
  └→ failed
```

| 狀態           | 意義                                    |
| -------------- | --------------------------------------- |
| `idle`         | 初始狀態，無任何登入進行中              |
| `queuing`      | 已發送登入請求，等待 GoLogin 排隊       |
| `ready`        | 雲端瀏覽器已就緒，等待使用者前往操作    |
| `verifying`    | 使用者確認完成登入，正在驗證 + 觸發爬取 |
| `task_created` | 爬取好友任務已建立                      |
| `failed`       | 任何步驟發生錯誤                        |

`loginState` 額外包含
`projectId`、`departmentId`、`timestamp`，供內建背景 MQTT 訂閱使用。

---

## 角色與檔案

| 層級         | 檔案                            | 職責                                                              |
| ------------ | ------------------------------- | ----------------------------------------------------------------- |
| UI           | `components/LoginForm.jsx`      | 登入表單、平台選擇、帳號輸入                                      |
| UI           | `components/LoginModals.jsx`    | 登入流程的各狀態 Modal 顯示                                       |
| 頁面         | `pages/SetupPage.jsx`           | 整合 hooks + 表單，編排回調；session 恢復                         |
| 編排         | `hooks/useLogin.js`             | 登入流程核心協調，孤兒帳號清理                                    |
| 驗證         | `hooks/useLoginVerification.js` | 登入驗證 + 觸發爬取                                               |
| Store + MQTT | `hooks/useSocialTendStore.js`   | Zustand 狀態儲存 + **內建背景 MQTT 訂閱管理**                     |
| API          | `hooks/useProject.js`           | TanStack Query mutations (`loginProjectAccount`, `logoutProject`) |

---

## MQTT 架構

```
┌─────────────────────────────────────────────────────┐
│  ① useMqttStore (src/store/useMqttStore.js)          │
│  全域 singleton connection + topic registry          │
│  斷線自動重連 + 恢復所有訂閱                          │
├─────────────────────────────────────────────────────┤
│  ② useSocialTendStore.js (自帶 initGologinMqtt)      │
│  模組初始化時執行一次                                  │
│  透過 Zustand subscribe 監聽 loginState.status       │
│  queuing/ready → subscribe topic                     │
│  idle/task_created/failed → unsubscribe              │
│  不受 SetupPage mount/unmount 影響                    │
│  message → 寫入 loginState + gologinSessions         │
├─────────────────────────────────────────────────────┤
│  ③ gologinSessions (useSocialTendStore 內)           │
│  跨 reset 存活的 session 持久化區域                   │
│  用於 SetupPage remount 時恢復 UI                    │
└─────────────────────────────────────────────────────┘
```

---

## 完整呼叫鏈 (Quick Login)

### Step-by-Step

```
LoginForm.jsx  (使用者點擊「從 Facebook 登入」)
  │ handleSubmit() → form.validateFields() → onLoginSubmit(formData)
  ▼
SetupPage.jsx handleLoginSubmit(formData)
  │ setIsModalOpen(true)          // 開啟 LoginModals
  │ loginState.login(formData)    // 進入 useLogin
  ▼
useLogin.js login(formData)   [Quick Login 路徑]
  │ 1. setLoginState({ platform, status: 'queuing', projectId, departmentId })
  │    → useSocialTendStore 內建背景訂閱：status='queuing' → subscribe
  │    → 不綁 component lifecycle，切分頁也活著
  │ 2. loginApi.mutateAsync({ platform, username })
  │    → ModuleSocialTendProjectsApi.loginProjectAccount()
  ▼
PUT /projects/{projectId}/login
  │
  │ [後端] 1. 建立 CyberAccount (DB)
  │        2. 將任務加入 GoLogin 排隊佇列
  │        3. 回傳 response
  │
  ▼
MQTT  social_tend/{departmentId}/{projectId}/gologin
  │   { type: 'gologin_session', status: 'ready', browser_url: '...' }
  │
  └── useSocialTendStore (initGologinMqtt) → setLoginState({ ready }) + setGologinSession()
  │
  ▼
LoginModals.jsx  顯示「前往 Facebook 登入」按鈕
  │ 使用者點擊 → window.open(browserUrl) → 雲端瀏覽器開啟
  │ 使用者在雲端瀏覽器登入 Facebook
  │ 完成後點擊「我已完成登入，開始同步好友」
  ▼
SetupPage.jsx handleConfirmComplete()
  │ verifyState.confirmAndVerify({ platform, crawlType })
  ▼
useLoginVerification.js confirmAndVerify()
  │ 1. logoutProject.mutateAsync()
  │    → PUT /projects/{projectId}/logout
  │    → [後端] 關閉 GoLogin Session
  │
  │ 2. verify({ platform, crawlType })
  │    → setLoginState({ status: 'verifying' })
  │    → crawlFriends.mutateAsync({ platform, crawl_type })
  │      → POST /projects/{projectId}/crawl-friends
  │      → [後端] 建立好友同步任務
  │    → setLoginState({ status: 'task_created' })
  │    → useSocialTendStore 內建背景訂閱偵測 → unsubscribe
  ▼
LoginModals.jsx  顯示「任務創建成功」
  │ 使用者點「關閉」
  ▼
SetupPage.jsx handleCloseModal()
  │ clearGologinSession(projectId)    // 清除 session 記錄
  │ loginState.reset()
  │ verifyState.reset()
  ▼
新手引導跳到步驟 4 (好友分類)
```

---

## 孤兒帳號清理機制

### 問題

後端 `/projects/{projectId}/login` 先寫入 CyberAccount +
SocialTendProjectAccount 到 DB（`projects.py:385-407`），然後才呼叫
`open_gologin_session()`。若 GoLogin 失敗（如 403/504），DB 已存在孤兒帳號。

### 清理時機

```
使用者點「從 Facebook 登入」
  → API 返回錯誤（403/504）
  → Modal 顯示「尚未確認到登入」
  → 使用者點「改用其他登入方式」
    → handleCloseModal 偵測 status === 'failed'
    → logoutProject.mutateAsync()       // 關閉 GoLogin session（失敗也繼續）
    → unbindAccount.mutateAsync()       // 解綁帳號（從 project.accounts 直接取）
    → DB 孤兒帳號清除，下次可乾淨重試
```

行為等同「移除帳號」，直接從已快取的 `project.accounts`
找目標帳號，不需要額外 refetch。

---

## 中斷恢復機制

### 切分頁回來

```
使用者點登入 → 切到聊天室 → SetupPage unmount
  │ useSocialTendStore 內建背景訂閱仍活著
  │
  ▼  (若 GoLogin ready)
內建 MQTT handler 收到 ready → 寫入 gologinSessions[projectId]
  │
  ▼  (使用者回來)
SetupPage remount
  → 讀 gologinSessions[projectId]
  → 有 ready/failed session 且在 5 分鐘內
  → setLoginState() + setIsModalOpen(true)
  → Modal 恢復
```

### 關分頁重開

Zustand store 消失，所有 session 遺失。無需特殊處理：

- 下次登入 API 走 `existing` 路徑（`projects.py:372`），只更新 username，不新增
- 若 GoLogin 成功，正常完成流程
- 若又失敗，DB 仍只有一筆帳號，不會累積

---

## 金鑰登入替代路徑 (Key Login)

`loginMode === 'key'` 時，`useLogin.login()` 走不同路徑：

```js
await bindAccount.mutateAsync({
  platform,
  username,
  password,
  two_factor_secret,
});
await verify({ platform, crawlType });
```

### 差異對照

| 面向            | Quick Login (連結登入)                                          | Key Login (金鑰登入)                    |
| --------------- | --------------------------------------------------------------- | --------------------------------------- |
| 需 MQTT         | 是                                                              | 否                                      |
| 需 GoLogin 排隊 | 是                                                              | 否                                      |
| 使用者操作      | 開啟雲端瀏覽器手動登入                                          | 直接填帳號密碼                          |
| API 呼叫鏈      | `loginProjectAccount` → MQTT → `logoutProject` → `crawlFriends` | `bindAccountToProject` → `crawlFriends` |

---

## 已知問題

### Issue: GoLogin 504 Gateway Timeout

**現象**：點「從 Facebook 登入」後出現錯誤。

**原因**：GoLogin API `api.gologin.com/browser/{id}/web` 回 504。

**前端處理**：

- API 失敗 → `loginState.status = 'failed'` → Modal 顯示錯誤
- 使用者點「改用其他登入方式」→ logout GoLogin session + 解綁帳號
- 若使用者重試 → API 走 `existing` 路徑更新 username

**建議後端修復**：先 call GoLogin 成功後再寫入 DB（避免孤兒帳號問題）。
