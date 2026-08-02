# Herdr 通知聲配置

這份文件記錄 Herdr 在一般 Linux PC 與 Android / Termux PRoot 環境中的通知聲配置。

## 配置摘要

| 環境 | 建議播放方式 | 說明 |
| --- | --- | --- |
| Linux PC | 正式的 `paplay` | 使用 PulseAudio，或透過 `pipewire-pulse` 相容層播放 |
| Linux PC 備案 | `pw-play`、`mpg123`、`ffplay`、`mpv` | Herdr 會自動嘗試可用的播放器 |
| Android / Termux PRoot | 自製 `paplay` 轉接器 | 將音檔交給 Android 的 `termux-media-player` |

Herdr 0.7.5 在 Linux 依序嘗試以下 MP3 播放器：

```text
paplay -> pw-play -> ffplay -> mpg123 -> mpv
```

PC 與 Android 雖然都使用名為 `paplay` 的命令，但實作不同：

- Linux PC 使用 PulseAudio 提供的正式 `paplay`。
- Android 使用自製相容腳本，內部呼叫 `termux-media-player`。

## Herdr 設定

Herdr 預設會播放通知聲。若要明確啟用，可在 `~/.config/herdr/config.toml` 加入：

```toml
[ui.sound]
enabled = true
```

也可以指定自己的 MP3：

```toml
[ui.sound]
enabled = true
path = "sounds/notification.mp3"
done_path = "sounds/done.mp3"
request_path = "sounds/request.mp3"
```

自訂音效必須是 MP3。相對路徑會從 `config.toml` 所在目錄解析。

修改設定後重新載入：

```bash
herdr server reload-config
```

## Linux PC：使用正式 paplay

Ubuntu / Debian 安裝：

```bash
sudo apt install pulseaudio-utils
```

確認命令存在：

```bash
command -v paplay
```

使用 PipeWire 的 Linux 通常可透過 `pipewire-pulse` 相容層繼續使用 `paplay`，不代表一定要另外啟動傳統 PulseAudio daemon。

測試 Herdr 通知聲：

```bash
herdr notification show "Herdr sound test" --sound done
```

### Linux PC 備案

如果不使用 `paplay`，可選擇 Herdr 支援的其他播放器：

```bash
# 簡單的 MP3 播放器
sudo apt install mpg123

# 檢查目前有哪些播放器
command -v pw-play
command -v ffplay
command -v mpg123
command -v mpv
```

只需其中一個可正常播放 MP3，不需要全部安裝。

## Android：使用 termux-media-player

### 前置條件

Android 端需要：

- Termux。
- Termux:API App，且必須和 Termux 來自相同來源並使用相容簽章。
- Termux 的 `termux-api` 套件。

在 Termux 主環境安裝：

```bash
pkg install termux-api
```

確認 Android 播放介面可用：

```bash
termux-media-player help
```

### 為什麼不能直接使用 mpg123

PRoot 裡的 `mpg123` 可以解碼 MP3，但仍需可用的 ALSA、PulseAudio 或 PipeWire 音訊輸出。只有設定 `PULSE_SERVER=127.0.0.1`，卻沒有真正運行 PulseAudio server 時，Herdr 會在 15 秒後播放逾時。

Android 原生方案不建立 PulseAudio TCP server，而是讓 Herdr 呼叫一個 `paplay` 相容腳本，再由 `termux-media-player` 交給 Android 播放。

### 建立 paplay 轉接器

在 PRoot Ubuntu 內建立 `~/.local/bin/paplay`：

