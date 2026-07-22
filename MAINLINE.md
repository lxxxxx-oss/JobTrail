# 投程（JobTrail）MVP 主线

> 这是项目的唯一主线文档。产品范围、关键决定、里程碑状态和下一步都以此为准。
> 主线允许修改，但任何修改都必须记录原因和影响；每完成一个关键步骤，都要同步更新本文档。

## 1. 产品定义

投程是一款手机优先的个人求职进度管理工具，帮助用户记录每次投递、追踪面试进展，并明确下一步行动。

- 产品名：投程
- 英文名：JobTrail
- Slogan：投递有迹，前程可见
- 首发形态：响应式网站 + PWA
- 核心用户：正在集中投递实习、校招或社招岗位的个人求职者
- 核心价值：不只保存“现在到哪一步”，还保存“发生过什么”和“接下来做什么”

## 2. MVP 成功闭环

用户可以完成以下闭环，即视为 MVP 成立：

1. 新建一条公司岗位记录。
2. 在看板中看到该记录并变更阶段。
3. 每次阶段变化自动形成时间线事件。
4. 为记录设置下一步行动和时间，并在“今日”看到提醒。
5. 查看投递数、进面率和 Offer 率。
6. 刷新或重新打开页面后，数据仍然存在。

## 3. 默认状态主线

主线可由产品迭代调整；MVP 先固定默认阶段，不做用户自定义阶段。

```text
待投递 → 已投递 → 测评/笔试 → 进面 → 一面 → 二面 → HR面/终面 → Offer → 已接受/已入职
```

任意阶段可以结束为：

- 已淘汰
- 主动放弃
- 长期无回复

### 状态规则

- `applications.currentStage` 保存当前阶段。
- `applicationEvents` 保存每次变化的历史，禁止只覆盖当前阶段。
- 状态可以前进、回退或直接跳转；真实求职流程并不总是线性的。
- 每次变更至少记录：原阶段、新阶段、时间。

## 4. MVP 范围

### 必须完成

- [x] 响应式应用外壳与 PWA 基础配置
- [x] 今日概览
- [x] 投递看板
- [x] 新增、编辑、删除投递记录
- [x] 阶段变更与自动时间线
- [x] 下一步行动与日期
- [x] 搜索和阶段筛选
- [x] 基础统计：总投递、进面率、Offer 率、待办数
- [x] 本地持久化
- [x] 空状态、基础错误处理与删除确认
- [x] 构建、类型检查和关键流程测试

### 明确不进入 MVP

- 用户注册与多端同步
- Supabase 或其他云数据库
- 微信小程序
- 邮件、短信或微信通知
- AI 提取 JD、面试复盘或简历分析
- 文件上传
- 自定义阶段
- 团队协作与公开分享

## 5. MVP 技术决定

为了先验证产品闭环，MVP 采用本地优先架构，避免登录和云服务阻塞核心体验。

- 框架：Next.js App Router + React + TypeScript
- 样式：Tailwind CSS
- 组件：项目内轻量组件，不引入完整组件库
- 表单：React Hook Form + Zod
- 客户端状态：React Context + Reducer
- 持久化：localStorage，带数据版本号
- ID：浏览器 `crypto.randomUUID()`
- 测试：Vitest + Testing Library
- 端到端测试：Playwright（在核心页面稳定后补充）
- 部署目标：Vercel

### 后续云端迁移边界

界面不直接散落读写 `localStorage`。所有数据操作收口到 Repository 接口；未来接入 Supabase 时替换实现，不重写页面与业务规则。

## 6. MVP 数据模型

### Application

```ts
interface Application {
  id: string
  company: string
  role: string
  currentStage: ApplicationStage
  appliedAt?: string
  source?: string
  location?: string
  salaryRange?: string
  jobUrl?: string
  priority: 'high' | 'medium' | 'low'
  nextAction?: string
  nextActionAt?: string
  notes?: string
  createdAt: string
  updatedAt: string
}
```

### ApplicationEvent

```ts
interface ApplicationEvent {
  id: string
  applicationId: string
  type: 'created' | 'stage_changed' | 'note'
  fromStage?: ApplicationStage
  toStage?: ApplicationStage
  content?: string
  occurredAt: string
}
```

## 7. 页面与交互

### 今日

- 显示核心统计。
- 显示逾期、今天和未来 7 天的下一步行动。
- 提供“新增投递”主按钮。

### 看板

- 按阶段分列，卡片展示公司、岗位、优先级和下一步日期。
- 桌面端横向看板；手机端横向滚动。
- MVP 使用明确的阶段菜单切换；拖拽作为增强项，不阻塞闭环。
- 支持关键词搜索和阶段筛选。

### 记录详情

- 查看和编辑所有岗位信息。
- 快速更改阶段。
- 按时间倒序展示事件时间线。
- 支持删除并二次确认。

## 8. 里程碑

### M0：主线确定

- [x] 确定产品名、形态和核心用户
- [x] 确定 MVP 闭环与排除项
- [x] 确定默认状态主线
- [x] 确定本地优先技术方案

状态：已完成

### M1：项目骨架

- [x] Next.js + TypeScript + Tailwind 可运行
- [x] 响应式导航和视觉基础
- [x] PWA Manifest 与图标

状态：已完成

### M2：核心数据闭环

- [x] 数据模型和 Repository
- [x] 空数据初始化与 localStorage 持久化
- [x] 新增、编辑、删除记录
- [x] 阶段变更自动生成事件

状态：已完成

### M3：核心页面

- [x] 今日概览与待办
- [x] 投递看板与筛选
- [x] 记录详情与时间线
- [x] 基础统计

状态：已完成

### M4：质量与交付

- [x] 响应式检查
- [x] 空状态和错误状态
- [x] 单元测试与关键流程测试
- [x] 生产构建通过
- [x] README 和运行说明

状态：已完成

## 9. 变更记录

### 2026-07-22

- 创建主线文档。
- 将 MVP 从云端架构调整为本地优先：先验证记录、跟进和复盘闭环，云同步放到 MVP 之后。
- 明确阶段切换为 MVP 必需，拖拽为增强项。
- 完成 Next.js 响应式网站和 PWA 基础配置。
- 完成投递 CRUD、状态事件、下一步待办、看板、详情时间线、筛选和基础统计。
- 数据读写通过 Repository 收口，当前实现为带版本号的 localStorage。
- 移除构建期 Google Fonts 依赖，使用系统字体，保证离线和国内网络环境可构建。
- 将 TypeScript 固定在 6.x、ESLint 固定在 9.x，匹配当前 Next.js 工具链。
- 验证通过：TypeScript、ESLint、8 个单元测试和 Next.js 生产构建。
- 浏览器关键流程通过：新建记录 → 推进到一面 → 自动时间线 → 刷新后数据保留。
- 响应式检查通过：1280px 桌面和 390px 手机视口均无横向溢出；浏览器控制台无错误。

## 10. 当前下一步

MVP 已完成。下一步进入真实使用验证：连续使用一周，重点记录新增一条投递所需时间、遗漏跟进次数和最常使用的视图；根据反馈决定优先做云同步、拖拽看板还是提醒通知。任何范围调整继续记录在本文档。
