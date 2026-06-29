# 使用说明文档

## 一、快速开始

### 1.1 环境准备

你需要准备：
- Node.js 18 或更高版本
- pnpm 包管理器
- Chrome 浏览器
- AI 服务 API 密钥（支持 OpenAI、Anthropic、通义千问等）

### 1.2 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/XiaomingX/ai-job-auto-apply

# 2. 安装依赖
pnpm install

# 3. 配置 AI 服务
# 在项目根目录创建 .env 文件，写入：
AI_BASE_URL=https://api.openai.com
AI_API_KEY=你的API密钥
AI_MODEL_NAME=gpt-4

# 4. 启动开发服务器
pnpm dev
```

### 1.3 加载扩展

1. 打开 Chrome 浏览器，地址栏输入 `chrome://extensions/`
2. 开启右上角的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择项目中的 `dist` 文件夹

---

## 二、功能说明

### 2.1 求职档案

求职档案是你的个人信息集合，包含：
- 基本信息（姓名、邮箱、电话）
- 工作经历
- 教育背景
- 技能和语言
- 简历文件

**使用方法**：
1. 点击扩展图标，打开控制面板
2. 在「求职档案」标签页选择你的档案
3. 可以查看档案详情

### 2.2 招聘平台

支持的招聘平台：
- LinkedIn（已实现）
- Indeed（已实现）
- Glassdoor（待实现）
- Monster（待实现）

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
| 行业领域 | 科技、医疗、金融、教育等 |

### 2.4 自动投递

**启动方式**：
1. 选择求职档案
2. 设置筛选条件
3. 点击「开始自动投递」按钮

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
│  │   Background     │  ← 服务协调中心                            │
│  │   (background.ts)│                                            │
│  └────────┬────────┘                                            │
│           │ chrome.tabs.sendMessage                             │
│           ↓                                                      │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │   LinkedIn       │  │   Indeed         │                       │
│  │   Content Script │  │   Content Script │                       │
│  └─────────────────┘  └─────────────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 目录结构

```
src/
├── App.tsx                 # 主界面组件
├── main.tsx                # 入口文件
├── background.ts           # 后台服务
│
├── components/             # UI 组件
│   └── ui/                 # 基础 UI 组件（按钮、输入框等）
│
├── hooks/                  # React Hooks
│   └── use-toast.ts        # Toast 提示 Hook
│
├── lib/                    # 工具库
│   ├── constants.ts        # 常量定义
│   ├── platform-maps.ts    # 平台参数映射
│   ├── status-codes.ts     # 状态码和消息类型
│   └── utils.ts            # 工具函数
│
├── linkedin/               # LinkedIn 平台
│   ├── content.ts          # 业务逻辑
│   ├── selectors.ts        # DOM 选择器
│   ├── utils.ts            # 工具函数
│   ├── externalJobs.ts     # 外部职位处理
│   └── pdfUtils.ts         # PDF 工具
│
└── indeed/                 # Indeed 平台
    ├── content.ts          # 业务逻辑
    └── utils.ts            # 工具函数
```

---

## 四、核心流程

### 4.1 自动投递流程

```
用户点击「开始自动投递」
        │
        ↓
Background 接收消息
        │
        ├─→ 清理旧数据
        │
        ├─→ 打开 LinkedIn 标签页
        │   └─→ 注入 Content Script
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
AI 分析匹配度
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

## 六、AI 配置

本插件支持多种 AI 服务提供商，采用 OpenAI 兼容 API 格式。

### 6.1 配置方式

1. **通过插件界面配置**（推荐）
   - 打开插件设置页面
   - 找到"AI 配置"部分
   - 填写以下信息：
     - **API 地址**：如 `https://api.openai.com` 或 `https://api.anthropic.com`
     - **API 密钥**：你的 API Key
     - **模型名称**：如 `gpt-4`、`claude-3-opus-20240229`

2. **通过环境变量配置**（开发者模式）

   创建 `.env` 文件：
   ```env
   AI_BASE_URL=https://api.openai.com
   AI_API_KEY=your-api-key
   AI_MODEL_NAME=gpt-4
   ```

### 6.2 支持的 AI 服务

| 服务 | API 地址 | 模型示例 |
|------|----------|----------|
| OpenAI | `https://api.openai.com` | `gpt-4`、`gpt-4-turbo` |
| Anthropic | `https://api.anthropic.com` | `claude-3-opus-20240229` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode` | `qwen-turbo`、`qwen-plus` |
| 文心一言 | `https://aip.baidubce.com` | `ernie-bot` |
| 智谱 | `https://open.bigmodel.cn/api/paas` | `glm-4` |
| DeepSeek | `https://api.deepseek.com` | `deepseek-chat` |
| 其他 OpenAI 兼容服务 | 自定义 URL | 自定义模型 |

### 6.3 配置验证

插件会自动验证配置：
- 检查 API 地址格式
- 检查 API 密钥是否为空
- 测试 API 连接（可选）

配置存储在 Chrome Storage 中，无需手动管理。

---

## 七、常见问题

### Q1: 扩展加载后没有反应？

检查：
1. `.env` 文件是否正确配置了 `AI_API_KEY`
2. 是否重新运行了 `pnpm build`
3. Chrome 是否开启了开发者模式

### Q2: AI 填写的表单不准确？

可能原因：
1. 简历内容不够详细
2. 职位描述语言与简历不匹配
3. AI 服务响应异常

### Q3: 申请数量达到限制后怎么办？

扩展会在达到限制后自动停止。你可以在「招聘平台」标签页调整限制数量。

### Q4: 如何添加新的招聘平台？

参考 `src/linkedin/` 或 `src/indeed/` 的实现：
1. 创建新的平台目录
2. 实现 `content.ts`（业务逻辑）
3. 实现 `selectors.ts`（DOM 选择器）
4. 在 `background.ts` 中添加平台支持
5. 在 `manifest.json` 中添加 Content Script 配置
