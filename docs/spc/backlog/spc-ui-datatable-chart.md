# SPC 前端 UI Backlog — DataTable / 圖表配色

> 建立日期:2026-07-17
> 來源:樣本頁 / 分析頁 DataTable + 管制圖高亮/配色調整過程中衍生的待辦。
> 用途:給後續 agent 直接接手的工作清單 + context。**不是正式規格**,是 working backlog。

---

## Context(需要的路徑)

### 前端(worktree:`feat/spc-update-v2`)
Repo root:`/home/henry/.herdr/worktrees/teamsync-frontend/worktree-1`(檔案在 `frontend/` 底下)

- SPC 模組:`frontend/src/app/modules/spc`
- 設定頁:`.../pages/files/measurement-value/settings`
- 樣本頁:`.../pages/files/measurement-value/samples`
- 分析頁:`.../pages/analysis`
- 匯入設定:`.../pages/files/measurement-value/import-presets`
- 匯入 v2:`.../pages/files/measurement-value/import-v2`
- Tailwind config:`frontend/tailwind.config.ts`
- Design tokens:`frontend/src/styles/design-tokens.json`(legacy)、`frontend/src/styles/update-design-tokens.json`(新 semantic + green scale)

關鍵元件:
- SPC DataTable(pivot table 包裝):`frontend/src/app/modules/spc/components/DataTable/`
  - 高亮/欄定義邏輯:`hooks/useSPCPivotTable.js`
  - 表格渲染:`components/DataTableContent.jsx`
- 共用表格:`frontend/src/components/ScComponents/table/ScTable.tsx`
- 共用按鈕:`frontend/src/components/ScComponents/`(ScButton,primary 用 `!bg-day-color-button-primary-bg-default` → `#43bf8e`)
- 管制圖 config builder:`frontend/src/app/modules/spc/utils/chartConfigBuilders/controlChart.js`
- 管制圖元件:`frontend/src/app/modules/spc/components/ControlChart.jsx`、樣本頁 `.../samples/components/ControlCharts.jsx`、分析頁 `.../analysis/components/DatasetBlock.jsx` / `ControlChartsSection.jsx`

