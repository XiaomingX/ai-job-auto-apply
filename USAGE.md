# 使用说明文档

## 一、快速开始

### 1.1 环境准备

你需要准备：
- Node.js 18 或更高版本
- pnpm 包管理器（`npm install -g pnpm`）
- Chrome 浏览器
- AI 服务 API 密钥（支持 OpenAI、Anthropic、通义千问等）

### 1.2 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/XiaomingX/ai-job-auto-apply
cd ai-job-auto-apply

# 2. 安装依赖
pnpm install

# 3. 配置 AI 服务（在项目根目录创建 .env 文件）
echo "AI_BASE_URL=https://api.openai.com" > .env
echo "AI_API_KEY=你的API密钥" >> .env
echo "AI_MODEL_NAME=gpt-4" >> .env

# 4. 构建扩展
pnpm build

# 5. 加载到 Chrome
# 打开 chrome://extensions/ → 开启开发者模式 → 加载已解压的扩展程序 → 选择 dist 目录
```

---

## 二、功能说明

### 2.1 求职档案

求职档案是你的个人信息集合，包含：
- 基本信息（姓名、邮箱、电话）
- 工作经历
- 教育背景
- 技能和语言
- 简历文件（PDF）

**使用方法**：
1. 点击扩展图标，打开控制面板
2. 在「求职档案」标签页填写/选择你的档案
3. 确保简历 PDF 已上传

### 2.2 招聘平台

支持的招聘平台：
- LinkedIn（Easy Apply 自动填写）
- Indeed（自动申请）

**使用方法**：
1. 切换到「招聘平台」标签页
2. 开启你想投递的平台
3. 设置每个平台的申请数量限制

### 2.3 筛选条件

筛选条件帮助 AI 精准匹配职位：

| 条件 | 说明 |
|------|------|
| 经验要求 | 初级、中级、高级、总监、高管 |
| 工作类型 | 全职、兼职、合同工、实习等 |
| 发布日期 | 过去24小时、过去一周、过去一个月 |
| 办公方式 | 现场办公、远程办公、混合办公 |

### 2.4 AI 配置

本插件支持多种 AI 服务，采用 OpenAI 兼容 API 格式。

**配置方式**：

1. **通过插件界面配置**（推荐，数据仅存本地）
   - 打开扩展弹窗
   - 切换到「AI 配置」标签页
   - 填写 API 地址、API 密钥、模型名称

2. **通过环境变量配置**（构建时）
   - 在 `.env` 文件中设置 `AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL_NAME`

**支持的 AI 服务**：

| 服务 | API 地址 | 模型示例 |
|------|----------|----------|
| OpenAI | `https://api.openai.com` | `gpt-4`、`gpt-4o` |
| DeepSeek | `https://api.deepseek.com` | `deepseek-chat` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus`、`qwen-turbo` |
| 智谱 | `https://open.bigmodel.cn/api/paas/v4` | `glm-4` |
| Anthropic | `https://api.anthropic.com/v1` | `claude-3-sonnet` |
| 文心一言 | `https://aip.baidubce.com` | `ernie-bot` |

> 隐私提示：AI 配置仅存储在你的浏览器本地，不会上传到任何服务器。

### 2.5 自动投递

**启动方式**：
1. 选择求职档案
2. 设置筛选条件
3. 配置 AI 服务
4. 点击「开始自动投递」按钮

**投递流程**：
1. 系统打开招聘平台搜索页面
2. 遍历职位列表
3. AI 分析简历与职位匹配度
4. 匹配则自动填写申请表单
5. 提交申请

---

## 三、架构概览

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Chrome Extension                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐                                            │
│  │   Popup UI       │  ← 用户交互界面                            │
│  │   (App.tsx)      │                                            │
│  └────────┬────────┘                                            │
│           │ chrome.runtime.sendMessage                          │
│           ↓                                                      │
│  ┌─────────────────┐                                            │
│  │   Background     │  ← 服务协调中心（模块化）                   │
│  │   (background/)  │                                            │
│  │   ├─ index.ts    │                                            │
│  │   ├─ message-router.ts                                       │
│  │   ├─ tab-manager.ts                                          │
│  │   ├─ script-injector.ts                                      │
│  │   └─ retry-handler.ts                                        │
│  └────────┬────────┘                                            │
│           │ chrome.tabs.sendMessage                             │
│           ↓                                                      │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │   LinkedIn       │  │   Indeed         │                       │
│  │   Content Script │  │   Content Script │                       │
│  └─────────────────┘  └─────────────────┘                       │
│                                                                 │
│  ┌─────────────────────────────────────────┐                    │
│  │   AI Provider Abstraction (lib/ai/)     │                    │
│  │   支持 OpenAI 兼容格式的任意 AI 服务     │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 目录结构

