# 投程 JobTrail

投程是一款手机优先的个人求职进度管理工具。它记录投递当前所处阶段、完整变更时间线和下一步行动。

项目范围、关键决定和里程碑以 [MAINLINE.md](./MAINLINE.md) 为准。每完成一个关键步骤，都必须同步更新该文档。

## 本地运行

需要 Node.js 20.9 或更高版本。

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:3000`。

## 验证

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## MVP 数据说明

当前版本使用浏览器 `localStorage` 保存数据，适合单设备 MVP 验证。清除浏览器站点数据会同时清除投递记录。云同步和账号系统在 MVP 之后接入。
