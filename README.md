# 每周热点素材库

一个可以**每周自动更新**、并**公开分享**的演讲素材网页。

每周一早上 9:00（北京时间），GitHub Actions 会自动抓取上一周的时事热点，生成新一期内容并部署到 GitHub Pages。页面按四个分区组织，每条素材包含：

- **事件概括**：可直接改写进讲稿的 2–3 句话；
- **视频链接**：点击跳转 B 站原视频；
- **评论区热评**：按点赞排序的真实评论摘录；
- **演讲切口**：一句话提示这条素材怎么用。

四个分区：民生经济 / 世界时政 / 科学突破 / 网络文化热点。

## 页面功能

- 周次下拉切换，保留最近 16 期，可回看往期；
- 顶部搜索：按标题、标签、概括、作者过滤（快捷键 `/`）；
- 数字键 `1`–`4` 跳转分区；
- 单条素材复制、整区素材复制（方便贴进 PPT 备注）；
- 深色 / 浅色模式；
- 打印 / 导出 PDF；
- 分享按钮复制当前周链接（`?week=2026-W42`）；
- 自动采集的周次会标注“自动采集”；B 站抓取受限时，少部分素材会标注“沿用”。

## 本地预览

双击 `index.html` 即可，无需服务器、无需安装依赖。

> 直接双击时页面不会实时抓取 B 站（浏览器跨域限制），显示的是 `data.js` 中已生成的内容。自动更新由 GitHub Actions 在服务器端完成。

## 部署到公网（GitHub Pages）

1. **新建仓库**：在 GitHub 新建一个 **Public** 仓库（免费版 Pages 需要公开仓库）。
2. **上传代码**：把本目录全部文件推到仓库默认分支（`main`）。

   > 不会用 git？在仓库页选择 `Add file → Upload files`，拖入 `index.html`、`app.js`、`data.js`、`data.json`、`favicon.svg`、`preview.png`、`scripts` 文件夹；然后 `Add file → Create new file`，文件名填 `.github/workflows/weekly.yml`，把本目录同名文件的内容粘贴进去。
3. **开启 Pages**：仓库 `Settings → Pages → Build and deployment → Source` 选择 **GitHub Actions**。
4. **首次运行**：进入 `Actions → 每周更新 → Run workflow`。勾选 `force` 会覆盖当前周；不勾选时，若当前周已存在则跳过。
5. **等待部署完成**：Actions 绿勾后，页面地址为  
   `https://<你的用户名>.github.io/<仓库名>/`
6. **以后无需操作**：每周一 UTC 01:00 自动运行。

可选：在 `Settings → Pages → Custom domain` 绑定自己的域名。

### 首次运行没有生成新一期？

如果当前周已经存在，脚本会跳过（避免覆盖）。到 `Actions` 里手动运行一次，勾选 `force`。

## 自动更新是怎么工作的

```
GitHub Actions（每周一 09:00）
  └─ node scripts/collect.mjs
       ├─ 中国新闻网 RSS（滚动 / 国际 / 财经 / 教育 / 健康）
       ├─ 百度热搜（热搜 / 财经 / 民生 / 文娱 / 国际）
       ├─ 选题、去重、分类
       ├─ B 站搜索 → 选视频 → 抓热评
       └─ 写入 data.json / data.js → 提交 → 部署 Pages
```

- 脚本无第三方依赖，只用 Node 20 内置的 `fetch` 与 `crypto`。
- B 站接口会做 wbi 签名、访客指纹轮换、失败重试；遇到风控会退避重试。
- 如果某一周 B 站整体不可用，脚本会保留上一期数据并标记失败，页面仍可正常访问。
- 抓取失败或素材不足时，`collection-report.json` 会记录原因。

### 可选：提高 B 站抓取成功率

在仓库 `Settings → Secrets and variables → Actions → New repository secret` 添加：

- Name: `BILI_COOKIE`
- Value: 你自己浏览器里 B 站的 Cookie（至少包含 `SESSDATA=...`）

