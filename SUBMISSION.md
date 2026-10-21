# 报名提交清单

## 提交前检查

- [ ] GitHub 仓库已建好，且为 **Public**
- [ ] 仓库包含 `README.md`
- [ ] 仓库包含 `CONTEST_DECLARATION.md`（**官方原文，一字未改**）
- [ ] 仓库包含 `MCP_INTEGRATION.md`
- [ ] 仓库包含 `workbuddy.md`（拿 3,000 积分必交）
- [ ] 仓库包含源代码（`index.html` + `data.js`）
- [ ] 仓库内**没有**任何真实 Token（只有 `YOUR_MCP_TOKEN` 占位符）
- [ ] 项目创建时间在 2025-12-25 00:00 至 2026-10-25 23:59 之间（新仓自动满足）

## 建仓并推送

```bash
cd mcd-desk
git init
git add .
git commit -m "feat: 工位餐 —— 打工人的麦当劳点单尺"
git branch -M main
git remote add origin https://github.com/Haxon-hub/mcd-desk.git
git push -u origin main
```

## 开启在线试玩（建议做）

Settings → Pages → Build and deployment → Source 选 `Deploy from branch`，分支 `main`、目录 `/root`。

拿到链接后，把 `README.md` 里「在线试玩」那节的占位文字替换成真实链接 —— 有在线 Demo 是榜单头部项目的共同特征。

## 报名 Issue

在 https://github.com/M-China/mcd-developer-innovation-challenge/issues 发 Issue。

**标题**（自定义即可）：

```
【参赛申请】工位餐 —— 打工人的麦当劳点单尺
```

**正文**（整段复制，把地址换成你的仓库）：

```
【参赛申请】
项目名称：工位餐
项目地址：https://github.com/Haxon-hub/mcd-desk
项目简介：打工人的麦当劳点单尺。在线试玩 https://haxon-hub.github.io/mcd-desk/ —— 基于麦当劳官方 MCP 的 158 条餐品营养数据，按「这一顿处在一天里的什么位置」给订单打分，同一份巨无霸套餐，工作午餐 75 分，加班夜宵 18 分。四个时段各有独立的热量、钠、蛋白、碳水预算与权重，钠的扣分最重；短板闸门保证任一维度崩掉时总分封顶 45 分。附同类替换的帕累托改进建议（如「巨无霸→薄皮焦香V翅，+21 分，钠 −367mg」）与一键分享卡片导出。纯前端零依赖零配置，打开即玩，运行期不发起任何网络请求；评分规则全部开源可改。
```

> ⚠️ 三个会让校验直接失败的坑：
> 1. **标题和正文之间不要有空行**，正文中每个「字段名：内容」必须在同一行，不能写成标签一行、内容一行
> 2. **项目地址不要用 Markdown 链接格式**，不要写成 `[mcd-desk](https://...)`
> 3. 在线试玩链接已写进正文，如果怕校验器对第二个链接敏感，把它删掉即可（项目地址那行必须保留）

提交后系统会在这个 Issue 下回复成功或失败通知。失败会写明原因，改完可以重新提交。

## 时间

- 报名截止：**2026-10-25 23:59**
- 定榜：**2026-10-26 00:00**（采集此时刻的 Star 数据）
- 排名完全由公开 Star 数决定，Star > 0 才进榜；前 100 名进获奖范围