### 後端
- `/home/henry/code/spc-backend`(R chart 界線計算相關,見待辦 #3)

---

## 已完成(本 branch)
- `419858ba4` fix(spc):表格 + 圖表高亮對齊 design system
  - 表格:hover → `gray-300`、selected → `bg-primary`(legacy primary `#addeac`,待辦 #2 可能要改)、移除 magic `yellow-100`
  - 表格:ConfigProvider 關掉 Ant 整列 row-hover 灰(`rowHoverBg: transparent`),只留整欄高亮
  - 圖表:選取點 gold `#FFD700` → 綠
- `266dc412a` refactor(spc):圖表配色集中成 `CHART_THEME`(behavior-preserving)
- `44d4a8a42` style(spc):圖表點改實心 fill
- `058e5ec91` fix(spc):圖表點實心 + 選取放大(shape / size 走 **encode channel** + `scale.size` identity;`style.r`/`style.size` 皆無效)。一般 size 4 / 選取 6。新增 G2 筆記:`frontend/src/app/modules/spc/docs/control-chart-g2v5-styling.md`
- `eace4353c` refactor(spc):移除條件/介電材質/生產單位輸入,對齊後端 export/v2 規則
  - 後端 export/v2 報表只讀 `manufacturing_information.equipment`;condition 格印計畫名、section 格印站別,這三欄使用者填值本就不上報表 → 移除設定頁/確認頁/樣本頁的顯示與輸入,只留量測設備。**後端零改動**,舊資料保留於 JSON。
  - 順帶最小整理:設定頁 + 樣本頁把「量測設備 + 量測單位」併排,解樣本頁單格孤兒卡。
  - ADR `0003`(accepted,已實作)、ADR `0004`(proposed,跨頁分組統一排程中,見待辦 #7)。

---

## 待辦

### 1.(部分完成)管制圖配色重構:集中成一個 `CHART_THEME` config
- ✅ **集中已完成**(`266dc412a`):所有 raw hex 收進 `controlChart.js` 檔頂的 `CHART_THEME`,之後改配色只動這一處。
- ⏳ **配色語意重設計(未做,綁 #2 品牌綠一起)**:
  - **A(推薦)語意分層**:data=品牌色、selected=品牌綠、超線=紅;界線(USL/LSL/管制/警示)一律**低飽和**,靠**線型(實線/虛線/點線)+ 深淺**區分嚴重度,不用不同色相搶戲。
  - **B**:顏色沿用、換成 design-token 對應值、統一飽和度。
- ⏳ **選取點顏色 green≈blue 對比不足**:目前 selected 用 `#209d14`,跟一般點藍 `#1890FF` 太近。待 #2 品牌綠拍板後改成對比夠的綠(如 `green-500 #2b9e75`)。

### 1b.(中)hover 白 stroke — G2 內建互動
圖表點 hover 時多一圈白 stroke,是 G2 v5 內建 `elementHighlight` 的 `active` state 預設(見 G2 筆記文件 #4)。待決定:
- **A** 保留(hover 有回饋、無害)
- **B** 改成品牌色淡 halo(對齊 design system)
- **C** 關掉 `interaction: { elementHighlight: false }`

### 2.(高)品牌綠 design token 收斂 — **兩套綠並存**
repo 有兩套綠,`bg-primary` 指向 legacy,semantic 層指向新 green scale。

- **Legacy `primary`**(`design-tokens.json`):`#addeac`(light/DEFAULT)、`#67be5f`(500)、`#209d14`(600) — 偏黃萊姆綠
- **新 `green` scale + semantic**(`update-design-tokens.json`):`#2b9e75`(green-500 = `text.brand-primary`)、`#43bf8e`(green-450 = `button.primary.bg-default`)、`green-50 #effaf5`、`green-100 #d7f4e4` — emerald 綠
- **證據**:ScButton primary 實際吃 `!bg-day-color-button-primary-bg-default` = **`#43bf8e`**(新 green 系)。semantic 層的 brand/button 全指向新 green,沒有指回 legacy。
- **傾向**:認新 `green` scale 為唯一品牌;角色分層 —— 淡底 `green-50/100`、強調/互動 `green-450/500`、深/文字 `green-600+`。
- **⚠️ 待釐清(見待辦 #5)**:這個「兩套並存」可能只是**本 branch 過舊**的假象;main/dev 或 `origin/auto-update-design-tokens` 可能已收斂。要先確認再動手,否則白改。
- 決定後建議寫成 **ADR**(兩套 token 並存、為何選其一)。

### 3.(中)R Chart 幾乎整排紅點
`controlChart.js` 的 `isOutOfRange` 因 R chart 的 USL/CL/LSL 都是 `0.00`,判定每點都超線 → 全套 `#F00`。屬**資料/界線計算**問題,非純配色。需查前端界線傳入 or 後端 `spc-backend` R chart 界線計算。

### 4.(低)貝茲曲線 — **建議不要**
問過「線要不要跟後端一樣用貝茲曲線」。結論:**維持直線**(`smooth: false`)。管制圖是離散樣本,貝茲會畫出不存在的內插值 + overshoot 過衝,可能視覺上假裝碰到管制界線,SPC 判異語境下是誤導。此項可直接結案為「不做」。

### 5.(已釐清)Branch 策略 — 兩套綠**不是** branch 過舊造成
**假設推翻**(subagent 查證,2026-07-17):兩套綠 token 在 `origin/main` / `origin/dev` / 本 branch 上**逐位元組相同**,`git diff` 三方對 `design-tokens.json` / `update-design-tokens.json` / `tailwind.config.ts` 全部為空。沒有任何 branch 曾刪除或收斂 legacy 檔(`--diff-filter=D` 全空)。兩個 token 檔都在 merge-base `fe523299`(2026-06-30)之前就進來的共同歷史。

- 分歧:本 branch 落後 `origin/main` 304、落後 `origin/dev` 716;領先各 143。fork 自 main/dev 共同點 `fe523299`,約 17 天前。
- **結論**:更新 / merge / 重開 branch **都無法**讓兩套綠消失 —— 這是**跨 branch 都要做的 net-new 工作**。
- **建議做法**:
  - token 收斂當成**獨立、專門的 change**,從**最新 `dev` 開新 branch** 做(它是跨全站的改動,影響所有用 `bg-primary` 的地方,不該混在 SPC UI branch)。
  - 本 branch 目前用的 `bg-primary`(#addeac)跟現行 codebase 一致,**不需為此立即回工**;等收斂決定拍板後,SPC 這幾處值再一起對齊。
  - 因為沒有 branch 動過 token 檔,同步 `dev` 進來在 token/tailwind 上**不會衝突**;落後 716 個 commit,單純為降低整體 drift 仍值得更新,但這跟顏色問題無關。

### 6.(低)issue #2 原始題:資料少時 DataTable 欄寬很怪
`ScTable.tsx:195` `tableLayout:'auto'` + `DataTableContent.jsx` `scroll={{x:'max-content'}}`,sample 欄無 width,純內容撐開 → 資料少時欄擠左、右邊留白。
- 方向 A:每欄給 `minWidth`(80–100px),最小改動。
- 方向 B:欄數少時拿掉 `max-content`、讓表格 width 100% 平均分配(條件式 layout,較複雜)。
- 未定要走哪個,取決於使用者在意「欄太窄」還是「沒撐滿容器」。

### 7.(中)跨頁資訊分組統一 — ADR 0004(proposed,排程中)
設定頁(編輯)與樣本頁(唯讀)各自排版同一批 entity 資訊,只有 `ChartLimitBlock` 是「title + 可收合」區塊。決議**統一「分組語意」而非「呈現元件」**:抽一份共用 group schema(組別/標題/含哪些欄位),兩頁共用;呈現層各自貼合用途;收合只用於次要/量大區塊(界線、警示),基本資訊常駐不收合。
- 設計與被否決方案(全面統一 / 最小整理):`frontend/src/app/modules/spc/docs/adr/0004-unify-info-grouping-settings-samples.md`
- 本次已先做**最小整理(甲案)**:量測設備+量測單位併排(已隨 `eace4353c` 出);完整統一(抽 schema + 兩頁重排)另開票。

### 8.(低)legacy 匯入頁 `import/ImportPage.jsx` 死 code 清理
舊 `/import` 路由仍註冊(`FilesPage.jsx:105`、`index.js:62` 標題 metadata),但**全 app 無任何導航入口**,使用者從 UI 進不去;現行只用 import-v2。舊頁 `ImportPage.jsx:286-289` 仍會把 Excel「條件/介電材質/生產單位」帶進 `manufacturing_information` —— 是**不會被執行的 dead code**。
- 決定:**先不動(甲案)** — 清整頁需自己的驗證,不混進欄位移除工作。
- 若清:刪 `import/` 目錄 + `FilesPage.jsx` 的 route/import + `index.js:62` metadata,單獨 commit + 驗證。
- import-v2 本身**不帶**這三欄(`import-v2/` 目錄 + `useImportV2.js` 對三欄零引用),無需處理。

### 9.(低)雜項
- `useSPCPivotTable.js:185` 既有 lint warning:useMemo 少 `isMultiMode` 依賴(pre-existing,非本次造成)。
- 工作區有一項**未提交**的 `controlChart.js` 變更:選取點 `selectedFill`/`selectedStroke` 合併成單一 `selected: '#209d14'`(與待辦 #1 選取點色相關),待獨立 commit。
