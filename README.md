# AI 自动投简历 - Chrome 浏览器扩展

## 功能简介

AI 自动投简历是一款 Chrome 浏览器扩展，借助人工智能自动筛选和投递职位。支持 LinkedIn、Indeed 等主流招聘平台，采用 OpenAI 兼容格式，可对接多种 AI 服务。

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| TypeScript | 5.x | 类型安全 |
| React | 18.x | UI 框架 |
| Vite | 5.x | 构建工具 |
| Tailwind CSS | 3.x | 样式框架 |
| Radix UI | 1.x | 无样式组件库 |
| Chrome Extension | Manifest V3 | 扩展规范 |

## 核心功能

- **AI 智能匹配**：根据简历和职位描述自动判断是否申请
- **一键投递**：自动化申请流程，无需手动操作
- **多平台支持**：LinkedIn Easy Apply、Indeed（更多平台开发中）
- **多 AI 提供商**：支持 OpenAI、Anthropic、通义千问、智谱、DeepSeek、小米 MiMo 等 OpenAI 兼容格式
- **本地持久化**：申请状态自动保存到 Chrome 本地存储
- **并发控制**：Mutex/Semaphore 机制防止重复申请
- **错误恢复**：自动重试和错误报告机制

---

## 快速开始

### 第一步：环境准备

确保你的电脑已安装：

- **Node.js** 18 或更高版本（[下载](https://nodejs.org/)）
- **pnpm** 包管理器（安装命令：`npm install -g pnpm`）
- **Chrome 浏览器**

验证安装：
```bash
node -v   # 应显示 v18.x 或更高
pnpm -v   # 应显示 8.x 或更高
```

### 第二步：克隆并安装

```bash
# 克隆项目
git clone https://github.com/XiaomingX/ai-job-auto-apply
cd ai-job-auto-apply

# 安装依赖
pnpm install
```

### 第三步：配置 AI 服务

在项目根目录创建 `.env` 文件：

```env
AI_BASE_URL=https://api.openai.com
AI_API_KEY=sk-你的API密钥
AI_MODEL_NAME=gpt-4
```

> **支持的 AI 服务**（任何 OpenAI 兼容格式均可）：
>
> | 服务 | API 地址 | 模型示例 |
> |------|----------|----------|
> | OpenAI | `https://api.openai.com` | `gpt-4o`、`gpt-4-turbo` |
> | Anthropic | `https://api.anthropic.com/v1` | `claude-sonnet-4-6`、`claude-haiku-4-5` |
> | DeepSeek | `https://api.deepseek.com` | `deepseek-chat`、`deepseek-coder` |
> | 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus`、`qwen-turbo` |
> | 智谱 | `https://open.bigmodel.cn/api/paas/v4` | `glm-4`、`glm-4-flash` |
> | 小米 MiMo | `https://api.mimo.xiaomi.com/v1` | `mimo-v2.5-pro` |

### 第四步：构建扩展

```bash
pnpm build
```

构建成功后，`dist` 目录即为扩展文件。

### 第五步：加载到 Chrome

1. 打开 Chrome 浏览器，地址栏输入 `chrome://extensions/`
2. 开启右上角的 **「开发者模式」** 开关
3. 点击 **「加载已解压的扩展程序」**
4. 选择项目中的 `dist` 文件夹
5. 扩展图标出现在浏览器工具栏中即表示安装成功

### 第六步：开始使用

1. 点击浏览器工具栏中的扩展图标
2. 在弹出面板中配置你的 **求职档案**（姓名、邮箱、简历等）
3. 切换到 **「AI 配置」** 标签页，确认 AI 服务配置正确
4. 选择要投递的平台（LinkedIn / Indeed）
5. 点击 **「开始自动投递」**

---

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
├── indeed/                    # Indeed 平台逻辑
├── lib/                       # 通用库
│   ├── ai/                    # AI 服务抽象层
│   ├── persistence.ts         # Chrome Storage 持久化
│   ├── dom-cache.ts           # DOM 查询缓存
│   └── concurrency.ts         # Mutex/Semaphore 并发控制
└── components/                # UI 组件
```

## 开发指南

### 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器（热更新） |
| `pnpm build` | 构建生产版本到 `dist` 目录 |
| `pnpm lint` | 运行 ESLint 代码检查 |

### AI 配置方式

支持两种配置方式：

1. **环境变量**（构建时）：在 `.env` 文件中设置 `AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL_NAME`
2. **插件界面**（运行时）：在扩展弹窗的「AI 配置」标签页中配置，数据仅存储在本地 Chrome Storage

### 架构设计

项目采用 DDD（领域驱动设计）分层架构：

- **领域层** (`domain/`)：定义平台接口和领域模型
- **应用层** (`background/`)：消息路由和任务调度
- **基础设施层** (`lib/`)：AI 抽象、持久化、并发控制
- **表现层** (`linkedin/`, `indeed/`)：平台具体的 Content Script

---

## 常见问题

**Q: 扩展加载后没有反应？**
A: 检查 `.env` 文件是否正确配置了 `AI_API_KEY`，并重新运行 `pnpm build`。

**Q: AI 填写的表单不准确？**
A: 确保简历内容详细，或尝试使用更强的模型（如 gpt-4）。

**Q: 如何查看扩展运行日志？**
A: 在 LinkedIn/Indeed 页面按 F12 打开开发者工具，查看 Console 面板。

**Q: 支持哪些招聘平台？**
A: 目前支持 LinkedIn 和 Indeed，更多平台开发中。

---

## 贡献者

- [sushen](https://github.com/sushen123) — 原始作者

## 免责声明

本工具仅供学习交流使用。使用者需遵守各招聘平台的服务条款，因使用本工具产生的任何后果由使用者自行承担。

## 许可证

MIT License