不配置也能运行，但数据中心 IP 更容易触发 B 站风控。

### 可选：在自己的电脑上每周更新

如果希望用家庭宽带 IP（B 站成功率更高），可以不用云端定时：

```bash
node scripts/collect.mjs
git add data.json data.js collection-report.json
git commit -m "chore: weekly update"
git push
```

Windows 可用“任务计划程序”每周一执行这段命令；推送后 GitHub Pages 会自动重新部署。

## 文件结构

| 文件 | 说明 |
| --- | --- |
| `index.html` | 页面骨架与样式 |
| `app.js` | 周次切换、搜索、复制、主题等交互 |
| `data.json` | 全部周次的数据源（可读、可编辑） |
| `data.js` | 由 `data.json` 生成，页面实际加载的文件 |
| `scripts/collect.mjs` | 每周采集入口 |
| `scripts/lib/` | B 站客户端、新闻源、选题分类、数据写入 |
| `.github/workflows/weekly.yml` | 定时任务与 Pages 部署 |
| `preview.png` | 页面预览图 |

## 手动改内容

`data.json` 里每一期的结构：

```json
{
  "id": "2026-W42",
  "label": "第 42 周",
  "range": "2026.10.13 — 10.19",
  "updated": "2026-10-19 19:30",
  "editorial": true,
  "sections": [
    {
      "id": "livelihood",
      "no": "01",
      "title": "民生经济",
      "en": "LIVELIHOOD & ECONOMY",
      "note": "本期关键词：GDP / 国考",
      "items": [
        {
          "id": "2026-W42-livelihood-1",
          "date": "10.19",
          "sourceType": "中国新闻网",
          "title": "…",
          "summary": "…",
          "angle": "…",
          "tags": ["GDP"],
          "video": {
            "bvid": "BV1…",
            "title": "视频原标题",
            "author": "UP 主",
            "play": 12345,
            "reply": 67
          },
          "comments": [{ "u": "用户名", "like": 123, "t": "评论原文" }]
        }
      ]
    }
  ]
}
```

改完后用一个小脚本把 `data.json` 重新生成 `data.js`：

```bash
node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('data.json','utf8'));fs.writeFileSync('data.js','window.WEEKLY_DATA = '+JSON.stringify(d,null,2)+';\n')"
```

### 采集脚本参数

```bash
node scripts/collect.mjs                 # 生成当前周，已存在则跳过
node scripts/collect.mjs --force         # 覆盖当前周
node scripts/collect.mjs --dry           # 只写 data.preview.json/js，不动正式数据
node scripts/collect.mjs --limit=4       # 每个分区最多 4 条
node scripts/collect.mjs --min=8         # 少于 8 条新素材则失败，保留旧数据
node scripts/collect.mjs --offline       # 不访问 B 站，只用往期素材重排
node scripts/collect.mjs --week=2026-W43 # 指定周次（调试用）
```

## 常见问题

**页面 404 / 空白？**  
确认 Pages 的 Source 是 “GitHub Actions”，并且 `weekly.yml` 最近一次运行成功；首次部署后通常需要 1–2 分钟生效。

**某一周没有更新？**  
看 `Actions` 的运行日志和仓库里的 `collection-report.json`。B 站风控、新闻源临时不可用都可能导致采集失败；修复后手动 `Run workflow` 即可。

**科学突破分区经常“沿用”？**  
科学突破对选题要求较严，只收诺贝尔奖、航天、量子、脑机、国际标准等明确进展；没有足够新素材时，会用上一期补位并在页面标注“沿用”，避免用会议、展会等凑数。

**评论/视频版权？**  
评论为公开页面的原样摘录，仅代表网友观点；视频版权归原作者所有，页面只提供跳转链接。

## 数据来源

- 视频与评论：B 站公开接口（`/x/web-interface/view`、`/x/v2/reply`，按热度排序）
- 事件与数据：中国新闻网 RSS、百度热搜、国家统计局等公开报道
- 播放量、评论数为抓取时快照，会随时间变化
