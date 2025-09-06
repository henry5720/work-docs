# 🔐 權限系統總覽

> **現代化權限系統架構與 API 規範**

## 🎯 系統架構概覽

TeamSync 權限系統採用**三層架構設計**：

1. **系統層**：基於角色的系統權限 (Role-Based Access Control)
2. **功能層**：基於功能模組的業務權限 (Feature-Based Permissions)
3. **前端層**：現代化權限檢查 Hook 系統

---

## 🏢 系統層權限

### 系統角色說明 (role_id)

```js
const SYSTEM_ROLES = {
  VIRTUAL_DEPT_MANAGER: -2, // 虛擬部門管理者
  TESTER: -1, // 測試員
  GENERAL_EMPLOYEE: 0, // 一般員工
  SENIOR_EMPLOYEE: 1, // 資深員工
  JUNIOR_MANAGER: 2, // 初階管理者
  MIDDLE_MANAGER: 3, // 中階管理者
  SENIOR_MANAGER: 4, // 高階管理者
};
```

### 系統角色: 當前使用者資訊.role_id (/private/user/me)

- response

```json
{
  "role_id": 4,
  "role_name": "高階管理者",
  "id": "cf3a37eb-e946-4b6a-be81-6bc7ff1fdae7",
  "created_at": "2024-06-29 07:53:16",
  "expired_at": "2216-02-24 07:53:15",
  "photo_url": "https://d3trftidj54e2o.cloudfront.net/Image_User/cf3a37eb-e946-4b6a-be81-6bc7ff1fdae7_1739677071",
  "enabled": true,
  "is_verified": true,
  "username": "admin",
  "email": "test1@example.com",
  "nickname": "0.0",
  "department_id": "23520568-9832-4aed-91f2-916050723672",
  "department_name": "__DEFAULT__",
  "company_id": "858c6f14-54fd-47bb-a169-1ec686f4a02e",
  "company_name": "__TEST_COMPANY__",
  "chatroom_limit": 332,
  "created_rooms": [
    "02008b20-1cb1-4c63-9978-bc7c5763326a",
    "0ca39404-f492-4b05-9c4d-e7a51d64f4f7"
  ],
  "joined_rooms": [
    "02008b20-1cb1-4c63-9978-bc7c5763326a",
    "09c83c8d-b79f-4032-8c7d-93e51293314a"
  ],
  "collected_rooms": [
    "945842c5-3d57-45ba-9f80-26e5cdb520e7",
    "9aa7da4f-5533-4459-8add-1b8a6a713ebd"
  ]
}
```

---

## 🎯 功能層權限 (ex. 聊天室)

### 特定功能角色說明

#### 聊天室功能角色

- **房主** (Creator): 創建聊天室的用戶
- **房間管理員** (Manager): 可操作房間設定、標籤管理，以及第三方紀錄的設定與回覆訊息
- **社群訊息負責人員** (Social Manager): 可操作第三方紀錄的設定與回覆訊息

### 🏠 房主權限判定

**判定條件**: `房間資訊.creator_id === 當前使用者資訊.id`

**API 端點**: `/private/chatrooms/{chatroom_id}`

**範例 Response**:

```json
{
  "id": "9aa7da4f-5533-4459-8add-1b8a6a713ebd",
  "created_at": "2025-07-07 02:19:16",
  "department": {
    "id": "23520568-9832-4aed-91f2-916050723672",
    "name": "__DEFAULT__"
  },
  "group_id": "7da6cb54-34ed-47d2-88ce-7bd4f7f3cc19",
  "group": "test",
  "name": "測試 －0820",
  "bot_name": "AI 助理",
  "photo_url": "https://d3trftidj54e2o.cloudfront.net/Image_ChatRoom/9aa7da4f-5533-4459-8add-1b8a6a713ebd_1757064586",
  "creator_id": "cf3a37eb-e946-4b6a-be81-6bc7ff1fdae7",
  "creator_nickname": "0.0",
  "is_public": true,
  "is_deleted": false,
  "instructions": "當使用者問借款時，向使用者搜集以下資訊：姓名、電話、生日。\n當資料搜集完成時，要向使用者詢問『請問資料是否正確？』",
  "num_of_members": 8,
  "num_of_templates": 0,
  "embeddings": "openai/text-embedding-3-large/3072",
  "shared_department": [
    {
      "id": "0e37fd4c-d665-495d-a043-d07947484e10",
      "name": "TEST"
    }
  ],
  "layout_template": "legacy"
}
```

