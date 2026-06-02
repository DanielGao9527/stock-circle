# 持仓圈

持仓圈是一个面向小圈子使用的私有持仓归档与复盘工具，支持：

- 持仓快照记录与历史回看
- 圈内公开持仓页
- 操作流导出（Markdown / JSON / CSV / Plain Text）
- 快速发布股票相关记录
- JSON 导入持仓草稿
- 帖子与持仓快照评论
- 基础 PWA 支持，可添加到 iPhone 主屏幕

## 技术栈

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Supabase Auth + Database

## 本地运行

1. 安装依赖

```bash
npm install
```

2. 配置环境变量 `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase anon key
```

3. 启动开发服务器

```bash
npm run dev
```

默认地址：

```text
http://localhost:3000
```

## 必跑 SQL

上线前请在 Supabase SQL Editor 中按顺序执行 `supabase/migrations` 里的 SQL。

如果你之前库结构比较旧，至少要确保下面两份已经执行：

- `supabase/migrations/0009_step16_portfolio_public_export.sql`
- `supabase/migrations/0008_comments.sql`

它们分别负责：

- Step 16 的持仓公开页 / 操作流导出所需字段与兼容修复
- Step 17 的评论表、软删除和 RLS 策略

## 关键功能路径

- `/` 首页动态
- `/quick` 快速发布
- `/stocks` 股票总览
- `/portfolio` 我的持仓
- `/portfolio/export` 导出操作流
- `/portfolios` 圈内公开持仓
- `/me` 我的账号
- `/portfolio` 持仓 JSON 导入

## PWA 与移动端

项目已包含：

- `manifest.webmanifest`
- iPhone `apple-web-app` 元数据
- 应用图标占位图
- 固定底部导航
- 移动端表单字号优化
- 导出结果区移动端可复制 / 可滚动

在 iPhone Safari 中可以通过“添加到主屏幕”作为轻量应用使用。

说明：

- iPhone PWA 仍然有系统级限制
- 当前版本重点是“可添加到主屏、可正常使用”，不是完整离线应用

## 质量检查

提交前建议至少运行：

```bash
npm run lint
npm run build
```

## 部署到 Vercel

1. 推送代码到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. 在 Supabase SQL Editor 执行迁移 SQL
5. 重新部署

## 当前说明

当前仓库已经通过：

- `npm run lint`
- `npm run build`

如果部署后发现页面可访问但数据写入失败，优先检查 Supabase SQL migration 是否完整执行，以及 RLS policy 是否已经同步到线上库。
