# 架构分析与改进计划

## 一、系统概述

### 1.1 系统定位

这是一个 Chrome 浏览器扩展，核心功能是**自动化职位申请**。系统通过 AI（Gemini）分析简历与职位的匹配度，自动在 LinkedIn、Indeed 等招聘平台上填写申请表单并投递。

### 1.2 核心业务流程

```
用户配置 → 选择档案 → 设置筛选条件 → 启动自动投递
    ↓
Background Service Worker
    ↓
打开招聘平台标签页 → Content Script 注入
    ↓
遍历职位列表 → AI 匹配判断 → 自动填写表单 → 提交申请
```

---

## 二、DDD 视角下的架构分析

### 2.1 识别限界上下文（Bounded Context）

从第一性原理出发，这个系统的**核心领域**是「自动化求职」。通过分析代码，可以识别出以下限界上下文：

```
┌─────────────────────────────────────────────────────────────────┐
│                    自动化求职系统                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  用户配置上下文  │    │  求职策略上下文  │    │  平台适配上下文  │      │
│  │              │    │              │    │              │      │
│  │ - 求职档案    │    │ - 筛选条件    │    │ - LinkedIn   │      │
│  │ - 工作经历    │    │ - AI 匹配    │    │ - Indeed     │      │
│  │ - 教育背景    │    │ - 申请限制    │    │ - (可扩展)    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  表单填写上下文  │    │  消息通信上下文  │    │  状态管理上下文  │      │
│  │              │    │              │    │              │      │
│  │ - 字段识别    │    │ - Chrome API │    │ - 申请进度    │      │
│  │ - AI 填充    │    │ - 事件分发    │    │ - 错误处理    │      │
│  │ - 表单提交    │    │ - 重试机制    │    │ - 持久化      │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 当前架构的精妙之处

**1. Chrome Extension 架构选型正确**

Manifest V3 的 Service Worker + Content Script 架构是正确的选择：
- `background.ts` 作为 Service Worker 处理跨页面协调
- Content Script 注入到招聘平台页面，直接操作 DOM
- 通过 `chrome.runtime.sendMessage` 实现松耦合通信

**2. 平台抽象的直觉**

`linkedin/` 和 `indeed/` 目录的分离体现了对「平台适配」的直觉理解，每个平台有自己的：
- `content.ts` — 业务逻辑
- `selectors.ts` — DOM 选择器
- `utils.ts` — 工具函数

**3. AI 能力的解耦**

AI 功能（Gemini API）被封装在 `lib/GeminiAi.ts`，与业务逻辑分离，便于替换 AI 服务。

---

### 2.3 架构边界存在的问题

**问题 1：领域模型缺失**

当前的数据类型定义（`JobProfile`、`WorkExperience`、`Education`）直接嵌入在 `App.tsx` 中，没有独立的领域模型层。这意味着：
- 类型定义无法被其他模块复用
- 业务规则散落在各处
- 无法进行领域验证

**问题 2：平台适配层缺乏统一接口**

LinkedIn 和 Indeed 的 Content Script 虽然分目录存放，但没有统一的接口定义。每个平台的实现方式不同，导致：
- 新增平台时没有明确的契约
- 无法进行平台间的统一测试
- 业务逻辑与平台实现耦合

**问题 3：Background Service Worker 职责过重**

`background.ts` 承担了太多职责：
- 消息路由
- 标签页管理
- URL 构建
- 重试逻辑
- 脚本注入

这违反了单一职责原则，使得代码难以测试和维护。

**问题 4：Content Script 中的全局状态**

`linkedin/content.ts` 使用大量模块级变量（`jobDetails`、`aiResponse`、`resumeText` 等）管理状态，这带来：
- 状态不可预测
- 难以进行单元测试
- 潜在的内存泄漏风险

**问题 5：消息协议缺乏类型安全**

`MessageType` 枚举虽然定义了消息类型，但消息体的结构没有统一定义，导致：
- 消息格式不一致
- 无法进行编译时检查
- 调试困难

---

## 三、改进计划

### 3.1 架构分层改进

目标架构：

```
┌─────────────────────────────────────────────────────────────────┐
│                      展示层 (Presentation)                        │
│  App.tsx / Components / Hooks                                    │
│  职责：UI 渲染、用户交互、状态展示                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      应用层 (Application)                         │
│  services/ / use-cases/                                          │
│  职责：编排业务流程、协调领域对象                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      领域层 (Domain)                              │
│  models/ / entities/ / value-objects/                            │
│  职责：核心业务规则、领域模型、业务验证                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      基础设施层 (Infrastructure)                   │
│  platforms/ / storage/ / messaging/                              │
│  职责：外部系统集成、Chrome API 封装、数据持久化                       │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 具体改进项

