## 問題描述

管理者在「帳號管理」介面編輯**自己的帳號**時，若修改「可擁有房間數」並儲存，後端回傳 400 錯誤。

## 重現步驟

1. 以管理者身份登入
2. 進入系統設定 → 帳號管理
3. 點選自己的帳號進行編輯
4. 修改「可擁有房間數」後點擊「儲存」
5. 出現錯誤

## 實際行為

```
PATCH /private/user/chatroom_limit/take_back/{self_user_id}?limit=N
400 Bad Request
{ "detail": "Cannot modify yourself." }
```

## 預期行為

管理者應能調整自己的配額，或在介面上給予明確提示說明需由上級操作。

## 根本原因

後端 `HigherRoleRequired` dependency（`src/dependencies/basic.py:56`）明確禁止對自身操作：

```python
if current_user.id == tgt_user.id:
    raise HTTPException(400, "Cannot modify yourself.")
```

`/chatroom_limit/grant` 與 `/chatroom_limit/take_back` 兩支 API 皆受此限制。

## 討論

系統配額設計為「由上往下分配」，自己不能增加自己的配額（防止無限膨脹）。但目前沒有任何介面讓上級管理者替下級管理者調整配額（最高層管理者尤其沒有出口）。

**可能的解法（擇一）：**

1. **前端禁用欄位**：偵測 `selectedUserId === loggedInUser.id`，禁用 chatroom_limit 輸入並附上提示「請聯繫上級調整」
2. **開放 super-admin API**：新增一支不受 `HigherRoleRequired` 限制的配額調整端點，供最高權限者使用
3. **設計上級調整流程**：在 UI 中提供「申請調整配額」或由更高 role 操作的專屬入口

## 參考檔案

- `frontend/src/app/systemSettings/components/AcMgnt.js`
- `backend/src/dependencies/basic.py:56`
- `backend/src/routers/private/user/server.py:526`（take_back）
- `backend/src/routers/private/user/server.py:478`（grant）

<img width="1920" height="1037" alt="Image" src="https://github.com/user-attachments/assets/dc281843-8080-4a1f-8217-104784c5e7c6" />

<img width="1912" height="1036" alt="Image" src="https://github.com/user-attachments/assets/645e73e2-2c88-4c54-8e6c-ba24074db3be" />
