# AI Video API Endpoints 文檔

本文檔整理了 AI Video 模組中使用的所有 API endpoints，按功能模組分類。

## 基本配置

- **Base URL**: 從 `gethealtechConfig()` 獲取
- **認證方式**: X-ADMIN-TOKEN: "admin"

---

## 1. FishAudio - 文字轉語音

### 1.1 提交文字轉語音任務

```http
POST /root/fishaudio/full_tts?text={text}&model_name={model_name}&model_description={model_description}&delete_model={delete_model}
Content-Type: multipart/form-data

audio_file: File
```

**說明**: 提交文字轉語音任務，需上傳音頻參考文件

### 1.2 獲取任務狀態

```http
GET /root/fishaudio/full_tts/status/{taskId}
```

**說明**: 檢查文字轉語音任務的處理狀態

### 1.3 獲取語音結果

```http
GET /root/fishaudio/full_tts/result/{taskId}
```

**回應**: 音頻文件 (blob)

---

## 2. ElevenLabs - 語音合成

### 2.1 創建語音模型

```http
POST /root/elevenlabs/voice/create?audio_name={audio_name}
Content-Type: multipart/form-data

audio_file: File
```

### 2.2 語音合成處理

```http
POST /root/elevenlabs/voice/full?voice_id={voice_id}
Content-Type: multipart/form-data

audio_file: File
```

### 2.3 獲取語音結果

```http
GET /root/elevenlabs/voice/full?ticket_id={taskId}
```

**回應**: 音頻文件 (blob)

---

## 3. HeyGen - AI 虛擬人視頻

### 3.1 生成虛擬人視頻

```http
POST /root/heygen/heygen_full?height={height}&width={width}
Content-Type: multipart/form-data

audio_file: File
image_file: File
```

### 3.2 獲取視頻狀態與結果

```http
GET /root/heygen/video_status/{videoId}
```

**回應**: 視頻文件 (blob) 或狀態信息

---

## 4. Hedra - AI 視頻生成

### 4.1 生成視頻

```http
POST /root/hedra/generate_video
Content-Type: multipart/form-data

audio_file: File
image_file: File
```

### 4.2 獲取視頻結果

```http
GET /root/hedra/get_video?task_id={taskId}
```

**回應**: 視頻文件 (blob) 或狀態信息

---

## 5. Hailuo - 海螺 AI 視頻

### 5.1 生成視頻

```http
POST /root/hailuo/hailuo_generate_video?text={action}
Content-Type: multipart/form-data

image: File
```

### 5.2 獲取視頻狀態

```http
GET /root/hailuo/hailuo_get_video?task_id={taskId}
```

### 5.3 獲取視頻 URL

```http
GET /root/hailuo/hailuo_get_video_url?file_id={id}
```

**回應**: 視頻文件 (blob)

---

## 6. Kling - 可靈 AI 視頻

### 6.1 生成視頻

```http
POST /root/kling/kling_generate_full
Content-Type: multipart/form-data

action: string
negative_prompt: string
aspect_ratio: string (default: "16:9")
cfg_scale: number (default: 0.5)
duration: number (default: 5)
auto_adjust_image: boolean (default: false)
image_quality: string (default: "standard")
start_image: File
```

### 6.2 獲取視頻結果

```http
GET /root/kling/get_generation_result/{jobId}
```

**回應**: 視頻文件 (blob) 或狀態信息

### 6.3 獲取任務狀態

```http
GET /root/kling/get_generation_result/{jobId}
```

**回應**: JSON 狀態信息

---

## 7. Livestream - 直播管理

### 7.1 房間管理

#### 獲取所有直播房間

```http
GET /root/lifestream/get_all_livestream_rooms?page={page}&limit={limit}
```

#### 創建直播房間

```http
POST /root/lifestream/create_livestream_room?livestream_id={livestreamId}&livestream_url={livestreamUrl}
```

#### 添加房間 URL

```http
PUT /root/lifestream/add_room_url?room_code={roomCode}&url={url}
```

#### 獲取直播房間

```http
GET /root/lifestream/get_livestream_room?room_code={roomCode}
```

#### 移除房間代碼

```http
PUT /root/lifestream/remove_room_code?id={id}
```

### 7.2 觀眾管理

#### 添加觀眾

```http
POST /root/lifestream/add_viewer?name={name}&room_code={roomCode}
```

#### 獲取觀眾資訊

```http
GET /root/lifestream/viewer/{viewerId}
```

#### 獲取房間所有觀眾

```http
GET /root/lifestream/get_room_viewers?room_code={roomCode}
```

#### 刪除觀眾

```http
DELETE /root/lifestream/delete_viewer/{viewerId}
```

### 7.3 訊息管理

#### 發送訊息

```http
POST /root/lifestream/send_message/{roomCode}?action={action}&content={content}&viewer_id={viewerId}
```

#### 獲取房間訊息

```http
GET /root/lifestream/get_messages/{roomCode}?limit={limit}
```

#### 通過 ID 獲取訊息

```http
GET /root/lifestream/get_messages_by_id/{roomId}?limit={limit}
```

#### 清理舊訊息

```http
DELETE /root/lifestream/cleanup_old_messages/{roomCode}?days={days}
```

---

## 8. Rembg - 圖片去背景

### 8.1 提交去背景任務

```http
POST /root/rembg/rembg_full
Content-Type: multipart/form-data

image: File
```

### 8.2 獲取去背景結果

```http
GET /root/rembg/get_rembg_result/{taskId}
```

**回應**: 處理後的圖片文件 (blob)

---

## 9. Combined - 組合功能

### 9.1 換臉換衣服去背

```http
POST /root/combined/face_outfit_swap_with_rembg?category={category}
Content-Type: multipart/form-data

face_image: File
garment_image: File
target_image: File
```

### 9.2 獲取組合處理結果

```http
GET /root/combined/get_rembg_result/{taskId}
```

**回應**: 處理後的圖片文件 (blob)

---

## 10. Pipeline - 完整處理流程

### 10.1 頭髮換臉換衣服去背 Pipeline

```http
POST /root/combined/pipeline_with_hair_face_outfit_rembg?category={category}&rembg={rembg}
Content-Type: multipart/form-data

face_image: File
garment_image: File  
target_image: File
```

### 10.2 獲取 Pipeline 狀態

```http
GET /root/combined/pipeline_with_hair_face_outfit_rembg/{ticketId}/status
```

**回應**: JSON 包含 status、result、message 等

---

## 狀態碼說明

### 通用狀態

- `processing` / `waiting` / `IN_PROGRESS` / `Processing` / `starting` - 處理中
- `completed` / `Success` / `COMPLETED` - 完成
- `failed` / `Failed` / `FAILED` - 失敗

### 平台特定狀態

- **HeyGen**: `waiting`, `completed`, `failed`
- **Hedra**: `IN_PROGRESS`, `COMPLETED`, `FAILED`  
- **Hailuo**: `Processing`, `Success`, `Failed`
- **Kling**: `processing`, `completed`, `failed`
- **Combined**: `starting`, `completed`, `failed`
- **Rembg**: `processing`, `completed`, `failed`

---

## 輪詢配置

所有需要輪詢的 API 都使用統一的 `POLLING_CONFIG.INTERVAL` 間隔時間進行狀態檢查，直到任務完成或失敗。

## 錯誤處理

- 所有 API 都包含適當的錯誤處理
- 404 錯誤會轉換為更友善的錯誤訊息
- 支援自動重試機制（部分 API）