#### 阶段 1：领域模型提取（低风险，高收益）

**目标**：将领域类型从 UI 层独立出来

**文件结构**：

```
src/
├── domain/
│   ├── models/
│   │   ├── job-profile.ts      # 求职档案模型
│   │   ├── work-experience.ts  # 工作经历模型
│   │   ├── education.ts        # 教育背景模型
│   │   └── job-filters.ts      # 筛选条件模型
│   ├── value-objects/
│   │   ├── salary-range.ts     # 薪资范围值对象
│   │   └── date-range.ts       # 日期范围值对象
│   └── interfaces/
│       └── platform.ts         # 平台适配接口
```

**检查清单**：
- [x] 创建 `src/domain/models/` 目录
- [x] 提取 `JobProfile` 接口到独立文件
- [x] 提取 `WorkExperience` 接口到独立文件
- [x] 提取 `Education` 接口到独立文件
- [x] 提取 `JobFilters` 接口到独立文件
- [x] 更新 `App.tsx` 的导入路径
- [x] 更新 `background.ts` 的导入路径（已添加类型注解）
- [x] 更新 Content Script 的导入路径（已使用状态管理器）

#### 阶段 2：平台适配接口抽象（中风险，高收益）

**目标**：定义统一的平台适配接口

**接口定义**：

```typescript
// src/domain/interfaces/platform.ts
export interface JobPlatform {
  readonly name: string;
  readonly baseUrl: string;
  
  // 构建搜索 URL
  buildSearchUrl(filters: JobFilters, jobDetails: JobProfile): string;
  
  // 解析职位列表
  parseJobList(document: Document): JobCard[];
  
  // 填写申请表单
  fillApplicationForm(form: HTMLFormElement, profile: JobProfile): Promise<void>;
  
  // 提交申请
  submitApplication(): Promise<boolean>;
}
```

**检查清单**：
- [x] 定义 `JobPlatform` 接口
- [x] 创建 `LinkedInPlatform` 实现
- [x] 创建 `IndeedPlatform` 实现
- [x] 重构 Content Script 使用平台接口
- [x] 添加平台注册机制

#### 阶段 3：Background Service Worker 拆分（中风险，中收益）

**目标**：将 `background.ts` 拆分为多个职责单一的模块

**文件结构**：
```
src/
├── background/
│   ├── index.ts              # 入口，消息监听注册
│   ├── message-router.ts     # 消息路由
│   ├── tab-manager.ts        # 标签页管理
│   ├── script-injector.ts    # 脚本注入
│   └── retry-handler.ts      # 重试逻辑
```

**检查清单**：

- [x] 创建 `src/background/` 目录
- [x] 提取标签页管理逻辑到 `tab-manager.ts`
- [x] 提取脚本注入逻辑到 `script-injector.ts`
- [x] 提取重试逻辑到 `retry-handler.ts`
- [x] 创建消息路由 `message-router.ts`
- [x] 重构 `index.ts` 作为入口

#### 阶段 4：状态管理改进（低风险，中收益）

**目标**：将 Content Script 中的全局状态封装为状态机

**状态定义**：

```typescript
// src/domain/state/application-state.ts
type ApplicationState = 
  | { status: 'idle' }
  | { status: 'searching'; currentPage: number; processedCount: number }
  | { status: 'applying'; currentJob: JobCard; progress: number }
  | { status: 'completed'; totalApplied: number }
  | { status: 'error'; error: Error; retryCount: number };
```

**检查清单**：

- [x] 定义应用状态类型
- [x] 创建状态管理器
- [x] 重构 LinkedIn Content Script 使用状态机
- [x] 重构 Indeed Content Script 使用状态机
- [x] 添加状态持久化（可选）

#### 阶段 5：消息协议类型化（低风险，低收益）

**目标**：为 Chrome 消息通信添加类型安全

