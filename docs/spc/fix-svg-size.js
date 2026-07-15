#!/usr/bin/env node
// fix-svg-size.js —— 修正 mermaid 內嵌 SVG 的尺寸。
// 問題:mermaid 產的 SVG 帶 width="100%",<img> 會被撐到容器寬度再按比例放大,
//       使小圖被灌大到近整頁、吃掉版面。
// 解法:把每張 data:image/svg+xml 的 width="100%" 換成 viewBox 的實際 px 寬高,
//       讓圖以「原生大小」呈現;CSS 的 max-width/max-height 只在超出頁面時才縮小。
// 用法:node fix-svg-size.js <html 檔>
const fs = require("fs");
const file = process.argv[2];
if (!file) { console.error("用法: node fix-svg-size.js <html>"); process.exit(1); }

let html = fs.readFileSync(file, "utf8");
let fixed = 0;

html = html.replace(/data:image\/svg\+xml;base64,([A-Za-z0-9+/=]+)/g, (m, b64) => {
  let svg = Buffer.from(b64, "base64").toString("utf8");
  const vb = svg.match(/viewBox="[\d.\-]+ [\d.\-]+ ([\d.]+) ([\d.]+)"/);
  if (!vb) return m;
  const w = Math.round(parseFloat(vb[1]));
  const h = Math.round(parseFloat(vb[2]));
  // 移除 style 內的 max-width(會與我們的 CSS 打架),並把 width="100%" 換成實際 px + 補 height
  svg = svg.replace(/(<svg[^>]*?)\swidth="100%"/, `$1 width="${w}" height="${h}"`);
  svg = svg.replace(/max-width:\s*[\d.]+px;?/g, "");
  fixed++;
  return "data:image/svg+xml;base64," + Buffer.from(svg, "utf8").toString("base64");
});

fs.writeFileSync(file, html);
console.log(`已修正 ${fixed} 張 SVG 尺寸(改用原生 viewBox px)`);
