# 文件目錄說明

## 📁 目錄結構

```
docs/
├── README.md                    # 本文件 - 目錄結構說明
├── api-services/               # API 服務相關文件
│   ├── skin-analyze.md         # 皮膚分析 API 詳細說明
│   └── assets/                 # API 服務資源文件
│       ├── basic/             # basic 版本圖片
│       ├── advanced/          # advanced 版本圖片  
│       ├── pro/               # pro 版本圖片
│       └── *.png              # 其他 API 相關圖片
└── ai-systems/                 # AI 系統分析文件
    ├── ai-digital-human-analysis.md  # AI數字人系統功能分析報告
    └── assets/                 # AI 系統資源文件
        └── ai-digital-human/   # AI數字人相關資源
```

## 📝 文件說明

### API 服務文件
- **skin-analyze.md**: 完整的皮膚分析 API 使用說明，包含價格、功能介紹、檢查項目和參數說明
- **assets/**: 皮膚分析 API 相關的所有圖片資源，分類存放

### AI 系統分析
- **ai-digital-human-analysis.md**: AI數字人系統功能分析報告，包含需求概述、樂觀分析、批判分析和整合分析
- **assets/**: AI 系統相關的圖片資源，按系統分類

## 🚀 使用方式

從專案根目錄的 [README.md](../README.md) 開始，透過連結導向到各個具體的文件。

## 📋 分散式架構優勢

### 🔧 模組化設計
- 每個功能類別擁有獨立的資源目錄
- 文件與資源緊密關聯，便於維護

### 👥 團隊協作友善
- 不同模組可由不同團隊成員負責
- 避免資源文件衝突

### 🗂️ 易於管理
- 新增/刪除功能時，可整個目錄移動
- 資源路徑簡潔（相對路徑 `./assets/`）

## 📋 未來擴展

這個分散式結構設計為高度可擴展的：
- `api-services/` 目錄可以新增更多 API 服務，每個服務有自己的 assets
- `ai-systems/` 目錄可以新增更多 AI 系統分析，每個系統有自己的 assets
- 每個新功能都自帶完整的文件和資源結構 