### 👨‍💼 房間管理員

**API 端點**: `/private/chatrooms/{chatroom_id}/managers`

**範例 Response**:

```json
{
  "role_id": 0,
  "role_name": "一般員工",
  "id": "bdd1aa24-a0d5-43a2-a096-9e67172f8ac6",
  "nickname": "Henry860104",
  "department_id": "0e37fd4c-d665-495d-a043-d07947484e10",
  "department_name": "TEST",
  "company_id": "858c6f14-54fd-47bb-a169-1ec686f4a02e",
  "company_name": "__TEST_COMPANY__"
}
```

### 🌐 社群訊息負責人員

**API 端點**: `/private/chatrooms/{chatroom_id}/social_media_managers`

**範例 Response**:

```json
{
  "role_id": 0,
  "role_name": "一般員工",
  "id": "bdd1aa24-a0d5-43a2-a096-9e67172f8ac6",
  "nickname": "Henry860104",
  "department_id": "0e37fd4c-d665-495d-a043-d07947484e10",
  "department_name": "TEST",
  "company_id": "858c6f14-54fd-47bb-a169-1ec686f4a02e",
  "company_name": "__TEST_COMPANY__"
}
```

---

## ⚡ 前端權限系統

### 🎯 現代化權限 Hook 系統

我們已經實現了現代化的權限檢查系統，位於 `frontend/src/app/permissions/`：

#### 📁 系統架構

```
permissions/
├── README.md              # 📖 完整使用指南
├── ARCHITECTURE.md        # 🏗️ 架構說明
├── index.js              # 🎯 統一匯出
├── core/                 # 🔧 核心邏輯
│   ├── constants.js      #   ├── 系統角色常數
│   └── PermissionChecker.js #   └── 權限檢查核心
├── modules/              # 📦 權限模組
│   ├── index.js         #   ├── 模組註冊中心
│   ├── chatroom.js      #   ├── 聊天室權限模組
│   └── system.js        #   └── 系統權限模組
└── hooks/               # 🎣 React Hooks
    ├── usePermissions.js #   ├── 通用權限 Hook
    ├── useChatroomPermissions.js # ├── 聊天室專用
    └── useSystemPermissions.js   # └── 系統專用
```

#### ✨ 特色功能

- **🎯 點號語法**: `permissions.chatroom.room.ai.send`
- **⚡ 高性能**: Proxy + 智能快取機制
- **🔧 模組化**: 完全可擴展的模組系統
- **📝 TypeScript**: 完整類型安全支援
- **🎨 語義化**: 權限名稱直接對應功能

#### 🚀 快速使用範例

```javascript
import { useChatroomPermissions } from "app/permissions";

const ChatComponent = ({ room, managers, socialManagers }) => {
  const permissions = useChatroomPermissions({
    room,
    managers,
    socialManagers,
  });

  return (
    <div>
      {/* 💬 聊天室權限 */}
      {permissions.chatroom.room.ai.send && <AISendButton />}
      {permissions.boundRoom.manage && <BoundRoomSettings />}

      {/* ⚙️ 設定權限 */}
      {permissions.chattings.room.edit && <EditSettings />}
      {permissions.chattings.bot.config && <BotConfig />}
    </div>
  );
};
```

---

## 🎯 權限結構

### 角色權限等級

| 等級   | 角色名稱       | 權限範圍              |
| ------ | -------------- | --------------------- |
| **4**  | 高階管理者     | 完整系統管理權限      |
| **3**  | 中階管理者     | 系統管理 + 聊天室管理 |
| **2**  | 初階管理者     | 基礎聊天室管理        |
| **1**  | 資深員工       | 進階聊天功能          |
| **0**  | 一般員工       | 基本聊天功能          |
| **-1** | 測試員         | 測試權限              |
| **-2** | 虛擬部門管理者 | 特殊部門權限          |

### 🏠 聊天室權限 (`chatroom.*`)

#### 💬 一般聊天室 (`chatroom.room.normal`)

