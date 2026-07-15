#!/usr/bin/env bash
#
# build_pdf.sh —— SPC 對接規範完整版 → PDF(Paged.js pipeline)
#
# 為何用 Paged.js 而非 pandoc/xelatex:
#   本文件含 12 張 mermaid 圖 + 超寬表格。mermaid 需瀏覽器(JS)才能畫,
#   寬表需 HTML reflow。Paged.js(headless Chromium)可一次滿足:
#     ✔ mermaid 真圖表   ✔ 表格自動 reflow   ✔ 目錄章節頁碼(CSS target-counter)
#
# 流程:build_hackmd.py 合併 → 預處理 → pandoc(+mermaid-filter)轉 HTML → pagedjs-cli 分頁成 PDF
#
# 前置需求(一次性,皆免 sudo):
#   npm install -g pagedjs-cli mermaid-filter
#   並需系統有 Chrome/Chromium(本機用 /usr/bin/google-chrome)
#
set -euo pipefail
cd "$(dirname "$0")"

# ── 參數 ────────────────────────────────────────────────
SRC="SPC_對接規範_完整版.md"
TMP_MD=".pdf_build_tmp.md"
HTML="SPC_對接規範_完整版.html"
OUT="SPC_對接規範_完整版.pdf"
TITLE="SPC 系統對接規範(完整版)"
CSS="pdf-print.css"
# ────────────────────────────────────────────────────────

# 偵測 Chrome(給 puppeteer 用,避免下載自帶 chromium)
CHROME=""
for c in google-chrome google-chrome-stable chromium chromium-browser; do
  if command -v "$c" >/dev/null 2>&1; then CHROME="$(command -v "$c")"; break; fi
done
[ -z "$CHROME" ] && { echo "✘ 找不到 Chrome/Chromium。請安裝 google-chrome 或 chromium。" >&2; exit 1; }

export PUPPETEER_EXECUTABLE_PATH="$CHROME"
export MERMAID_FILTER_FORMAT="svg"

# 檢查工具
for bin in python3 pandoc mermaid-filter pagedjs-cli; do
  command -v "$bin" >/dev/null 2>&1 || {
    echo "✘ 找不到 $bin。請執行:npm install -g pagedjs-cli mermaid-filter" >&2; exit 1; }
done

# mermaid-filter 讀 cwd 的 .puppeteer.json 取得 Chrome 路徑與 --no-sandbox
cat > .puppeteer.json <<JSON
{ "executablePath": "${CHROME}", "args": ["--no-sandbox", "--disable-gpu"] }
JSON

# 1. 合併 01–12 + 索引
echo "▶ (1/4) 合併來源 → ${SRC}"
python3 build_hackmd.py >/dev/null

# 2. 預處理(只動暫存檔,來源 .md 不變):
#    將獨立成行的 --- 水平線改成 * * *。
#    原因:pandoc 遇到「pipe table 緊接 --- 分隔線」會誤把後續整章(含標題、mermaid)
#    吸進前一個表格;* * * 是等價 HR 但無此歧義。
echo "▶ (2/4) 預處理:--- → * * *(修 pandoc 表格吞章節的解析 bug)"
sed -E 's/^-{3,}[[:space:]]*$/* * */' "${SRC}" > "${TMP_MD}"
trap 'rm -f "${TMP_MD}"' EXIT

# 3. pandoc → HTML(mermaid-filter 把 12 張圖轉成內嵌 SVG;--toc 產生目錄)
echo "▶ (3/4) pandoc → HTML(含 mermaid 出圖,約 20–30 秒)"
pandoc "${TMP_MD}" \
  --filter mermaid-filter \
  -f markdown-yaml_metadata_block \
  -t html5 -s \
  --toc --toc-depth=2 \
  --metadata title="${TITLE}" \
  -c "${CSS}" \
  -o "${HTML}"

# 4. Paged.js 分頁 → PDF(target-counter 解析目錄頁碼)
echo "▶ (4/4) pagedjs-cli → PDF"
pagedjs-cli "${HTML}" -o "${OUT}" --browserArgs="--no-sandbox,--disable-gpu"

echo "✔ 完成:${OUT}"
echo "  目錄章節頁碼、mermaid 圖、表格 reflow 皆由 Paged.js 於轉檔時自動處理。"
