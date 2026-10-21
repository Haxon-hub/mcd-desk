#!/usr/bin/env node
/**
 * 通过麦当劳中国官方 MCP 拉取餐品营养数据，重新生成 data.js
 *
 *   export MCD_MCP_TOKEN="<你的 Token>"
 *   node scripts/fetch-nutrition.mjs
 *
 * Token 申请：https://open.mcd.cn/mcp
 * 仓库内不含任何真实 Token，本脚本只从环境变量读取。
 */

const ENDPOINT = process.env.MCD_MCP_URL || 'https://mcp.mcd.cn';
const TOKEN = process.env.MCD_MCP_TOKEN;

if (!TOKEN) {
  console.error('缺少环境变量 MCD_MCP_TOKEN。请先申请 Token：https://open.mcd.cn/mcp');
  process.exit(1);
}

let sessionId = null;
let rpcId = 0;

async function rpc(method, params) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    Authorization: `Bearer ${TOKEN}`,
  };
  if (sessionId) headers['mcp-session-id'] = sessionId;

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
  });
  if (!res.ok) throw new Error(`${method} 失败：HTTP ${res.status}`);

  const sid = res.headers.get('mcp-session-id');
  if (sid) sessionId = sid;

  const raw = await res.text();
  return parsePayload(raw);
}

/** 兼容 JSON 与 SSE 两种响应 */
function parsePayload(raw) {
  const ct = raw.trim();
  if (!ct) return null;
  if (ct.startsWith('{')) return JSON.parse(ct);

  const dataLines = ct
    .split(/\r?\n/)
    .filter((l) => l.startsWith('data:'))
    .map((l) => l.slice(5).trim())
    .filter(Boolean);
  for (const line of dataLines) {
    try {
      return JSON.parse(line);
    } catch {
      /* 继续尝试下一行 */
    }
  }
  throw new Error('无法解析 MCP 响应：' + ct.slice(0, 200));
}

/** 从 tools/call 结果里取出文本 */
function extractText(result) {
  const c = result?.result?.content ?? result?.content;
  if (Array.isArray(c)) {
    return c.map((x) => x?.text ?? '').join('\n');
  }
  if (typeof result?.result === 'string') return result.result;
  return '';
}

const BREAKFAST = ['麦满分', '早安营养卷', '粥', '油条', '薯饼'];
const MAIN = ['堡', '霸', '炒双蛋', '叠叠卷', '香鸡', '香鱼', '鳕鱼', '鱼排', '果然多肉', '牛气满满', '薯鱼', '苹板'];
const SNACK = ['薯条', '薯饼', '鸡块', '鸡翅', '鸡排', '鸡球', '脆汁鸡', 'V翅', '双翅', '香肠', '玉米杯', '趣鸡球', '多笋卷', '蜜汁快乐'];
const DESSERT = ['新地', '旋风', '冰淇淋', '奶冻', '爆珠', '拉明顿', '派', '苹果片'];

// 顺序不能改：麦当劳「巨无霸」不含「堡」字，「脆汁鸡」含「汁」会被误判成饮品
function classify(name) {
  if (BREAKFAST.some((w) => name.includes(w))) return '早餐';
  if (MAIN.some((w) => name.includes(w))) return '主食';
  if (SNACK.some((w) => name.includes(w))) return '小食';
  if (DESSERT.some((w) => name.includes(w))) return '甜品';
  return '饮品';
}

function parseTable(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /^\[\d+\]\{[^}]*\}\s*:/.test(l.trim()));
  if (start < 0) throw new Error('未在响应中找到营养数据表头');

  const rows = [];
  const seen = new Set();
  for (const line of lines.slice(start + 1)) {
    const t = line.trim();
    if (!t || t.startsWith('[')) continue;
    const parts = t.split(',').map((s) => s.trim());
    if (parts.length < 9) continue;

    // 名称里万一含逗号，把多出来的部分并回名称
    const name = parts.slice(0, parts.length - 8).join(',');
    const nums = parts.slice(parts.length - 8);
    const [desc, kj, kcal, protein, fat, carb, sodium, calcium] = nums;
    if (!name || seen.has(name)) continue;
    seen.add(name);

    const num = (v) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };
    rows.push({
      n: name,
      kcal: num(kcal),
      p: num(protein),
      f: num(fat),
      c: num(carb),
      na: num(sodium),
      ca: num(calcium),
      g: classify(name),
    });
  }
  return rows;
}

(async () => {
  await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'mcd-desk', version: '1.0.0' },
  });
  await rpc('notifications/initialized', {});
  const result = await rpc('tools/call', { name: 'list-nutrition-foods', arguments: {} });

  const text = extractText(result);
  const rows = parseTable(text);
  if (!rows.length) throw new Error('解析出 0 条数据，请检查接口返回格式是否变化');

  const out = `window.FOODS=${JSON.stringify(rows)};\n`;
  const { writeFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  writeFileSync(join(root, 'data.js'), out, 'utf-8');

  const byGroup = rows.reduce((a, r) => ((a[r.g] = (a[r.g] || 0) + 1), a), {});
  console.log(`已写入 data.js：${rows.length} 条`);
  console.log('分类：', JSON.stringify(byGroup, null, 0));
})().catch((e) => {
  console.error('失败：', e.message);
  process.exit(1);
});
