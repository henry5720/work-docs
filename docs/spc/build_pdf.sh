#!/usr/bin/env bash
#
# build_pdf.sh —— 把 SPC 對接規範合併版轉成帶「自動目錄頁碼」的 PDF。
#
# 流程:先重跑 build_hackmd.py 重新合併 01–12 + 索引,
#        再用 pandoc(xelatex 引擎)產生 PDF,--toc 會自動生成含正確頁碼的目錄。
#
# 用法:
#   ./build_pdf.sh                      # 自動挑選可用中文字型(見下方 fallback 順序)
#   CJK_FONT="Microsoft JhengHei" ./build_pdf.sh   # 指定字型(仍會驗證存在)
#
# 前置需求(一次性):
#   sudo apt install -y pandoc texlive-xetex texlive-latex-recommended \
#        texlive-latex-extra texlive-lang-cjk fonts-noto-cjk fonts-noto-cjk-extra
#
set -euo pipefail
cd "$(dirname "$0")"

# ── 可調參數 ────────────────────────────────────────────────
SRC="SPC_對接規範_完整版.md"
OUT="SPC_對接規範_完整版.pdf"
TITLE="SPC 系統對接規範(完整版)"

# 字型 fallback 順序:有設 CJK_FONT 就排最前面,再依序往下退。
# 開源優先(可內嵌、跨機一致),最後才退回 Windows 內建字型。
FONT_CANDIDATES=(
  "Noto Sans CJK TC"      # 思源黑體(apt: fonts-noto-cjk)—— 首選
  "Source Han Sans TC"    # 思源黑體 Adobe 命名(同字型不同名)
  "Noto Serif CJK TC"     # 思源宋體(明體風格)
  "Microsoft JhengHei"    # 微軟正黑體(WSL 掛載 /mnt/c/Windows/Fonts)
  "微軟正黑體"
  "AR PL UMing TW"        # texlive-lang-cjk 附帶的明體
)
# ────────────────────────────────────────────────────────────

# 0. 檢查必要工具
for bin in python3 pandoc xelatex fc-list; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "✘ 找不到 $bin。請先執行:" >&2
    echo "  sudo apt install -y pandoc texlive-xetex texlive-latex-recommended texlive-latex-extra texlive-lang-cjk fonts-noto-cjk fonts-noto-cjk-extra" >&2
    exit 1
  fi
done

# 先把所有字型 family 抓進變數(只呼叫一次 fc-list)。
# 注意:不可寫成 `fc-list | grep -q`,因 grep -q 提早關閉 pipe 會讓 fc-list 收到
# SIGPIPE,在 `set -o pipefail` 下整條 pipeline 被判失敗 → 有字型也誤判為沒有。
FONT_FAMILIES="$(fc-list -f '%{family}\n' 2>/dev/null || true)"

# 判斷某字型 family 是否存在(用 here-string 比對,不經 pipe)
font_available() { grep -qiF -- "$1" <<<"$FONT_FAMILIES"; }

# 自動挑字型:CJK_FONT(若有指定)優先,其後依 FONT_CANDIDATES 順序 fallback
RESOLVED_FONT=""
for cand in ${CJK_FONT:+"$CJK_FONT"} "${FONT_CANDIDATES[@]}"; do
  if font_available "$cand"; then RESOLVED_FONT="$cand"; break; fi
done

if [ -z "$RESOLVED_FONT" ]; then
  echo "✘ 找不到任何可用的中文字型。" >&2
  echo "  建議安裝思源黑體:sudo apt install -y fonts-noto-cjk fonts-noto-cjk-extra" >&2
  echo "  目前系統已索引的繁中字型:" >&2
  fc-list :lang=zh-tw family 2>/dev/null | sort -u | sed 's/^/     /' >&2 || echo "     (無)" >&2
  exit 1
fi

if [ -n "${CJK_FONT:-}" ] && [ "$RESOLVED_FONT" != "$CJK_FONT" ]; then
  echo "⚠  指定的字型「${CJK_FONT}」不存在,已自動 fallback 至「${RESOLVED_FONT}」。" >&2
fi

# 1. 重新合併(確保 PDF 反映最新的 01–12 內容與索引)
echo "▶ (1/3) 重新產生合併檔 ${SRC} ..."
python3 build_hackmd.py

# 1b. 預處理:移除「沒有字型覆蓋的圖形 emoji」與隱形變異選擇符(U+FE0F)。
#     ⚠ ✓ ✗ 等有字型的符號會保留;只動暫存檔,來源 .md 不變(HackMD/GitHub 仍保有 emoji)。
echo "▶ (2/3) 預處理:清掉無字型的 emoji(來源檔不動)..."
TMP_SRC=".pdf_build_tmp.md"
trap 'rm -f "${TMP_SRC}"' EXIT
perl -CSDA -pe 's/[\x{FE0F}\x{1F000}-\x{1FAFF}]//g' "${SRC}" > "${TMP_SRC}"

# 2. 轉 PDF
echo "▶ (3/3) 以 xelatex 轉出 PDF(字型:${RESOLVED_FONT})..."
pandoc "${TMP_SRC}" -o "${OUT}" \
  --from=markdown-yaml_metadata_block \
  --pdf-engine=xelatex \
  --toc --toc-depth=2 \
  --top-level-division=chapter \
  --include-in-header=pdf-header.tex \
  -V documentclass=report \
  -V CJKmainfont="${RESOLVED_FONT}" \
  -V mainfont="${RESOLVED_FONT}" \
  -V CJKmonofont="Noto Sans Mono CJK TC" \
  -V monofont="Noto Sans Mono CJK TC" \
  -V geometry:a4paper \
  -V geometry:margin=2cm \
  -V colorlinks=true \
  -V linkcolor=RoyalBlue \
  -V toccolor=black \
  --metadata title="${TITLE}"

echo "✔ 完成:${OUT}"
echo "  目錄(含各章頁碼)已由 pandoc --toc 自動生成,無需手動維護。"