**检查清单**：

- [x] 定义每种消息类型的 payload 接口
- [x] 创建类型安全的消息发送函数
- [x] 创建类型安全的消息监听函数
- [ ] 更新所有消息通信代码

#### 阶段 6：AI 提供商抽象（中风险，高收益）

**目标**：支持多种 AI 服务提供商，允许用户自定义配置

**当前问题**：

- 硬编码 Google Gemini SDK，无法切换其他 AI 服务
- API Key 存储在环境变量中，用户无法在界面配置
- 不支持国内用户常用的大模型服务（如通义千问、文心一言等）

**配置接口设计**：

```typescript
// src/domain/interfaces/ai-provider.ts
export interface AIProviderConfig {
  baseUrl: string;      // API 基础地址
  apiKey: string;       // API 密钥
  modelName: string;    // 模型名称
  maxTokens?: number;   // 最大输出 token 数
  temperature?: number; // 温度参数
}

export interface AIProvider {
  readonly name: string;
  readonly config: AIProviderConfig;

  // 发送消息并获取响应
  sendMessage(prompt: string): Promise<string>;

  // 验证配置是否有效
  validateConfig(): Promise<boolean>;
}
```

**支持的 API 格式**：

```typescript
// OpenAI 兼容格式（大多数国内大模型都支持）
// POST {baseUrl}/v1/chat/completions
// Headers: Authorization: Bearer {apiKey}
// Body: { model: modelName, messages: [...] }

// Anthropic 格式（通过 OpenAI 兼容层）
// POST {baseUrl}/v1/messages
// Headers: x-api-key: {apiKey}, anthropic-version: 2023-06-01
// Body: { model: modelName, messages: [...] }
```

**文件结构**：

```
src/
├── lib/
│   ├── ai/
│   │   ├── provider-factory.ts   # AI 提供商工厂
│   │   ├── openai-provider.ts    # OpenAI 兼容格式实现
│   │   ├── types.ts              # AI 相关类型定义
│   │   └── config.ts             # AI 配置管理
│   └── GeminiAi.ts              # 保留旧文件，逐步迁移
```

**配置存储**：

```typescript
// 使用 Chrome Storage API 存储用户配置
chrome.storage.sync.get(['aiConfig'], (result) => {
  const config: AIProviderConfig = result.aiConfig || {
    baseUrl: 'https://api.openai.com',
    apiKey: '',
    modelName: 'gpt-4',
  };
});
```

**检查清单**：
- [x] 创建 `src/lib/ai/` 目录
- [x] 定义 `AIProviderConfig` 和 `AIProvider` 接口
- [x] 实现 `OpenAICompatibleProvider` 类
- [x] 创建 `ProviderFactory` 工厂类
- [x] 在 App.tsx 添加 AI 配置界面
- [x] 使用 Chrome Storage 存储配置
- [x] 更新 `content.ts` 使用新的 AI 提供商接口
- [x] 添加配置验证和错误处理
- [x] 保留 Gemini 作为默认选项（向后兼容）

---

## 四、改进优先级矩阵

| 改进项 | 风险 | 收益 | 优先级 | 预计工作量 |
|--------|------|------|--------|-----------|
| 领域模型提取 | 低 | 高 | P0 | 2-3 小时 |
| AI 提供商抽象 | 中 | 高 | P1 | 4-6 小时 |
| 平台适配接口 | 中 | 高 | P1 | 4-6 小时 |
| Background 拆分 | 中 | 中 | P2 | 3-4 小时 |
| 状态管理改进 | 低 | 中 | P2 | 3-4 小时 |
| 消息协议类型化 | 低 | 低 | P3 | 2-3 小时 |

---

## 五、不建议做的改动

以下改动在当前阶段**不建议**进行，因为成本大于收益：

1. **引入完整状态管理库**（如 Redux、Zustand）
   - 当前状态简单，React useState 已足够
   - 引入额外依赖增加复杂度

2. **引入依赖注入框架**
   - 项目规模不需要
   - 增加学习成本

3. **过度抽象 AI 能力**
   - 当前只用 Gemini，抽象无实际收益
   - 等有第二个 AI 服务时再抽象

4. **引入完整的 ORM 或数据层**
   - Chrome Storage API 已满足需求
   - 当前数据结构简单