| 權限                          | 說明             | 適用角色                     |
| ----------------------------- | ---------------- | ---------------------------- |
| `chatroom.room.normal.view`   | 查看一般聊天室   | 所有成員                     |
| `chatroom.room.normal.send`   | 發送一般訊息     | 有權限的成員                 |
| `chatroom.room.normal.delete` | 刪除一般訊息     | 房主、系統管理員             |
| `chatroom.room.normal.export` | 匯出一般對話紀錄 | 房主、系統管理員、房間管理員 |

#### 🤖 AI 聊天室 (`chatroom.room.ai`)

| 權限                      | 說明             | 適用角色                     |
| ------------------------- | ---------------- | ---------------------------- |
| `chatroom.room.ai.view`   | 查看 AI 聊天室   | 所有成員                     |
| `chatroom.room.ai.send`   | 發送 AI 訊息     | 有權限的成員                 |
| `chatroom.room.ai.delete` | 刪除 AI 訊息     | 房主、系統管理員             |
| `chatroom.room.ai.export` | 匯出 AI 對話紀錄 | 房主、系統管理員、房間管理員 |

#### 👤 1 對 1 聊天室 (`agentRoom`)

| 權限               | 說明                 | 適用角色                     |
| ------------------ | -------------------- | ---------------------------- |
| `agentRoom.view`   | 查看 1 對 1 聊天室   | 所有成員                     |
| `agentRoom.send`   | 發送 1 對 1 訊息     | 有權限的成員                 |
| `agentRoom.delete` | 刪除 1 對 1 訊息     | 房主、系統管理員             |
| `agentRoom.export` | 匯出 1 對 1 對話紀錄 | 房主、系統管理員、房間管理員 |

#### 🔗 第三方紀錄聊天室 (`boundRoom`)

| 權限               | 說明               | 適用角色                                 |
| ------------------ | ------------------ | ---------------------------------------- |
| `boundRoom.view`   | 查看第三方紀錄     | 有權限的成員                             |
| `boundRoom.send`   | 發送第三方訊息     | 房主、系統管理員、房間管理員、社群管理員 |
| `boundRoom.manage` | 管理第三方整合     | 房主、系統管理員、房間管理員、社群管理員 |
| `boundRoom.export` | 匯出第三方對話紀錄 | 房主、系統管理員、房間管理員、社群管理員 |

### ⚙️ 聊天室設定權限 (`chattings.*`)

#### 🏠 基本房間設定 (`chattings.room`)

| 權限                   | 說明                            | 適用角色                     |
| ---------------------- | ------------------------------- | ---------------------------- |
| `chattings.room.view`  | 查看房間基本設定                | 所有成員                     |
| `chattings.room.edit`  | 編輯基本設定 (名稱、頭像、描述) | 房主、系統管理員、房間管理員 |
| `chattings.room.admin` | 管理功能 (刪除、轉移房主)       | 房主、系統管理員、房間管理員 |
| `chattings.room.leave` | 離開房間                        | 所有人                       |

#### 🤖 機器人設定 (`chattings.bot`)

| 權限                   | 說明                          | 適用角色                     |
| ---------------------- | ----------------------------- | ---------------------------- |
| `chattings.bot.view`   | 查看機器人設定                | 所有成員                     |
| `chattings.bot.config` | 配置機器人 (名稱、模型、指令) | 房主、系統管理員、房間管理員 |

#### 🌐 社群設定 (`chattings.social`)

| 權限                        | 說明         | 適用角色                     |
| --------------------------- | ------------ | ---------------------------- |
| `chattings.social.view`     | 查看社群設定 | 有權限的成員                 |
| `chattings.social.config`   | 社群整合設定 | 房主、系統管理員、房間管理員 |
| `chattings.social.welcome`  | 歡迎詞設定   | 房主、系統管理員、房間管理員 |
| `chattings.social.transfer` | 轉真人設定   | 房主、系統管理員、房間管理員 |

### ⚙️ 系統權限 (`system.*`)

| 權限             | 說明     | 適用角色   |
| ---------------- | -------- | ---------- |
| `system.users`   | 用戶管理 | 系統管理員 |
| `system.company` | 公司設定 | 高階管理者 |
