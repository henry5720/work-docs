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

# 判斷某字型 family 是否已被 fontconfig 索引到
font_available() { fc-list -f '%{family}\n' 2>/dev/null | grep -qiF -- "$1"; }

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
echo "▶ (1/2) 重新產生合併檔 ${SRC} ..."
python3 build_hackmd.py

# 2. 轉 PDF
echo "▶ (2/2) 以 xelatex 轉出 PDF(字型:${RESOLVED_FONT})..."
pandoc "${SRC}" -o "${OUT}" \
  --pdf-engine=xelatex \
  --toc --toc-depth=2 \
  --top-level-division=chapter \
  -V documentclass=report \
  -V CJKmainfont="${RESOLVED_FONT}" \
  -V mainfont="${RESOLVED_FONT}" \
  -V geometry:a4paper \
  -V geometry:margin=2cm \
  -V colorlinks=true \
  -V linkcolor=RoyalBlue \
  -V toccolor=black \
  --metadata title="${TITLE}"

echo "✔ 完成:${OUT}"
echo "  目錄(含各章頁碼)已由 pandoc --toc 自動生成,無需手動維護。"
