# MCP 集成说明

## 使用的 MCP Server

| 项目 | 值 |
|---|---|
| Server | `mcd-mcp` — 麦当劳中国官方 MCP Server |
| 文档 | https://github.com/M-China/mcd-mcp-server |
| 端点 | `https://mcp.mcd.cn` |
| 传输 | `streamablehttp` |
| 鉴权 | `Authorization: Bearer ${MCD_MCP_TOKEN}` |
| Token 申请 | https://open.mcd.cn/mcp |

配置文件见 [`mcp-config.example.json`](./mcp-config.example.json)，其中 Token 为占位符。仓库内不包含任何真实 Token、密钥或账号凭证。

---

## 实际调用的 Tool

### `list-nutrition-foods` — 本项目的唯一数据入口

无入参，返回麦当劳常见餐品的营养成分。原始返回是一个文本表，格式为：

```
[160]{productName,nutritionDescription,energyKj,energyKcal,protein,fat,carbohydrate,sodium,calcium}:
  猪柳麦满分,null,1288,308,16,16,24,781,213
  中薯条,null,1210,289,4,12,38,165,18
  ...
```

字段含义：

| 字段 | 含义 | 单位 |
|---|---|---|
| `productName` | 餐品名 | — |
| `nutritionDescription` | 通俗类比文案（部分条目有，如「能量约清水1杯」） | — |
| `energyKj` / `energyKcal` | 能量 | kJ / kcal |
| `protein` | 蛋白质 | g |
| `fat` | 脂肪 | g |
| `carbohydrate` | 碳水化合物 | g |
| `sodium` | 钠 | mg |
| `calcium` | 钙 | mg |

本项目取其中 6 个数值字段（kcal / protein / fat / carbohydrate / sodium / calcium），去重后得到 **158 条**餐品。

**为什么只用一个 Tool：** 这 6 个字段已经足以支撑「时段 × 四维」的全部计算。菜单价格、门店、优惠券这些接口解决的是「怎么买」，而本项目解决的是「这一顿在你这一天里的位置对不对」，两者不需要耦合——把它们解耦，正好换来「零 Token 打开即玩」。

### 探索阶段验证过、但最终未接入的 Tool

诚实记录，避免重复踩坑：

| Tool | 验证结论 | 为何未接入 |
|---|---|---|
| `campaign-calendar` | 返回**自然语言营销文案**，不是结构化字段；同一活动会在多个日期重复出现 | 无渠道/时段限制字段，无法做规则判定 |
| `mall-points-products`（类目 `2>8` 周边） | 有结构化的限量数、upTime/downTime/status | 与「一顿饭怎么吃」无关 |
| `calculate-price` | 支持逐项带 couponId 反复试算，金额单位为分 | 本项目不做下单与核价 |
| `query-meals` / `query-meal-detail` / `query-nearby-stores` | 正常 | 需要门店与实时库存，会引入登录门槛 |

---

## 调用流程

### 1. 握手（JSON-RPC over streamable HTTP）

```http
POST https://mcp.mcd.cn
Authorization: Bearer ${MCD_MCP_TOKEN}
Content-Type: application/json
Accept: application/json, text/event-stream

{"jsonrpc":"2.0","id":1,"method":"initialize",
 "params":{"protocolVersion":"2024-11-05","capabilities":{},
 "clientInfo":{"name":"mcd-desk","version":"1.0.0"}}}
```

响应头中的 `mcp-session-id` 需保存，后续请求带上。随后发送：

```json
{"jsonrpc":"2.0","method":"notifications/initialized"}
```

### 2. 调用工具

```json
{"jsonrpc":"2.0","id":2,"method":"tools/call",
 "params":{"name":"list-nutrition-foods","arguments":{}}}
```

响应可能是 JSON 也可能是 SSE（`text/event-stream`）。脚本 `scripts/fetch-nutrition.mjs` 两种都做了兼容：SSE 下取 `data: ` 开头的行再解析。

### 3. 落库

解析文本表 → 按关键词归入 5 个品类（主食 / 小食 / 饮品 / 甜品 / 早餐）→ 写入 `data.js`。

> 分类关键词的顺序很关键。踩过的坑：麦当劳的「巨无霸」不含「堡」字；「脆汁鸡」因为含「汁」会被误判成饮品。脚本里已按「早餐 → 主食 → 小食 → 甜品 → 饮品」的顺序匹配并显式处理了这些例外。

### 4. 消费

`index.html` 直接加载 `data.js`，所有计算在浏览器本地完成，**运行期不发起任何网络请求，也不上传任何数据**。

### 5. 自动刷新

`.github/workflows/refresh-data.yml` 每天定时执行第 1–3 步，用 Secret 里的 Token 重新拉取并更新 `data.js`。

---

## 业务价值

**对麦当劳 MCP 能力而言：** `list-nutrition-foods` 是官方开放的结构化营养数据。这类数据单点看只是「一份成分表」，但把它按「每 100 kcal 的密度」重新归一化之后，菜单里那些不查表就看不见的结构才浮现出来——比如蛋白密度和钠密度高度正相关（排名相关 r = 0.608），比如奶制品是一个独立的低钠岛（钠密度 40–60 vs 咸食 200–600，而蛋白密度几乎相同）。这些关系是官方数据里本来就有的，只是需要一个视角把它读出来。

**对用户而言：** 一个不需要注册、不需要授权、打开就能得到答案的工具。它把「今天这顿该怎么点」从一个模糊的感觉，变成四个时段、四个维度、可对比的数字，并给出能立刻执行的替换方案。

**对开发者而言：** 评分规则全部写在 `index.html` 里，改一个预算或权重就能得到自己的那把尺；`data.js` 的刷新链路也是公开的，可以换成任何别的数据源。