```
src/
├── App.tsx                 # 主界面组件（含 AI 配置标签页）
├── main.tsx                # 入口文件
│
├── background/             # 后台服务（模块化）
│   ├── index.ts            # Service Worker 入口
│   ├── message-router.ts   # 消息路由分发
│   ├── tab-manager.ts      # 标签页管理
│   ├── script-injector.ts  # 脚本注入
│   └── retry-handler.ts    # 重试与超时处理
│
├── domain/                 # 领域层（DDD）
│   ├── models/             # 领域模型
│   ├── interfaces/         # 平台接口定义
│   └── platforms/          # 平台适配器实现
│
├── lib/                    # 基础设施层
│   ├── ai/                 # AI 服务抽象
│   │   ├── types.ts        # 类型定义
│   │   ├── openai-provider.ts  # OpenAI 兼容实现
│   │   ├── provider-factory.ts # 工厂方法
│   │   └── config.ts       # 配置验证
│   ├── persistence.ts      # Chrome Storage 持久化
│   ├── dom-cache.ts        # DOM 查询缓存
│   ├── concurrency.ts      # Mutex/Semaphore 并发控制
│   ├── constants.ts        # 常量定义
│   ├── platform-maps.ts    # 平台参数映射
│   └── status-codes.ts     # 状态码和消息类型
│
├── linkedin/               # LinkedIn 平台
│   ├── content.ts          # Content Script 业务逻辑
│   ├── selectors.ts        # DOM 选择器
│   ├── utils.ts            # 工具函数
│   └── externalJobs.ts     # 外部职位处理
│
├── indeed/                 # Indeed 平台
│   ├── content.ts          # Content Script 业务逻辑
│   └── utils.ts            # 工具函数
│
└── components/             # UI 组件
```

---

## 四、核心流程

### 4.1 自动投递流程

```
用户点击「开始自动投递」
        │
        ↓
Background 接收消息（message-router.ts）
        │
        ├─→ 清理旧数据（tab-manager.ts）
        │
        ├─→ 打开 LinkedIn 标签页
        │   └─→ 注入 Content Script（script-injector.ts）
        │       └─→ 开始遍历职位
        │
        └─→ 打开 Indeed 标签页
            └─→ 注入 Content Script
                └─→ 开始遍历职位
```

### 4.2 职位处理流程

```
遍历职位列表
    │
    ↓
点击职位卡片
    │
    ↓
提取职位描述
    │
    ↓
AI 分析匹配度（lib/ai/openai-provider.ts）
    │
    ├─→ 不匹配 → 跳过
    │
    └─→ 匹配 → 点击申请按钮
                │
                ├─→ Easy Apply → 自动填写表单
                │
                └─→ 外部申请 → 打开新标签页
```

### 4.3 表单填写流程

```
识别表单字段
    │
    ↓
对于每个字段：
    │
    ├─→ 姓名/邮箱/电话 → 直接填充
    │
    ├─→ 工作经历 → 自动填写并展开
    │
    ├─→ 教育背景 → 自动填写并展开
    │
    └─→ 其他字段 → AI 生成回答
            │
            ↓
    点击「下一步」或「提交」
```

---

## 五、常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器，监听文件变化 |
| `pnpm build` | 构建生产版本到 `dist` 目录 |
| `pnpm lint` | 运行 ESLint 代码检查 |

---

## 六、常见问题

### Q1: 扩展加载后没有反应？

检查：
1. `.env` 文件是否正确配置了 `AI_API_KEY`
2. 是否重新运行了 `pnpm build`
3. Chrome 是否开启了开发者模式
4. 在 LinkedIn/Indeed 页面按 F12 查看 Console 日志

### Q2: AI 填写的表单不准确？

可能原因：
1. 简历内容不够详细
2. 尝试使用更强的模型（如 gpt-4）
3. AI 服务响应异常，检查 API 配置

### Q3: 申请数量达到限制后怎么办？

扩展会在达到限制后自动停止。你可以在「招聘平台」标签页调整限制数量。

### Q4: 如何查看运行日志？

1. 在 LinkedIn/Indeed 页面按 F12 打开开发者工具
2. 切换到 Console 面板
3. 查看以 `[AI]`、`[LinkedIn]`、`[Indeed]` 开头的日志

### Q5: 如何添加新的招聘平台？

参考 `src/domain/interfaces/platform.ts` 中的 `JobPlatform` 接口：
1. 在 `src/domain/platforms/` 中创建新的平台适配器
2. 实现 `JobPlatform` 接口的所有方法
3. 在 `platform-registry.ts` 中注册新平台
4. 在 `background/message-router.ts` 中添加消息处理
5. 在 `manifest.json` 中添加 Content Script 配置
