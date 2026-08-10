const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const configArgIndex = process.argv.indexOf("--config");
const configPath = configArgIndex >= 0 ? path.resolve(process.argv[configArgIndex + 1]) : path.join(root, "review-atlas.config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const manifestPath = path.resolve(path.dirname(configPath), config.manifest);
const manifestDir = path.dirname(manifestPath);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const prototypePath = path.resolve(path.dirname(configPath), config.prototype);
const prototypeSource = fs.readFileSync(prototypePath, "utf8");
const outputPath = path.resolve(path.dirname(configPath), config.output);

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function renderInline(value) {
  return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, "<code>$1</code>");
}

function renderMarkdown(markdown) {
  const output = [];
  let listType = null;
  const closeList = () => { if (listType) output.push(`</${listType}>`); listType = null; };
  markdown.trim().split(/\r?\n/).forEach((line) => {
    const text = line.trim();
    if (!text) { closeList(); return; }
    const heading = text.match(/^####\s+(.+)$/);
    const unordered = text.match(/^-\s+(.+)$/);
    const ordered = text.match(/^\d+\.\s+(.+)$/);
    if (heading) { closeList(); output.push(`<h4>${renderInline(heading[1])}</h4>`); return; }
    if (unordered || ordered) {
      const type = unordered ? "ul" : "ol";
      if (listType !== type) { closeList(); output.push(`<${type}>`); listType = type; }
      output.push(`<li>${renderInline((unordered || ordered)[1])}</li>`);
      return;
    }
    closeList();
    output.push(`<p>${renderInline(text)}</p>`);
  });
  closeList();
  return output.join("");
}

function parseSpec(markdown, source) {
  const parsed = {};
  const states = [...markdown.matchAll(/^##\s+([A-Z0-9-]+)\s+(.+)$/gm)];
  states.forEach((heading, index) => {
    const start = heading.index + heading[0].length;
    const end = states[index + 1]?.index ?? markdown.length;
    const block = markdown.slice(start, end);
    const sections = {};
    const sectionHeadings = [...block.matchAll(/^###\s+(.+)$/gm)];
    sectionHeadings.forEach((section, sectionIndex) => {
      const sectionStart = section.index + section[0].length;
      const sectionEnd = sectionHeadings[sectionIndex + 1]?.index ?? block.length;
      sections[section[1].trim()] = renderMarkdown(block.slice(sectionStart, sectionEnd));
    });
    parsed[heading[1]] = {
      id: heading[1], title: heading[2].trim(),
      summary: block.match(/^>\s+(.+)$/m)?.[1]?.trim() || "",
      source, sections
    };
  });
  return parsed;
}

const specTexts = new Map();
const specs = {};
for (const state of manifest.states) {
  if (!state.spec || specTexts.has(state.spec)) continue;
  const specPath = path.resolve(manifestDir, state.spec);
  if (!fs.existsSync(specPath)) continue;
  const text = fs.readFileSync(specPath, "utf8");
  specTexts.set(state.spec, text);
  Object.assign(specs, parseSpec(text, state.spec));
}

const flows = Array.isArray(config.flows) ? config.flows : [];
const stateById = new Map(manifest.states.map((state) => [state.id, state]));
const diagnostics = [];
const seenIds = new Set();
const allowedKinds = new Set(["page", "state", "drawer", "modal", "nested-modal"]);
for (const state of manifest.states) {
  if (!state.id || !state.name || !state.reviewState) diagnostics.push({ level: "error", id: state.id || "unknown", message: "缺少 id、name 或 reviewState" });
  if (seenIds.has(state.id)) diagnostics.push({ level: "error", id: state.id, message: "狀態 ID 重複" });
  seenIds.add(state.id);
  if (!allowedKinds.has(state.kind)) diagnostics.push({ level: "warning", id: state.id, message: `未知 kind：${state.kind}` });
  if (!prototypeSource.includes(`\"${state.reviewState}\"`)) diagnostics.push({ level: "error", id: state.id, message: `Prototype 找不到 reviewState：${state.reviewState}` });
  if (state.spec && !specs[state.id]) diagnostics.push({ level: "warning", id: state.id, message: "Manifest 已連結 spec，但 Markdown 找不到對應 ID" });
}
for (const flow of flows) {
  if (!flow.id || !flow.title) diagnostics.push({ level: "warning", id: flow.id || "unknown-flow", message: "Flow 缺少 id 或 title" });
  const nodeIds = new Set();
  for (const node of flow.nodes || []) {
    if (!node.id) diagnostics.push({ level: "warning", id: flow.id, message: "Flow node 缺少 id" });
    if (nodeIds.has(node.id)) diagnostics.push({ level: "warning", id: flow.id, message: `Flow node ID 重複：${node.id}` });
    nodeIds.add(node.id);
    if (node.type === "state" && !stateById.has(node.stateId)) diagnostics.push({ level: "warning", id: flow.id, message: `Flow 引用不存在的 state：${node.stateId}` });
  }
  for (const edge of flow.edges || []) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) diagnostics.push({ level: "warning", id: flow.id, message: `Flow edge 找不到節點：${edge.from} → ${edge.to}` });
  }
}

const hash = crypto.createHash("sha256");
hash.update(fs.readFileSync(configPath));
hash.update(fs.readFileSync(manifestPath));
hash.update(prototypeSource);
for (const text of specTexts.values()) hash.update(text);
const buildHash = hash.digest("hex").slice(0, 10);
const generatedAt = new Date().toISOString();
const groups = [...new Set(manifest.states.map((state) => state.group))];
const kinds = [...new Set(manifest.states.map((state) => state.kind))];
const prototypeHref = path.relative(path.dirname(outputPath), prototypePath).split(path.sep).join("/");

function stateUrl(state) {
  return `${prototypeHref}?${encodeURIComponent(config.stateQueryParameter)}=${encodeURIComponent(state.reviewState)}`;
}

function reviewControls(state, context) {
  return ["UI", "PM", "RD"].map((role) => `
    <label class="review-control"><span>${role}</span><select data-review-control data-context="${context}" data-state-id="${escapeHtml(state.id)}" data-role="${role}">
      <option value="pending">待確認</option><option value="approved">已確認</option><option value="issue">有問題</option><option value="na">不適用</option>
    </select></label>`).join("");
}

function card(state) {
  const spec = specs[state.id];
  const specBlock = spec ? `<div class="spec-teaser"><div><span>功能摘要</span><p>${escapeHtml(spec.summary)}</p></div><button class="icon-button spec-open" data-open-spec="${escapeHtml(state.id)}" aria-label="查看完整規格" title="查看完整規格"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.75 3.75h7.5l3 3v13.5H6.75zM14.25 3.75v3h3M9.5 11h5M9.5 14h5M9.5 17h3"></path></svg></button></div>` : "";
  return `<article class="state-card" data-state-id="${escapeHtml(state.id)}" data-group="${escapeHtml(state.group)}" data-kind="${escapeHtml(state.kind)}" data-has-spec="${spec ? "yes" : "no"}" data-search="${escapeHtml(`${state.id} ${state.name} ${state.group} ${state.entry}`.toLowerCase())}">
    <a class="preview-shell" href="${stateUrl(state)}" target="_blank" rel="noreferrer"><iframe src="${stateUrl(state)}" title="${escapeHtml(state.name)}" loading="lazy" tabindex="-1"></iframe><span class="preview-hint">開啟互動狀態 ↗</span></a>
    <div class="card-body"><div class="card-head"><div><span class="state-id">${escapeHtml(state.id)}</span><h3>${escapeHtml(state.name)}</h3></div><span class="freshness" data-freshness="${escapeHtml(state.id)}">未核對</span></div>
    <div class="meta"><span>${escapeHtml(state.group)}</span><span>${escapeHtml(state.kind)}</span>${spec ? '<span class="has-spec">有規格</span>' : ""}</div>
    <div class="entry"><strong>入口</strong><span>${escapeHtml(state.entry)}</span></div>${specBlock}
    <div class="review-grid">${reviewControls(state, "card")}</div>
    <label class="note"><span>核對備註</span><textarea data-review-note data-state-id="${escapeHtml(state.id)}" placeholder="記錄缺漏、決策或待辦…"></textarea></label></div>
  </article>`;
}

const groupSections = groups.map((group) => {
  const states = manifest.states.filter((state) => state.group === group);
  return `<section class="group-section" data-group-section="${escapeHtml(group)}"><header><div><h2>${escapeHtml(group)}</h2><span>${states.length} 個狀態</span></div></header><div class="board">${states.map(card).join("")}</div></section>`;
}).join("");

const coverageRows = manifest.states.map((state) => `<tr data-coverage-row data-state-id="${escapeHtml(state.id)}" data-group="${escapeHtml(state.group)}" data-kind="${escapeHtml(state.kind)}" data-has-spec="${specs[state.id] ? "yes" : "no"}" data-search="${escapeHtml(`${state.id} ${state.name} ${state.group} ${state.entry}`.toLowerCase())}"><td><strong>${escapeHtml(state.id)}</strong><span>${escapeHtml(state.name)}</span></td><td>${escapeHtml(state.group)}</td><td><span class="kind-tag">${escapeHtml(state.kind)}</span></td><td>${specs[state.id] ? '<span class="yes">已建立</span>' : '<span class="muted">尚未建立</span>'}</td><td><div class="table-review">${reviewControls(state, "table")}</div></td><td><span class="freshness" data-freshness="${escapeHtml(state.id)}">未核對</span></td></tr>`).join("");

const FLOW_NODE_WIDTH = 174;
const FLOW_NODE_HEIGHT = 72;

function flowNodePosition(node, index) {
  return node.position || { x: 32 + (index * 240), y: 142 };
}

function flowNodeMeta(node, state) {
  const items = [];
  if (state) items.push(state.id, state.kind);
  if (node.messageType) items.push(node.messageType);
  if (!state && !node.messageType) items.push(node.type || "note");
  return items.map((item) => `<span>${escapeHtml(item)}</span>`).join("");
}

function flowMapPrimary(node, state) {
  if (node.type === "message") return `${node.messageType || "Message"} Message`;
  if (node.type === "validation") return node.messageType || "Inline error";
  return node.label || state?.name || node.id;
}

function flowMapSecondary(node, state) {
  if (node.type === "message" || node.type === "validation") return node.title || node.label || "";
  return state?.id || node.stateId || "";
}

function flowMapNode(flow, node, index) {
  const state = node.stateId ? stateById.get(node.stateId) : null;
  const position = flowNodePosition(node, index);
  const nodeType = node.type || "note";
  return `<button class="flow-map-node ${escapeHtml(nodeType)}${index === 0 ? " active" : ""}" type="button" data-flow-node-target data-flow-id="${escapeHtml(flow.id)}" data-node-id="${escapeHtml(node.id)}" style="left:${position.x}px;top:${position.y}px">
    <span class="flow-map-stage">${escapeHtml(node.stage || nodeType)}</span>
    <strong>${escapeHtml(flowMapPrimary(node, state))}</strong>
    <span class="flow-map-subtitle">${escapeHtml(flowMapSecondary(node, state))}</span>
  </button>`;
}

function flowEdgeElements(flow) {
  const nodesById = new Map((flow.nodes || []).map((node, index) => [node.id, { node, index, position: flowNodePosition(node, index) }]));
  const paths = [];
  const labels = [];
  for (const edge of flow.edges || []) {
    const from = nodesById.get(edge.from);
    const to = nodesById.get(edge.to);
    if (!from || !to) continue;
    const startX = from.position.x + FLOW_NODE_WIDTH;
    const startY = from.position.y + FLOW_NODE_HEIGHT / 2;
    const endX = to.position.x;
    const endY = to.position.y + FLOW_NODE_HEIGHT / 2;
    const midX = startX + (endX - startX) * 0.52;
    const midY = startY + (endY - startY) * 0.52;
    paths.push(`<path d="M ${startX} ${startY} L ${endX} ${endY}" marker-end="url(#flowArrow)" />`);
    labels.push(`<span class="flow-edge-label" style="left:${Math.max(20, midX - 54)}px;top:${Math.max(10, midY - 15)}px">${escapeHtml(edge.label || "前往")}</span>`);
  }
  return { paths: paths.join(""), labels: labels.join("") };
}

function flowInspectorPanel(flow, node, index) {
  const state = node.stateId ? stateById.get(node.stateId) : null;
  const spec = state ? specs[state.id] : null;
  const nodeType = node.type || "note";
  const stateLink = state ? `<a class="button" href="${stateUrl(state)}" target="_blank" rel="noreferrer" data-prototype-link data-flow-id="${escapeHtml(flow.id)}" data-node-id="${escapeHtml(node.id)}">開啟 Prototype 狀態 ↗</a>` : "";
  const specButton = spec ? `<button class="button" data-open-spec="${escapeHtml(state.id)}">查看規格</button>` : "";
  const nodeDescription = node.description ? `<div class="flow-detail-row"><span>說明</span><p>${escapeHtml(node.description)}</p></div>` : "";
  const nodeAction = node.action ? `<div class="flow-detail-row"><span>觸發／行為</span><p>${escapeHtml(node.action)}</p></div>` : "";
  const nodeCheck = node.check ? `<div class="flow-check"><strong>核對重點</strong><span>${escapeHtml(node.check)}</span></div>` : "";
  return `<article class="flow-inspector-panel ${index === 0 ? "active" : ""}" data-flow-inspector data-flow-id="${escapeHtml(flow.id)}" data-node-id="${escapeHtml(node.id)}">
    <header>
      <span class="flow-stage">${escapeHtml(node.stage || nodeType)}</span>
      <h3>${escapeHtml(node.label || state?.name || node.id)}</h3>
      <div class="flow-node-meta">${flowNodeMeta(node, state)}</div>
    </header>
    <div class="flow-detail-body">
      ${node.title ? `<div class="flow-detail-row"><span>顯示標題</span><p>${escapeHtml(node.title)}</p></div>` : ""}
      ${state ? `<div class="flow-detail-row"><span>對應畫面</span><p>${escapeHtml(state.name)} · ${escapeHtml(state.entry)}</p></div>` : ""}
      ${nodeDescription}
      ${nodeAction}
      ${nodeCheck}
      <div class="flow-detail-actions">${stateLink}${specButton}</div>
    </div>
  </article>`;
}

function flowSection(flow, index) {
  const nodesById = new Map((flow.nodes || []).map((node) => [node.id, node]));
  const edges = flowEdgeElements(flow);
  const openQuestions = (flow.openQuestions || []).map((question) => `<li>${escapeHtml(question)}</li>`).join("");
  const mapNodes = (flow.nodes || []).map((node, nodeIndex) => flowMapNode(flow, node, nodeIndex)).join("");
  const panels = (flow.nodes || []).map((node, nodeIndex) => flowInspectorPanel(flow, node, nodeIndex)).join("");
  const positions = (flow.nodes || []).map(flowNodePosition);
  const canvasWidth = Math.max(960, ...positions.map((position) => position.x + FLOW_NODE_WIDTH + 32));
  const canvasHeight = Math.max(360, ...positions.map((position) => position.y + FLOW_NODE_HEIGHT + 32));
  const firstNode = (flow.nodes || [])[0];
  return `<section class="flow-case${index === 0 ? " active" : ""}" data-flow-case="${escapeHtml(flow.id)}">
    <div class="flow-intro">
      <div><span class="flow-owner">${escapeHtml(flow.owner || "共用核對")}</span><h2>${escapeHtml(flow.title)}</h2><p>${escapeHtml(flow.scenario || "")}</p></div>
      <dl><div><dt>入口</dt><dd>${escapeHtml(flow.entry || "未設定")}</dd></div><div><dt>主路徑</dt><dd>${escapeHtml(flow.happyPath || "未設定")}</dd></div></dl>
    </div>
    <div class="flow-layout flow-diagram-layout">
      <div class="flow-map"><div class="flow-map-head"><h3>Flow Map</h3><span>${(flow.nodes || []).length} nodes · ${(flow.edges || []).length} edges</span></div><div class="flow-canvas-scroll"><div class="flow-canvas" style="width:${canvasWidth}px;height:${canvasHeight}px">
        <svg class="flow-lines" viewBox="0 0 ${canvasWidth} ${canvasHeight}" aria-hidden="true"><defs><marker id="flowArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker></defs>${edges.paths}</svg>${edges.labels}${mapNodes}
      </div></div></div>
      <aside class="flow-inspector" aria-live="polite">
        <section>
          <div class="flow-inspector-head"><span>Node Inspector</span><strong>${escapeHtml(firstNode?.label || "尚未選取")}</strong></div>
          ${panels}
        </section>
        <section class="flow-question-box"><h3>待確認</h3><ul class="flow-questions">${openQuestions}</ul></section>
      </aside>
    </div>
  </section>`;
}

const flowOptions = flows.map((flow, index) => `<button class="${index === 0 ? "active" : ""}" data-flow-target="${escapeHtml(flow.id)}">${escapeHtml(flow.title)}</button>`).join("");
const flowSections = flows.length ? flows.map(flowSection).join("") : '<div class="empty" style="display:block">尚未建立 Flow。請在 review-atlas.config.json 補上 flows。</div>';

const specTabs = config.specSections.map((section, index) => `<button class="spec-tab${index === 0 ? " active" : ""}" role="tab" aria-selected="${index === 0}" data-spec-tab="${escapeHtml(section)}">${escapeHtml(section)}</button>`).join("");
const aiRows = config.aiChecklist.map((item) => `<div class="ai-row"><div><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.id)}</span></div><select data-ai-check="${escapeHtml(item.id)}"><option value="pending">待判斷</option><option value="covered">已涵蓋</option><option value="missing">缺漏</option><option value="na">不適用</option></select></div>`).join("");
const diagnosticRows = diagnostics.length ? diagnostics.map((item) => `<div class="diagnostic ${item.level}"><strong>${escapeHtml(item.id)}</strong><span>${escapeHtml(item.message)}</span></div>`).join("") : '<div class="diagnostic success"><strong>Validation</strong><span>狀態 ID、路由與規格連結檢查通過。</span></div>';
const embedded = JSON.stringify({ config, manifest, specs, buildHash, generatedAt, diagnostics }).replaceAll("<", "\\u003c");

const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(config.title)} · ${escapeHtml(config.subtitle)}</title><style>
:root{--page:#f7f8fa;--card:#fff;--raised:#eceef2;--border:#e8eaec;--border-strong:#d1d5d9;--text:#141718;--secondary:#363c41;--muted:#6d7782;--placeholder:#b5bec7;--brand:#43bf8e;--brand-strong:#2b9e75;--brand-soft:#effaf5;--success:#177a55;--warning:#9a6400;--danger:#c53b3b;--info:#3374ba;--shadow:0 4px 12px -4px rgba(20,23,24,.08)}
*{box-sizing:border-box}body{margin:0;background:var(--page);color:var(--text);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC",sans-serif;font-size:14px}button,input,select,textarea{font:inherit}button,select{cursor:pointer}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid var(--brand);outline-offset:2px}.app-header{position:sticky;top:0;z-index:30;background:rgba(255,255,255,.97);border-bottom:1px solid var(--border);backdrop-filter:blur(12px)}.header-main{display:flex;justify-content:space-between;gap:20px;padding:16px 24px 12px}.title-row{display:flex;align-items:center;gap:9px}.title-row h1{margin:0;font-size:18px;line-height:24px;font-weight:600}.version{padding:3px 7px;border-radius:5px;background:var(--raised);color:var(--muted);font-size:11px}.subtitle{margin:4px 0 0;color:var(--muted);font-size:12px}.header-actions,.view-switch,.viewport-switch,.filters{display:flex;align-items:center;gap:8px}.button,.segmented button{height:32px;padding:0 12px;border:1px solid var(--border);border-radius:6px;background:#fff;color:var(--secondary)}.button.primary{border-color:var(--brand);background:var(--brand);color:#fff}.button:hover{border-color:var(--border-strong);background:#fafbfb}.button.primary:hover{border-color:var(--brand-strong);background:var(--brand-strong)}.viewbar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:0 24px}.view-switch{align-self:stretch}.view-switch button{min-height:42px;padding:0 12px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--muted)}.view-switch button.active{border-color:var(--brand);color:var(--text);font-weight:600}.segmented{display:inline-flex;padding:3px;border-radius:7px;background:var(--raised)}.segmented button{height:26px;border:0;background:transparent;font-size:12px}.segmented button.active{background:#fff;color:var(--text);box-shadow:0 1px 3px rgba(20,23,24,.1)}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 24px;border-top:1px solid var(--border);background:#fff}.filters{flex:1;min-width:0}.search{width:min(320px,30vw);height:32px;padding:0 10px;border:1px solid var(--border);border-radius:6px}.filter{height:32px;padding:0 9px;border:1px solid var(--border);border-radius:6px;background:#fff;color:var(--secondary)}.result-count{color:var(--muted);font-size:12px;white-space:nowrap}.summary-strip{display:grid;grid-template-columns:repeat(6,minmax(120px,1fr));gap:1px;border-bottom:1px solid var(--border);background:var(--border)}.metric{padding:12px 18px;background:#fff}.metric span{display:block;color:var(--muted);font-size:11px}.metric strong{display:block;margin-top:3px;font-size:18px;font-weight:600}.metric strong small{color:var(--muted);font-size:11px;font-weight:400}.view{display:none;padding:22px 24px 48px}.view.active{display:block}.group-section+ .group-section{margin-top:28px}.group-section>header{display:flex;justify-content:space-between;align-items:end;margin-bottom:10px}.group-section>header div{display:flex;align-items:baseline;gap:8px}.group-section h2{margin:0;font-size:16px;line-height:24px}.group-section header span{color:var(--muted);font-size:11px}.board{display:grid;grid-template-columns:repeat(auto-fill,520px);gap:16px;align-items:start}.state-card{overflow:hidden;border:1px solid var(--border);border-radius:8px;background:#fff;box-shadow:0 1px 2px rgba(20,23,24,.03)}.state-card[hidden],.group-section[hidden]{display:none}.preview-shell{position:relative;display:block;height:361px;overflow:hidden;border-bottom:1px solid var(--border);background:#eef0f2}.preview-shell iframe{position:absolute;border:0;pointer-events:none;background:#fff}.preview-hint{position:absolute;right:10px;bottom:10px;padding:6px 9px;border-radius:6px;background:rgba(20,23,24,.82);color:#fff;font-size:11px;opacity:0}.preview-shell:hover .preview-hint{opacity:1}body[data-preview-viewport="desktop"] .preview-shell iframe{left:0;top:0;width:1440px;height:1000px;transform:scale(.3611);transform-origin:top left}body[data-preview-viewport="mobile"] .preview-shell iframe{left:50%;top:14px;width:390px;height:844px;transform:translateX(-50%) scale(.39);transform-origin:top center;box-shadow:0 0 0 1px #d1d5d9,0 8px 24px rgba(20,23,24,.12)}.card-body{padding:14px}.card-head{display:flex;justify-content:space-between;gap:12px}.state-id{color:var(--brand-strong);font-size:11px;font-weight:700;letter-spacing:.04em}.card-head h3{margin:3px 0 0;font-size:15px;line-height:21px}.freshness{display:inline-flex;align-items:center;height:22px;padding:0 7px;border-radius:5px;background:#f2f4f5;color:var(--muted);font-size:10px;white-space:nowrap}.freshness.current{background:var(--brand-soft);color:var(--success)}.freshness.stale{background:#fff7e6;color:var(--warning)}.freshness.issue{background:#fff1f1;color:var(--danger)}.meta{display:flex;gap:5px;margin-top:8px}.meta span,.kind-tag{padding:3px 6px;border-radius:4px;background:#f2f4f5;color:#59636d;font-size:10px}.meta .has-spec{background:var(--brand-soft);color:var(--success)}.entry{display:grid;grid-template-columns:34px 1fr;gap:7px;margin-top:10px;color:var(--muted);font-size:11px;line-height:17px}.entry strong{color:var(--secondary)}.spec-teaser{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:11px;padding:10px;border:1px solid #cceee0;border-radius:7px;background:#f6fcf9}.spec-teaser>div{min-width:0}.spec-teaser span{color:var(--success);font-size:10px;font-weight:600}.spec-teaser p{margin:3px 0 0;color:#465059;font-size:11px;line-height:17px}.icon-button{width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;flex:none;padding:0;border:0;border-radius:6px;background:transparent;color:var(--muted)}.icon-button:hover{background:var(--raised);color:var(--brand-strong)}.icon-button svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}.review-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)}.review-control{display:grid;gap:4px;color:var(--muted);font-size:10px}.review-control select{width:100%;height:30px;border:1px solid var(--border);border-radius:5px;background:#fff;color:var(--secondary);font-size:11px}.review-control select[data-value="approved"]{border-color:#91d9bd;background:var(--brand-soft);color:var(--success)}.review-control select[data-value="issue"]{border-color:#efb4b4;background:#fff5f5;color:var(--danger)}.note{display:grid;gap:4px;margin-top:9px;color:var(--muted);font-size:10px}.note textarea{min-height:48px;padding:7px;border:1px solid var(--border);border-radius:6px;resize:vertical;color:var(--secondary);font-size:11px;line-height:17px}.coverage-panel{overflow:hidden;border:1px solid var(--border);border-radius:8px;background:#fff}.table-scroll{overflow:auto}.coverage-table{width:100%;min-width:1120px;border-collapse:collapse}.coverage-table th,.coverage-table td{padding:10px 12px;border-bottom:1px solid var(--border);text-align:left;vertical-align:middle}.coverage-table th{position:sticky;top:0;background:#f7f8fa;color:var(--muted);font-size:11px;font-weight:500}.coverage-table td{color:var(--secondary);font-size:12px}.coverage-table td:first-child{min-width:210px}.coverage-table td:first-child strong,.coverage-table td:first-child span{display:block}.coverage-table td:first-child strong{color:var(--brand-strong);font-size:10px}.coverage-table td:first-child span{margin-top:2px;color:var(--text)}.table-review{display:grid;grid-template-columns:repeat(3,105px);gap:6px}.table-review .review-control span{display:none}.yes{color:var(--success)}.muted{color:var(--muted)}.flow-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}.flow-toolbar h2{margin:0;font-size:15px}.flow-toolbar p{margin:2px 0 0;color:var(--muted);font-size:11px}.flow-switch{display:flex;gap:6px;flex-wrap:wrap}.flow-switch button{height:30px;padding:0 10px;border:1px solid var(--border);border-radius:6px;background:#fff;color:var(--secondary);font-size:12px}.flow-switch button.active{border-color:#b3e7c9;background:var(--brand-soft);color:var(--success);font-weight:600}.flow-case{display:none}.flow-case.active{display:block}.flow-intro{display:grid;grid-template-columns:minmax(360px,1fr) minmax(360px,1fr);gap:16px;margin-bottom:16px}.flow-intro>div,.flow-intro dl,.flow-map,.flow-aside section{border:1px solid var(--border);border-radius:8px;background:#fff;box-shadow:0 1px 2px rgba(20,23,24,.03)}.flow-intro>div{padding:16px}.flow-owner{display:inline-flex;margin-bottom:6px;color:var(--brand-strong);font-size:11px;font-weight:700}.flow-intro h2{margin:0;font-size:18px;line-height:24px}.flow-intro p{margin:6px 0 0;color:var(--secondary);font-size:12px;line-height:20px}.flow-intro dl{display:grid;grid-template-columns:1fr;gap:0;margin:0}.flow-intro dl div{padding:13px 16px}.flow-intro dl div+div{border-top:1px solid var(--border)}.flow-intro dt{color:var(--muted);font-size:10px}.flow-intro dd{margin:4px 0 0;color:var(--secondary);font-size:12px;line-height:18px}.flow-layout{display:grid;grid-template-columns:minmax(640px,1fr) 360px;gap:16px}.flow-map{overflow:hidden}.flow-map-head{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1px solid var(--border);background:#fff}.flow-map-head h3,.flow-aside h3{margin:0;font-size:14px}.flow-map-head span{color:var(--muted);font-size:11px}.flow-nodes{display:grid;grid-template-columns:repeat(3,minmax(220px,1fr));gap:12px;padding:16px;background:#fafbfb}.flow-node{position:relative;display:flex;gap:10px;min-height:188px;border:1px solid var(--border);border-radius:8px;background:#fff}.flow-node.state{border-color:#cceee0}.flow-node.message{border-color:#f4d08a;background:#fffaf0}.flow-node.validation{border-color:#efb4b4;background:#fff7f7}.flow-node-index{width:30px;display:flex;align-items:center;justify-content:center;border-right:1px solid var(--border);color:var(--muted);font-size:11px;font-weight:700}.flow-node-body{flex:1;min-width:0;padding:12px 12px 12px 0}.flow-node header{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.flow-stage{display:block;color:var(--muted);font-size:10px}.flow-node h3{margin:2px 0 0;font-size:14px;line-height:20px}.flow-node-meta{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.flow-node-meta span{padding:3px 6px;border-radius:4px;background:#f2f4f5;color:#59636d;font-size:10px}.flow-message-title{display:block;margin-top:10px;color:var(--text);font-size:12px}.flow-message-description,.flow-node p{margin:6px 0 0;color:#4f5962;font-size:12px;line-height:19px}.flow-check{margin-top:10px;padding:9px;border-radius:6px;background:#f7f8fa}.flow-check strong,.flow-check span{display:block;font-size:11px;line-height:17px}.flow-check strong{margin-bottom:2px;color:var(--secondary)}.flow-check span{color:var(--muted)}.flow-state-link{display:inline-flex;margin-top:10px;color:var(--brand-strong);font-size:11px;text-decoration:none}.flow-state-link:hover{text-decoration:underline}.flow-aside{display:grid;gap:16px;align-content:start}.flow-aside section{padding:14px 16px}.flow-edges,.flow-questions{margin:10px 0 0;padding-left:18px}.flow-edges li,.flow-questions li{color:#4f5962;font-size:12px;line-height:19px}.flow-edges li+li,.flow-questions li+li{margin-top:8px}.flow-edges span,.flow-edges strong{display:block}.flow-edges strong{color:var(--brand-strong);font-size:11px}.audit-grid{display:grid;grid-template-columns:minmax(360px,1fr) minmax(360px,1fr);gap:16px}.audit-panel{border:1px solid var(--border);border-radius:8px;background:#fff}.audit-panel>header{padding:14px 16px;border-bottom:1px solid var(--border)}.audit-panel h2{margin:0;font-size:15px}.audit-panel header p{margin:3px 0 0;color:var(--muted);font-size:11px}.audit-body{padding:8px 16px 16px}.ai-row,.diagnostic,.source-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:48px;border-bottom:1px solid var(--border)}.ai-row:last-child,.diagnostic:last-child,.source-row:last-child{border-bottom:0}.ai-row div,.diagnostic{min-width:0}.ai-row strong,.ai-row span{display:block}.ai-row strong{font-size:12px}.ai-row span{margin-top:2px;color:var(--muted);font-size:10px}.ai-row select{height:30px;border:1px solid var(--border);border-radius:5px;background:#fff;font-size:11px}.diagnostic{justify-content:flex-start}.diagnostic strong{min-width:82px;font-size:11px}.diagnostic span{color:var(--secondary);font-size:11px}.diagnostic.error strong{color:var(--danger)}.diagnostic.warning strong{color:var(--warning)}.diagnostic.success strong{color:var(--success)}.source-row span{color:var(--muted);font-size:11px}.source-row code{font-size:11px}.spec-backdrop{position:fixed;inset:0;z-index:80;display:flex;justify-content:flex-end;background:rgba(20,23,24,.24)}.spec-backdrop[hidden]{display:none}.spec-drawer{width:min(760px,calc(100vw - 64px));height:100%;display:grid;grid-template-rows:auto auto minmax(0,1fr);background:#fff;box-shadow:-20px 0 48px rgba(20,23,24,.14)}.spec-head{display:flex;justify-content:space-between;gap:16px;padding:18px 22px 14px;border-bottom:1px solid var(--border)}.spec-head-row{display:flex;align-items:center;gap:8px}.spec-head-row strong{color:var(--brand-strong);font-size:11px}.draft{padding:3px 7px;border-radius:5px;background:#fff5dc;color:var(--warning);font-size:10px}.spec-head h3{margin:4px 0 0;font-size:18px;line-height:24px}.spec-head p{margin:4px 0 0;color:var(--muted);font-size:11px;line-height:17px}.spec-tabs{display:flex;gap:3px;padding:7px 18px;overflow:auto;border-bottom:1px solid var(--border)}.spec-tab{height:32px;padding:0 10px;border:0;border-radius:5px;background:transparent;color:var(--muted);white-space:nowrap}.spec-tab.active{background:var(--brand-soft);color:var(--success)}.spec-content{overflow:auto;padding:20px 22px}.spec-source{margin-bottom:14px;color:var(--muted);font-size:10px}.spec-copy h4{margin:20px 0 7px;padding-top:16px;border-top:1px solid var(--border);font-size:13px}.spec-copy h4:first-child{margin-top:0;padding-top:0;border:0}.spec-copy p,.spec-copy li{color:#4f5962;font-size:12px;line-height:20px}.spec-copy p{margin:0 0 9px}.spec-copy ul,.spec-copy ol{margin:0 0 10px;padding-left:21px}.spec-copy li+li{margin-top:4px}.spec-copy code{padding:1px 4px;border-radius:4px;background:#f2f4f5}.toast{position:fixed;right:20px;bottom:20px;z-index:100;max-width:360px;padding:10px 13px;border:1px solid #b3e7c9;border-radius:8px;background:var(--brand-soft);color:var(--success);box-shadow:var(--shadow);font-size:12px;transform:translateY(20px);opacity:0;pointer-events:none;transition:.18s}.toast.show{transform:translateY(0);opacity:1}.empty{display:none;padding:56px;text-align:center;color:var(--muted)}
.flow-diagram-layout{grid-template-columns:minmax(720px,1fr) 360px}.flow-canvas-scroll{overflow:auto;background:#fafbfb}.flow-canvas{position:relative;min-height:360px}.flow-lines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.flow-lines path{fill:none;stroke:#8d98a3;stroke-width:1.35}.flow-lines marker path{fill:#8d98a3}.flow-edge-label{position:absolute;z-index:2;display:inline-flex;align-items:center;min-height:22px;max-width:126px;padding:3px 7px;border:1px solid #dfe3e6;border-radius:5px;background:rgba(255,255,255,.94);box-shadow:0 1px 3px rgba(20,23,24,.06);color:#4f5962;font-size:10px;line-height:14px;text-align:center}.flow-map-node{position:absolute;z-index:3;width:174px;min-height:72px;padding:10px 12px;border:1px solid var(--border-strong);border-radius:7px;background:#fff;color:var(--text);text-align:left;box-shadow:0 2px 4px rgba(20,23,24,.04);transition:.16s}.flow-map-node:hover{border-color:var(--brand);box-shadow:0 4px 12px rgba(20,23,24,.08);transform:translateY(-1px)}.flow-map-node.active{border-color:var(--brand);box-shadow:0 0 0 2px rgba(67,191,142,.18)}.flow-map-node.message{background:#fffaf0;border-color:#f4d08a}.flow-map-node.validation{background:#fff7f7;border-color:#efb4b4}.flow-map-stage{display:block;margin-bottom:3px;color:var(--muted);font-size:10px}.flow-map-node strong{display:block;font-size:13px;line-height:18px;font-weight:600}.flow-map-meta{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}.flow-map-meta span{padding:2px 5px;border-radius:4px;background:#f2f4f5;color:#59636d;font-size:9px}.flow-inspector{display:grid;gap:16px;align-content:start}.flow-inspector>section{border:1px solid var(--border);border-radius:8px;background:#fff;box-shadow:0 1px 2px rgba(20,23,24,.03)}.flow-inspector-head{padding:13px 16px;border-bottom:1px solid var(--border)}.flow-inspector-head span{display:block;color:var(--muted);font-size:10px}.flow-inspector-head strong{display:block;margin-top:2px;font-size:14px}.flow-inspector-panel{display:none;padding:14px 16px}.flow-inspector-panel.active{display:block}.flow-inspector-panel header{padding-bottom:10px;border-bottom:1px solid var(--border)}.flow-inspector-panel h3{margin:2px 0 0;font-size:16px;line-height:22px}.flow-detail-body{padding-top:10px}.flow-detail-row{display:grid;gap:3px;margin-bottom:10px}.flow-detail-row span{color:var(--muted);font-size:10px}.flow-detail-row p{margin:0;color:#4f5962;font-size:12px;line-height:19px}.flow-detail-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.flow-detail-actions .button{display:inline-flex;align-items:center;text-decoration:none;font-size:12px}.flow-question-box{padding:14px 16px}.flow-question-box h3{margin:0;font-size:14px}
.flow-map-subtitle{display:block;margin-top:4px;color:var(--muted);font-size:11px;line-height:15px}.flow-map-node.message strong{color:var(--warning)}.flow-map-node.validation strong{color:var(--danger)}
@media(max-width:1100px){.flow-layout,.flow-intro,.flow-diagram-layout{grid-template-columns:1fr}.flow-nodes{grid-template-columns:1fr 1fr}.flow-aside{grid-template-columns:1fr 1fr}.flow-inspector{grid-template-columns:1fr 1fr}}
.audit-disclosure{margin-top:16px;overflow:hidden}.audit-disclosure summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;list-style:none;cursor:pointer}.audit-disclosure summary::-webkit-details-marker{display:none}.audit-disclosure summary h2{margin:0;font-size:15px}.audit-disclosure summary p{margin:3px 0 0;color:var(--muted);font-size:11px}.audit-disclosure summary:after{content:"展開";flex:none;height:22px;padding:0 7px;border-radius:5px;background:#f2f4f5;color:var(--muted);font-size:10px;line-height:22px}.audit-disclosure[open] summary{border-bottom:1px solid var(--border)}.audit-disclosure[open] summary:after{content:"收合"}.audit-secondary-note{padding:10px 16px;border-bottom:1px solid var(--border);background:#fafbfb;color:var(--muted);font-size:11px;line-height:18px}
@media(max-width:900px){.header-main,.viewbar,.toolbar{padding-left:14px;padding-right:14px}.header-main,.toolbar{align-items:flex-start;flex-direction:column}.header-actions,.filters{width:100%;flex-wrap:wrap}.search{width:100%}.summary-strip{grid-template-columns:repeat(2,1fr)}.board{display:block}.state-card{margin-bottom:14px}.audit-grid,.flow-aside,.flow-nodes,.flow-inspector{grid-template-columns:1fr}.spec-drawer{width:100vw}.view{padding-left:14px;padding-right:14px}}
</style></head><body data-preview-viewport="desktop">
<header class="app-header" id="appHeader"><div class="header-main"><div><div class="title-row"><h1>${escapeHtml(config.title)}</h1><span class="version">${escapeHtml(config.subtitle)} · ${buildHash}</span></div><p class="subtitle">同一份狀態資料，支援介面核對、交付覆蓋與 AI 狀態稽核。</p></div><div class="header-actions"><button class="button" id="importReview">匯入紀錄</button><input type="file" id="importFile" accept="application/json" hidden><button class="button primary" id="exportReview">匯出核對紀錄</button></div></div>
<div class="viewbar"><nav class="view-switch" aria-label="Atlas 檢視"><button class="active" data-view-target="canvas">Canvas</button><button data-view-target="flow">Flow</button><button data-view-target="coverage">Coverage</button><button data-view-target="audit">Audit</button></nav><div class="viewport-switch segmented" aria-label="預覽尺寸">${config.viewports.map((item, index) => `<button class="${index === 0 ? "active" : ""}" data-viewport="${escapeHtml(item.id)}">${escapeHtml(item.label)}</button>`).join("")}</div></div>
<div class="toolbar" id="filterToolbar"><div class="filters"><input class="search" id="search" placeholder="搜尋名稱、編號、功能區或入口…"><select class="filter" id="groupFilter"><option value="all">全部功能區</option>${groups.map((group) => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`).join("")}</select><select class="filter" id="kindFilter"><option value="all">全部類型</option>${kinds.map((kind) => `<option value="${escapeHtml(kind)}">${escapeHtml(kind)}</option>`).join("")}</select><select class="filter" id="specFilter"><option value="all">全部規格狀態</option><option value="with">有規格</option><option value="without">無規格</option></select><select class="filter" id="reviewFilter"><option value="all">全部核對狀態</option><option value="pending">待確認</option><option value="approved">全數確認</option><option value="issue">有問題</option><option value="stale">已過期</option></select></div><span class="result-count"><strong id="visibleCount">${manifest.states.length}</strong> / ${manifest.states.length} 個狀態</span></div></header>
<section class="summary-strip" id="summaryStrip"><div class="metric"><span>UI 狀態</span><strong>${manifest.states.length}<small> 個</small></strong></div><div class="metric"><span>Flow</span><strong>${flows.length}<small> 條</small></strong></div><div class="metric"><span>規格覆蓋</span><strong>${Object.keys(specs).length}<small> / ${manifest.states.length}</small></strong></div><div class="metric"><span>全數確認</span><strong id="approvedMetric">0<small> 個</small></strong></div><div class="metric"><span>過期核對</span><strong id="staleMetric">0<small> 個</small></strong></div><div class="metric"><span>Validation</span><strong>${diagnostics.filter((item) => item.level === "error").length}<small> errors</small></strong></div></section>
<main id="appMain"><section class="view active" data-view="canvas">${groupSections}<div class="empty" id="canvasEmpty">找不到符合條件的 UI 狀態。</div></section><section class="view" data-view="flow"><div class="flow-toolbar"><div><h2>Flow Review</h2><p>用任務路徑核對 state、message、inline error 與例外情境是否完整。</p></div><div class="flow-switch" aria-label="Flow 切換">${flowOptions}</div></div>${flowSections}</section><section class="view" data-view="coverage"><div class="coverage-panel"><div class="table-scroll"><table class="coverage-table"><thead><tr><th>狀態</th><th>功能區</th><th>類型</th><th>規格</th><th>UI / PM / RD</th><th>版本</th></tr></thead><tbody>${coverageRows}</tbody></table></div></div><div class="empty" id="coverageEmpty">找不到符合條件的 UI 狀態。</div></section>
<section class="view" data-view="audit"><div class="audit-grid"><section class="audit-panel"><header><h2>自動驗證</h2><p>生成時檢查狀態 ID、Prototype 路由、Flow 引用與規格連結。</p></header><div class="audit-body">${diagnosticRows}</div></section><div><section class="audit-panel"><header><h2>來源版本</h2><p>核對狀態會綁定此版本；來源改變後自動標示過期。</p></header><div class="audit-body"><div class="source-row"><span>Build hash</span><code>${buildHash}</code></div><div class="source-row"><span>Prototype</span><code>${escapeHtml(config.prototype)}</code></div><div class="source-row"><span>Manifest</span><code>${escapeHtml(config.manifest)}</code></div><div class="source-row"><span>Generated</span><code>${escapeHtml(generatedAt)}</code></div></div></section><details class="audit-panel audit-disclosure"><summary><div><h2>AI 情境檢查</h2><p>AI prototype 的通用狀態檢查；非 AI 模組可標記為不適用。</p></div></summary><div class="audit-secondary-note">這區塊先作為次要檢查保留。等 Review Atlas 用在 AI prototype 時，再展開檢查資料來源、生成中、低信心、重試、版本等狀態。</div><div class="audit-body">${aiRows}</div></details></div></div></section></main>
<div class="spec-backdrop" id="specBackdrop" hidden><aside class="spec-drawer" id="specDrawer" role="dialog" aria-modal="true" aria-labelledby="specTitle"><header class="spec-head"><div><div class="spec-head-row"><strong id="specId"></strong><span class="draft">Draft</span></div><h3 id="specTitle"></h3><p id="specSummary"></p></div><button class="icon-button" id="closeSpec" aria-label="關閉規格">×</button></header><nav class="spec-tabs" role="tablist" aria-label="規格內容分類">${specTabs}</nav><div class="spec-content" id="specPanel" role="tabpanel"><div class="spec-source" id="specSource"></div><div class="spec-copy" id="specCopy"></div></div></aside></div><div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>const DATA=${embedded};
const storageKey=DATA.config.storageKey;let store;try{store=JSON.parse(localStorage.getItem(storageKey)||'{}')}catch{store={}}store.reviews||={};store.audit||={};
const roles=['UI','PM','RD'];const cards=[...document.querySelectorAll('.state-card')];const rows=[...document.querySelectorAll('[data-coverage-row]')];let activeSpecId=null;let lastFocused=null;
function readAtlasHash(){const params=new URLSearchParams(location.hash.replace(/^#/,''));return{view:params.get('view')||'',flow:params.get('flow')||'',node:params.get('node')||''}}
function updateAtlasHash(next){const current=readAtlasHash();const merged={...current,...next};const params=new URLSearchParams();if(merged.view)params.set('view',merged.view);if(merged.flow)params.set('flow',merged.flow);if(merged.node)params.set('node',merged.node);history.replaceState(null,'',params.toString()?'#'+params.toString():location.pathname)}
function ensureReview(id){store.reviews[id]||={roles:{UI:'pending',PM:'pending',RD:'pending'},versions:{},note:''};store.reviews[id].roles||={UI:'pending',PM:'pending',RD:'pending'};store.reviews[id].versions||={};return store.reviews[id]}
function save(){localStorage.setItem(storageKey,JSON.stringify(store))}
function reviewState(id){const review=ensureReview(id);const values=roles.map(role=>review.roles[role]||'pending');if(values.includes('issue'))return'issue';if(values.every(value=>value==='approved'||value==='na'))return values.some((value,index)=>value==='approved'&&review.versions[roles[index]]!==DATA.buildHash)?'stale':'approved';if(values.some((value,index)=>value==='approved'&&review.versions[roles[index]]!==DATA.buildHash))return'stale';return'pending'}
function freshnessLabel(id){return{pending:'未核對',approved:'版本一致',issue:'有問題',stale:'來源已更新'}[reviewState(id)]}
function refreshReviewUI(id){const review=ensureReview(id);document.querySelectorAll('[data-review-control][data-state-id="'+id+'"]').forEach(select=>{const value=review.roles[select.dataset.role]||'pending';select.value=value;select.dataset.value=value});document.querySelectorAll('[data-freshness="'+id+'"]').forEach(badge=>{const state=reviewState(id);badge.textContent=freshnessLabel(id);badge.className='freshness '+(state==='approved'?'current':state)});document.querySelectorAll('[data-review-note][data-state-id="'+id+'"]').forEach(note=>{if(document.activeElement!==note)note.value=review.note||''})}
function setRole(id,role,value){const review=ensureReview(id);review.roles[role]=value;if(value==='approved')review.versions[role]=DATA.buildHash;else delete review.versions[role];review.updatedAt=new Date().toISOString();save();refreshReviewUI(id);refreshMetrics();applyFilters()}
function refreshMetrics(){let approved=0,stale=0;DATA.manifest.states.forEach(state=>{const value=reviewState(state.id);if(value==='approved')approved++;if(value==='stale')stale++});document.getElementById('approvedMetric').innerHTML=approved+'<small> 個</small>';document.getElementById('staleMetric').innerHTML=stale+'<small> 個</small>'}
function matchNode(node){const query=document.getElementById('search').value.trim().toLowerCase();const group=document.getElementById('groupFilter').value;const kind=document.getElementById('kindFilter').value;const spec=document.getElementById('specFilter').value;const review=document.getElementById('reviewFilter').value;const state=reviewState(node.dataset.stateId);return(!query||node.dataset.search.includes(query))&&(group==='all'||node.dataset.group===group)&&(kind==='all'||node.dataset.kind===kind)&&(spec==='all'||(spec==='with'&&node.dataset.hasSpec==='yes')||(spec==='without'&&node.dataset.hasSpec==='no'))&&(review==='all'||review===state)}
function applyFilters(){let count=0;cards.forEach(card=>{card.hidden=!matchNode(card);if(!card.hidden)count++});document.querySelectorAll('[data-group-section]').forEach(section=>section.hidden=![...section.querySelectorAll('.state-card')].some(card=>!card.hidden));rows.forEach(row=>row.hidden=!matchNode(row));document.getElementById('visibleCount').textContent=count;document.getElementById('canvasEmpty').style.display=count?'none':'block';document.getElementById('coverageEmpty').style.display=count?'none':'block'}
function activateView(name){document.querySelectorAll('[data-view-target]').forEach(button=>button.classList.toggle('active',button.dataset.viewTarget===name));document.querySelectorAll('[data-view]').forEach(view=>view.classList.toggle('active',view.dataset.view===name));document.getElementById('filterToolbar').style.display=(name==='audit'||name==='flow')?'none':'flex';updateAtlasHash({view:name})}
function activateFlow(id){document.querySelectorAll('[data-flow-target]').forEach(button=>button.classList.toggle('active',button.dataset.flowTarget===id));document.querySelectorAll('[data-flow-case]').forEach(section=>section.classList.toggle('active',section.dataset.flowCase===id));const activeCase=document.querySelector('[data-flow-case="'+id+'"]');const firstNode=activeCase?.querySelector('[data-flow-node-target]');if(firstNode)activateFlowNode(id,firstNode.dataset.nodeId);else updateAtlasHash({view:'flow',flow:id,node:''})}
function activateFlowNode(flowId,nodeId){document.querySelectorAll('[data-flow-node-target]').forEach(button=>button.classList.toggle('active',button.dataset.flowId===flowId&&button.dataset.nodeId===nodeId));document.querySelectorAll('[data-flow-inspector]').forEach(panel=>panel.classList.toggle('active',panel.dataset.flowId===flowId&&panel.dataset.nodeId===nodeId));const activeButton=document.querySelector('[data-flow-node-target].active[data-flow-id="'+flowId+'"]');const head=document.querySelector('[data-flow-case="'+flowId+'"] .flow-inspector-head strong');if(head&&activeButton)head.textContent=activeButton.querySelector('strong')?.textContent||'已選取節點';updateAtlasHash({view:'flow',flow:flowId,node:nodeId})}
function showToast(message){const toast=document.getElementById('toast');toast.textContent=message;toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('show'),2600)}
function showSpecTab(section){const spec=DATA.specs[activeSpecId];document.querySelectorAll('.spec-tab').forEach(tab=>{const active=tab.dataset.specTab===section;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active))});document.getElementById('specCopy').innerHTML=spec?.sections?.[section]||'<p>這個分類尚未補充規格。</p>';document.querySelector('.spec-content').scrollTop=0}
function openSpec(id){const spec=DATA.specs[id];if(!spec)return;activeSpecId=id;lastFocused=document.activeElement;document.getElementById('specId').textContent=id;document.getElementById('specTitle').textContent=spec.title;document.getElementById('specSummary').textContent=spec.summary;document.getElementById('specSource').textContent='規格來源：'+spec.source;document.getElementById('specBackdrop').hidden=false;document.getElementById('appHeader').inert=true;document.getElementById('appMain').inert=true;document.body.style.overflow='hidden';showSpecTab(DATA.config.specSections[0]);document.getElementById('closeSpec').focus()}
function closeSpec(){document.getElementById('specBackdrop').hidden=true;document.getElementById('appHeader').inert=false;document.getElementById('appMain').inert=false;document.body.style.overflow='';lastFocused?.focus();activeSpecId=null}
function exportReview(){const payload={format:'review-atlas-v2',module:DATA.config.title,buildHash:DATA.buildHash,exportedAt:new Date().toISOString(),reviews:store.reviews,audit:store.audit};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='review-atlas-record-'+DATA.buildHash+'.json';link.click();URL.revokeObjectURL(link.href)}
function importReview(file){const reader=new FileReader();reader.onload=()=>{try{const payload=JSON.parse(reader.result);const reviews=payload.reviews||payload.review;if(!reviews||typeof reviews!=='object')throw new Error('invalid');store.reviews={...store.reviews,...reviews};store.audit={...store.audit,...(payload.audit||{})};save();DATA.manifest.states.forEach(state=>refreshReviewUI(state.id));document.querySelectorAll('[data-ai-check]').forEach(select=>select.value=store.audit[select.dataset.aiCheck]||'pending');refreshMetrics();applyFilters();showToast('核對紀錄已匯入')}catch{showToast('匯入失敗：檔案格式不符')}};reader.readAsText(file)}
document.querySelectorAll('[data-review-control]').forEach(select=>select.addEventListener('change',()=>setRole(select.dataset.stateId,select.dataset.role,select.value)));document.querySelectorAll('[data-review-note]').forEach(note=>{const review=ensureReview(note.dataset.stateId);note.value=review.note||'';note.addEventListener('input',()=>{ensureReview(note.dataset.stateId).note=note.value;ensureReview(note.dataset.stateId).updatedAt=new Date().toISOString();save()})});DATA.manifest.states.forEach(state=>refreshReviewUI(state.id));
['search','groupFilter','kindFilter','specFilter','reviewFilter'].forEach(id=>document.getElementById(id).addEventListener(id==='search'?'input':'change',applyFilters));document.querySelectorAll('[data-view-target]').forEach(button=>button.addEventListener('click',()=>activateView(button.dataset.viewTarget)));document.querySelectorAll('[data-flow-target]').forEach(button=>button.addEventListener('click',()=>activateFlow(button.dataset.flowTarget)));document.querySelectorAll('[data-flow-node-target]').forEach(button=>button.addEventListener('click',()=>activateFlowNode(button.dataset.flowId,button.dataset.nodeId)));document.querySelectorAll('[data-prototype-link]').forEach(link=>link.addEventListener('click',()=>activateFlowNode(link.dataset.flowId,link.dataset.nodeId)));document.querySelectorAll('[data-viewport]').forEach(button=>button.addEventListener('click',()=>{document.body.dataset.previewViewport=button.dataset.viewport;document.querySelectorAll('[data-viewport]').forEach(item=>item.classList.toggle('active',item===button))}));document.querySelectorAll('[data-open-spec]').forEach(button=>button.addEventListener('click',()=>openSpec(button.dataset.openSpec)));document.querySelectorAll('.spec-tab').forEach(tab=>tab.addEventListener('click',()=>showSpecTab(tab.dataset.specTab)));document.getElementById('closeSpec').addEventListener('click',closeSpec);document.getElementById('specBackdrop').addEventListener('click',event=>{if(event.target.id==='specBackdrop')closeSpec()});
document.querySelectorAll('[data-ai-check]').forEach(select=>{select.value=store.audit[select.dataset.aiCheck]||'pending';select.addEventListener('change',()=>{store.audit[select.dataset.aiCheck]=select.value;save()})});document.getElementById('exportReview').addEventListener('click',exportReview);document.getElementById('importReview').addEventListener('click',()=>document.getElementById('importFile').click());document.getElementById('importFile').addEventListener('change',event=>{if(event.target.files[0])importReview(event.target.files[0]);event.target.value=''});
document.addEventListener('keydown',event=>{if(document.getElementById('specBackdrop').hidden)return;if(event.key==='Escape'){closeSpec();return}if(event.key==='Tab'){const focusable=[...document.querySelectorAll('#specDrawer button:not([disabled]),#specDrawer [href],#specDrawer select,#specDrawer input,#specDrawer textarea')];const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}});const initialHash=readAtlasHash();if(initialHash.view)activateView(initialHash.view);if(initialHash.flow)activateFlow(initialHash.flow);if(initialHash.flow&&initialHash.node)activateFlowNode(initialHash.flow,initialHash.node);refreshMetrics();applyFilters();save();</script></body></html>`;

fs.writeFileSync(outputPath, html);
console.log(`Review Atlas V2: ${outputPath}`);
console.log(`States: ${manifest.states.length}, Specs: ${Object.keys(specs).length}, Build: ${buildHash}`);
if (diagnostics.length) console.log(`Diagnostics: ${diagnostics.length}`);
if (diagnostics.some((item) => item.level === "error")) process.exitCode = 1;
