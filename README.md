# AI 自动投简历 - Chrome 浏览器扩展

## 功能简介

AI 自动投简历是一款 Chrome 浏览器扩展，借助人工智能自动筛选和投递职位。支持 LinkedIn、Indeed 等主流招聘平台，采用 OpenAI 兼容格式，可对接多种 AI 服务。

## 技术栈

- TypeScript 5
- React 18
- Vite 6
- Chrome Extension Manifest V3

## 核心功能

- **AI 智能匹配**：根据简历和职位描述自动判断是否申请
- **一键投递**：自动化申请流程，无需手动操作
- **多平台支持**：LinkedIn Easy Apply、Indeed（更多平台开发中）
- **多 AI 提供商**：支持 OpenAI、Anthropic、通义千问、文心一言、智谱、DeepSeek 等 OpenAI 兼容格式
- **本地持久化**：申请状态自动保存到 Chrome 本地存储
- **并发控制**：Mutex/Semaphore 机制防止重复申请
- **错误恢复**：自动重试和错误报告机制

## 快速开始

### 环境要求

- Node.js 18+
- pnpm
- AI 服务 API 密钥

### 安装步骤

1. 克隆仓库

   ```bash
   git clone https://github.com/XiaomingX/ai-job-auto-apply
   cd ai-job-auto-apply
   ```

2. 安装依赖

   ```bash
   pnpm install
   ```

3. 配置 AI 服务

   在项目根目录创建 `.env` 文件：

   ```
   AI_BASE_URL=https://api.openai.com
   AI_API_KEY=sk-your-api-key-here
   AI_MODEL_NAME=gpt-4
   ```

   > 支持任何 OpenAI 兼容的 API 端点，如 Anthropic、通义千问、DeepSeek 等。

4. 构建扩展

   ```bash
   pnpm build
   ```

5. 加载扩展

   - 打开 Chrome，访问 `chrome://extensions/`
   - 开启「开发者模式」
   - 点击「加载已解压的扩展程序」，选择 `dist` 目录

## 项目结构

```
src/
├── App.tsx                    # 主界面组件（含 AI 配置）
├── main.tsx                   # 入口文件
├── background/                # 后台服务模块
│   ├── index.ts               # Service Worker 入口
│   ├── message-router.ts      # 消息路由分发
│   ├── tab-manager.ts         # 标签页管理
│   ├── script-injector.ts     # 脚本注入
│   └── retry-handler.ts       # 重试与超时处理
├── domain/                    # 领域层
│   ├── models/                # 领域模型（JobProfile, WorkExperience, Education）
│   ├── interfaces/            # 平台接口（JobPlatform）
│   └── platforms/             # 平台适配器（LinkedIn, Indeed, Registry）
├── linkedin/                  # LinkedIn 平台逻辑
│   ├── content.ts             # Content Script
│   ├── externalJobs.ts        # 外部职位申请
│   ├── selectors.ts           # DOM 选择器
│   └── utils.ts               # 工具函数
├── indeed/                    # Indeed 平台逻辑
│   ├── content.ts             # Content Script
│   └── utils.ts               # 工具函数
├── lib/                       # 通用库
│   ├── ai/                    # AI 服务抽象层
│   │   ├── types.ts           # 类型定义
│   │   ├── openai-provider.ts # OpenAI 兼容实现
│   │   ├── provider-factory.ts# 提供商工厂
│   │   └── config.ts          # 配置验证
│   ├── persistence.ts         # Chrome Storage 持久化
│   ├── dom-cache.ts           # DOM 查询缓存
│   ├── concurrency.ts         # Mutex/Semaphore 并发控制
│   ├── constants.ts           # UI 常量
│   ├── platform-maps.ts       # 平台参数映射
│   └── status-codes.ts        # 消息类型定义
└── components/                # UI 组件
```

## 开发指南

### 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm lint` | 代码检查 |

### AI 配置

支持两种配置方式：

1. **环境变量**（构建时）：在 `.env` 文件中设置 `AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL_NAME`
2. **插件界面**（运行时）：在扩展弹窗的「AI 配置」标签页中配置，数据仅存储在本地

### 架构设计

项目采用 DDD（领域驱动设计）分层架构：

- **领域层** (`domain/`)：定义平台接口和领域模型
- **应用层** (`background/`)：消息路由和任务调度
- **基础设施层** (`lib/`)：AI 抽象、持久化、并发控制
- **表现层** (`linkedin/`, `indeed/`)：平台具体的 Content Script

## 贡献者

- [sushen](https://github.com/sushen123) — 原始作者

## 免责声明

本工具仅供学习交流使用。使用者需遵守各招聘平台的服务条款，因使用本工具产生的任何后果由使用者自行承担。

## 许可证

MIT License
