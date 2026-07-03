#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
將 00 索引 + 01–12 SPC 對接規範文件合併為單一頁面（供 HackMD 等使用）。
最小改動原則：
- 內容原封不動，不改標題層級、不加 [TOC]
- 00_Index 的 table 保留為開頭手動目錄
- 唯一的加工：把跨檔連結 ./NN_xxx.md 改成頁內錨點 #doc-NN，
  並在每章第一個 H1 尾端補 {#doc-NN} 作為錨點目標
來源更新後重跑本腳本即可重生。
"""
import re
import pathlib

SRC = pathlib.Path(__file__).parent
OUT = SRC / "SPC_對接規範_完整版.md"

PREFIXES = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]

def find_file(prefix):
    matches = sorted(SRC.glob(f"{prefix}_*.md"))
    if not matches:
        raise FileNotFoundError(f"找不到 {prefix}_*.md")
    return matches[0]

# 連結替換：
#  ](./NN_xxx.md#anchor) -> ](#anchor)   （保留原有細部錨點）
#  ](./NN_xxx.md)        -> ](#doc-NN)    （指向該章）
LINK_WITH_ANCHOR = re.compile(r"\]\(\.?/?([0-9]{2})_[^)#]+\.md(#[^)]+)\)")
LINK_PLAIN = re.compile(r"\]\(\.?/?([0-9]{2})_[^)#]+\.md\)")

def fix_links(text):
    text = LINK_WITH_ANCHOR.sub(lambda m: f"]({m.group(2)})", text)
    text = LINK_PLAIN.sub(lambda m: f"](#doc-{m.group(1)})", text)
    return text

def process(prefix):
    """回傳章節內容：內容不變，僅在第一個 H1 尾端加 {#doc-NN} 錨點。"""
    lines = find_file(prefix).read_text(encoding="utf-8").splitlines()
    in_fence = False
    tagged = False
    out = []
    for line in lines:
        if re.match(r"^\s*```", line):
            in_fence = not in_fence
        elif not in_fence and not tagged and re.match(r"^#\s", line):
            line = f"{line.rstrip()} {{#doc-{prefix}}}"
            tagged = True
        out.append(line)
    return "\n".join(out).rstrip() + "\n"

def main():
    index = find_file("00") if list(SRC.glob("00_*.md")) else None
    parts = []
    if index:
        parts.append(fix_links(index.read_text(encoding="utf-8")).rstrip() + "\n")
    for prefix in PREFIXES:
        parts.append(fix_links(process(prefix)))
    OUT.write_text("\n".join(parts), encoding="utf-8")
    print(f"已產生：{OUT.name}（{len(OUT.read_text(encoding='utf-8').splitlines())} 行）")

if __name__ == "__main__":
    main()
