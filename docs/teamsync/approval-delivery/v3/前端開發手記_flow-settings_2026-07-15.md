# 前端開發手記 — 審核流程設定（flow-settings）

> 記錄日期：2026-07-15
> 撰寫：Claude Code session（供 henry 隔日接續）
> 對應規格：`資料簽核模組_開發文件_v3.0.md`、`prototype/teamsync-approval-flow-settings.html`
> 開發策略：UI-first + mock（見 module CONTEXT.md）

---

## 0. TL;DR — 明天怎麼接續（30 秒）

1. **分支**：`feat/approval-delivery/init`（所有 commit 都在這，**尚未發 PR**）
2. **切過去**：`git checkout feat/approval-delivery/init && cd frontend && npm run dev`
3. **看畫面**：登入後左側 nav「審核流程設定」→ route `/approval-delivery`
   - env 已開：`frontend/public/config.json` 的 `approval_delivery_module: true`
   - route 有 auth-gate（未登入會導去 /login）
4. **這個 surface（A 審核流程設定）已做完**（mock + 拖曳 + 還原原型版面）。
   下一步二選一見 §5。

---

## 1. 環境與分支

| 項目 | 值 |
|---|---|
| Branch | `feat/approval-delivery/init`（base: `main`） |
| 我工作的 worktree | `/home/henry/.herdr/worktrees/teamsync-frontend/worktree-2`（公司用 `/home/henry/code/teamsync-frontend/frontend` 也行，重點是切到同一 branch） |
| 模組根目錄 | `frontend/src/app/modules/approval-delivery/` |
| dev server | `npm run dev`（今天跑在 :3002，因 3000/3001 被占；每次視情況而定） |
| 依賴 | 拖曳用 **react-dnd**（repo 既有），**無**新增依賴 |

---

## 2. 本次完成了什麼

### 2.1 Commit（branch 上共 4 個，本次新增後 2 個）

| Hash | 訊息 |
|---|---|
| `822363...`(822063356) | `feat(approval-delivery): scaffold module with flow-settings UI (mock)` — 模組骨架、6 實體 types、enums、mock、CONTEXT.md |
| `dc563f...`(dc563fd6d) | `feat(approval-delivery): register module entry (env, route, navbar)` — env 開關、config.json、route、nav、README |
| `e71a1f...`(e71a1f431) | `feat(approval-delivery): build flow-settings editor (drag reorder, prototype layout)` ← **本次** |
| `e261fe...`(e261fedba) | `docs(approval-delivery): ADR 0001 — flow editor uses linear list, not React Flow` ← **本次** |

### 2.2 本次做的事（A001 / A002 審核流程設定）

- **關卡編輯器改「橫向線性鏈 + 拖曳重排」**
  - `ApprovalNode[]` 以 flex 橫向排列，關卡間用純 CSS 連接線 `NodeConnector`，尾端 `+` 加關。
  - 拖曳用 **react-dnd**（`useDrag`/`useDrop`），配方借自 `spc/DraggableItem`，
    hover 中線判斷由 **Y 軸改 X 軸**（因為是橫向）。
  - locked 流程不可拖、不可刪（A002）。
- **版面還原原型的 surface 分層**
  - 頁面殼 `flex-1` 撐滿（原本 `h-full` 在 flex 父層下會塌，導致沒占滿——已修）。
  - 頂部 toolbar 標題列 + 左「raised 灰面板」清單 + 右「white builder 面板」。
  - green 色全部改用專案 token class（`green-450/500/50/200`），不再硬寫 hex。
- **A001 行為（scaffold 時已做，本次保留）**
  - 審核者只有單一個人 → 條件鎖「單人核可」且隱藏切換；加第 2 人/群組 → 出現 OR/AND、預設 OR。
  - fallback 只有「含動態角色」的關卡才顯示（無動態則自動清空）。

---

## 3. 關鍵決策（重要，避免明天重開辯論）

1. **審核流程編輯器不用 React Flow** → 見 ADR：
   `frontend/src/app/modules/approval-delivery/docs/adr/0001-flow-editor-linear-list-not-react-flow.md`
   - 理由：資料契約是線性 `ApprovalNode[]`（附錄 A.2 + §範圍邊界「不預留平行分支」）；
     原型本身也是 flexbox + CSS 假箭頭、非 canvas；設計師 brief 明示「去技術化、不用節點工具箱」。
   - rpaWorkflow 用 React Flow 是對的（它真的會分支）；審核流程是一條龍，不同情境。
   - **重評觸發**：若未來要「平行審核／分支」，才回頭考慮 React Flow（連 `ApprovalNode[]` 也要改圖結構）。
2. **拖曳用 react-dnd，不裝 @dnd-kit**（repo 已有 react-dnd 做重排，新增即 pattern drift）。
3. **ApproverTags 維持 antd `Select`（grouped）**
   - 查過 `ScEntitySearch`/`ScUserSearchInput`：都是**單選**搜尋框，且後者綁 user/department，
     不合「個人/群組/動態角色三組多選加入」的需求；barrel 也**沒有 ScSelect**。
   - 依 Sc-first 規則（無 Sc 對應才用 antd），antd Select 就是正解；chips 已用 `ScTag`。**不用硬換**。