```sh
#!/bin/sh
set -eu

source_file=""
for arg in "$@"; do
    case "$arg" in
        -*) ;;
        *) source_file="$arg" ;;
    esac
done

if [ -z "$source_file" ] || [ ! -f "$source_file" ]; then
    echo "paplay: audio file not found: ${source_file:-<missing>}" >&2
    exit 1
fi

cache_dir="/data/data/com.termux/files/home/.cache/herdr-audio"
target="$cache_dir/notification.mp3"
temporary="$target.$$"

mkdir -p "$cache_dir"
trap 'rm -f "$temporary"' EXIT HUP INT TERM
cp "$source_file" "$temporary"
mv "$temporary" "$target"
trap - EXIT HUP INT TERM

exec /data/data/com.termux/files/usr/bin/termux-media-player play "$target"
```

設定執行權限：

```bash
chmod 755 ~/.local/bin/paplay
```

確認 Herdr 會先找到轉接器：

```bash
command -v paplay
```

預期結果：

```text
/root/.local/bin/paplay
```

### 為什麼要複製音檔

Herdr 的內建通知聲可能位於 PRoot 的暫存目錄。Android 的 Termux:API service 無法直接解析 PRoot 內部路徑，因此腳本先把 MP3 複製到雙方都能存取的 Termux 目錄：

```text
/data/data/com.termux/files/home/.cache/herdr-audio/notification.mp3
```

直接把 `termux-media-player` 改名或連結成 `paplay` 並不完整，因為它無法處理這個路徑差異。

### Android 驗證

從 Herdr 觸發通知：

```bash
herdr notification show "Herdr Android sound test" --sound done
```

立即確認 Android 播放狀態：

```bash
termux-media-player info
```

正常播放時會看到類似結果：

```text
Status: Playing
Track: notification.mp3
Current Position: 00:00 / 00:01
```

這個方案使用 Android 的媒體音量，不是鈴聲或通知音量。

## 故障排除

### no mp3-capable audio player available

Herdr 找不到支援的播放器。先檢查：

```bash
command -v paplay
command -v pw-play
command -v mpg123
```

Android 預期應找到 `~/.local/bin/paplay`。如果 Herdr 在建立腳本前已啟動，重新啟動 Herdr client，讓它取得最新的 `PATH`。

### mpg123 playback timed out after 15s

`mpg123` 已存在，但找不到可用的音訊輸出。在 Android PRoot 環境中應確認 Herdr 已改用 `paplay` 轉接器，而不是繼續嘗試 `mpg123`。

```bash
command -v paplay
herdr notification show "sound test" --sound request
```

### Android 顯示 No track currently

通知聲通常只有一秒左右，查詢時可能已播放完畢。重新觸發後立刻查詢：

```bash
herdr notification show "sound test" --sound done
sleep 0.2
termux-media-player info
```

### Android 仍然沒有聲音

依序確認：

1. Android 媒體音量不是靜音。
2. Termux:API App 已安裝，且與 Termux 簽章相容。
3. `termux-media-player` 可單獨播放 MP3。
4. Android 沒有透過電池管理停止 Termux 或 Termux:API。
5. `HERDR_DISABLE_SOUND` 環境變數未設定。

檢查 Herdr 日誌：

```bash
less ~/.config/herdr/herdr-client.log
```

## PulseAudio 替代方案

Android 也可以在 Termux 主環境安裝 PulseAudio，並開放僅限 localhost 的 TCP 模組給 PRoot 使用：

```bash
pkg install pulseaudio
pulseaudio --start \
  --load="module-native-protocol-tcp auth-ip-acl=127.0.0.1 auth-anonymous=1" \
  --exit-idle-time=-1
```

PRoot 內再設定：

```bash
export PULSE_SERVER=127.0.0.1
```

這個方案相容更多 Linux 音訊程式，但需要常駐音訊服務。若只有 Herdr 通知聲，`termux-media-player` 轉接器較簡單，也不需要開 TCP 音訊介面。

## 參考資料

- [Herdr Configuration：Sound](https://herdr.dev/docs/configuration/#sound)
- [Termux API package](https://github.com/termux/termux-api-package)
- [Termux PulseAudio package definition](https://github.com/termux/termux-packages/blob/master/packages/pulseaudio/build.sh)
