# 03 系統設計文件 (SDD)

## 1. 系統架構圖
本系統採用微服務架構，利用 FastAPI 作為 Web Server，MySQL 8.3 存儲持久化資料，Redis 7.0 處理任務狀態。

## 2. 背景任務架構 (Async Task)
- **佇列管理**：使用 FastAPI BackgroundTasks 處理耗時任務。
- **狀態儲存**：
  - Key: `all_in_one_task:{tenant_id}:{task_id}`
  - TTL: 86400 Seconds (24 Hours)

## 3. 安全性設計
- **傳輸加密**：HTTPS TLS 1.2+。
- **權限控制**：基於 JWT 之 RBAC 權限管理系統。