4. **UI 一律 ScComponents + Tailwind > antd > 自製**（CORE_RULES）；green 用 token，不寫 hex。

---

## 4. 目前狀態與驗證

- ✅ `npx tsc --noEmit`：approval-delivery 無錯誤
- ✅ `npx eslint`：module 全綠（exit 0）
- ✅ pre-commit hook（eslint --fix + prettier）通過
- ⚠️ **拖曳/版面的實際觀感尚未截圖驗證**（route auth-gate）。明天到公司**先肉眼確認這幾點**：
  1. 整頁撐滿（左灰清單面板 + 右白 builder 面板，不再浮在底色）
  2. 卡片有層次（灰 sidebar + 白 builder + node 卡片）
  3. 拖 handle 能換關卡順序、connector/`+` 正常、locked 流程唯讀

---

## 5. 未決事項 / 下一步（明天決策點）

### 5.1 先決的 domain fork（擋住 B/D）
- **「一單多明細」尚未定案**：目前 one `ApprovalRequest` = one `rowId`。
  但 `ui-brief` 提到「差旅費一筆審核單內有多項明細」→ 這會改變 `ApprovalRequest` 粒度。
  **需 PM 拍板後**才好做審核中心（B）與表格套用（D）。詳見 module `CONTEXT.md`。

### 5.2 其餘 surface（尚未做）
| 代號 | Surface | 原型 | 備註 |
|---|---|---|---|
| B001-003 | 審核中心（待我簽核/我送出的） | `teamsync-approval-center.html` | stepper+tabs+table+drawer；踩 5.1 的 fork |
| C001 | 群組標籤（系統管理下） | `teamsync-group-tags-settings.html` | 管理 table + drawer；耦合最低 |
| D001-004 | 表格套用（建表精靈 / 表格設定·審核） | `teamsync-table-approval-step.html`、`teamsync-table-settings-approval.html` | 唯一要 embed 進聊天室/建表的入口 |

### 5.3 flow-settings 本身的收尾（可選）
- 接真 API（目前全 mock，state 在 `FlowSettingsPage` 本地）→ 走 TanStack Query。
- 「套用到表格」「儲存」按鈕（原型 builder-head 有，目前 mock 未做，避免放假按鈕）。
- permission gate：等後端定 `approval_delivery` 權限 key，補回 `index.tsx` 的 TODO。
- 關卡數多時橫向捲動體驗；必要時可改直向（不影響「不用 React Flow」核心）。

### 建議下一刀
- **選項 A**：開審核中心（B）——但先跟 PM 確認 5.1「一單多明細」。
- **選項 B**：先接 flow-settings 真 API / 收尾，不開新 surface。

---

## 6. 檔案地圖（`frontend/src/app/modules/approval-delivery/`）

```
CONTEXT.md                      # 領域詞彙表（非規格），含「一單多明細」未定案標記
types.ts                        # 附錄 A 六實體 interface（已對齊開發文件）
constants/index.ts              # enums + _LABEL map（FLOW_STATUS / APPROVER_TYPE / ...）
utils/nodeRules.ts              # isSinglePersonNode / hasDynamicApprover / normalizeCondition
mocks/approvalFlows.ts          # MOCK_FLOWS / accounts / groups / dynamic
docs/adr/0001-*.md              # ADR：不用 React Flow ← 本次新增
index.tsx                       # module 走廊（內部 <Routes>，目前只掛 flow-settings）
pages/flow-settings/
  FlowSettingsPage.tsx          # 兩欄殼 + toolbar + 面板；owns flows state（mock）
components/
  FlowListSidebar.tsx           # 左 raised 面板：流程清單 + 搜尋 + 新增
  FlowEditor.tsx                # 右 white 面板：header + dotted canvas + DndProvider
  NodeCard.tsx                  # 關卡卡片：react-dnd 拖曳（X 軸）+ 審核者/條件/fallback
  NodeConnector.tsx             # 關卡間 CSS 連接線 ← 本次新增
  ApproverTags.tsx              # 審核者 chips（ScTag）+ grouped antd Select（維持）
  ConditionToggle.tsx           # OR/AND 切換（單人隱藏）
  FallbackSelect.tsx            # fallback 選項（僅動態關卡顯示）
  index.ts                      # barrel
```

外圍接線（在模組外）：
- `frontend/src/app/ams/config/envConfig.js` — `isApprovalDelivery` 開關
- `frontend/public/config.json` — `approval_delivery_module: true`
- `frontend/src/app/routes/moduleRoutes.js` — route 註冊
- `frontend/src/presentation/components/navBar/NavBar.js` — 左側 nav

---

## 7. 一句話總結
A（審核流程設定）已 UI-first 做完並 commit；下一步卡在 PM 對「一單多明細」拍板，
才好往 B（審核中心）走。細節看 §5。
