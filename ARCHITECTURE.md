# 架构说明文档

## 一、系统是干什么的？

一句话：**帮你在 LinkedIn/Indeed 上自动投简历的 Chrome 扩展。**

工作流程：
1. 用户在扩展弹窗里选择求职档案、设置筛选条件
2. 扩展打开招聘网站，搜索职位
3. 对每个职位，AI 判断是否匹配简历
4. 匹配的话，自动填写申请表单并提交

---

## 二、架构分层

```
┌─────────────────────────────────────────────────────────────┐
│                      用户交互层                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  App.tsx      │  │  弹窗 UI     │  │  Chrome Storage  │  │
│  │  (React)      │  │  (Radix UI)  │  │  (配置持久化)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      应用层                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  background/index.ts (Service Worker 入口)            │  │
│  │  background/message-router.ts (消息路由)              │  │
│  │  background/tab-manager.ts (标签页管理)               │  │
│  │  background/script-injector.ts (脚本注入)             │  │
│  │  background/retry-handler.ts (重试处理)               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      领域层                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │
│  │  模型        │  │  接口        │  │  平台适配器      │    │
│  │  JobProfile  │  │  JobPlatform │  │  LinkedInPlatform│    │
│  │  JobFilters  │  │  (契约)      │  │  IndeedPlatform  │    │
│  │  WorkExp     │  │              │  │  PlatformRegistry│    │
│  │  Education   │  │              │  │                  │    │
│  └─────────────┘  └─────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      基础设施层                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │
│  │  AI 抽象     │  │  并发控制    │  │  工具库          │    │
│  │  Provider    │  │  Mutex      │  │  dom-cache       │    │
│  │  Factory     │  │  Semaphore  │  │  persistence     │    │
│  │  Config      │  │  TaskQueue  │  │  scroll-manager  │    │
│  └─────────────┘  └─────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      平台实现层（Content Script）             │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │  linkedin/content.ts  │  │  indeed/content.ts   │        │
│  │  linkedin/selectors.ts│  │  indeed/utils.ts     │        │
│  │  linkedin/utils.ts    │  │                      │        │
│  └──────────────────────┘  └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、核心模块说明

### 3.1 Background（后台服务）

**位置**：`src/background/`

| 文件 | 干什么的 |
|------|----------|
| `index.ts` | Service Worker 入口，监听 Chrome 消息 |
| `message-router.ts` | 消息路由，根据 MessageType 分发到不同处理函数 |
| `tab-manager.ts` | 管理 Chrome 标签页的创建、关闭、数据清理 |
| `script-injector.ts` | 向标签页注入 Content Script |
| `retry-handler.ts` | 带超时的监听器注册、带重试的消息发送 |

**关键流程**：
```
用户点击"开始投递"
  → App.tsx 发送 START_AUTO_APPLYING 消息
  → message-router 接收并路由
  → 打开 LinkedIn/Indeed 标签页
  → 注入 Content Script
  → 发送 START_JOB_SEARCH 消息
  → Content Script 开始处理
```

### 3.2 Domain（领域层）

**位置**：`src/domain/`

**核心接口 `JobPlatform`**：
```typescript
interface JobPlatform {
  readonly name: string;
  readonly baseUrl: string;
  buildSearchUrl(filters: JobFilters, profile: JobProfile): string;
  parseJobList(document: Document): JobCard[];
  fillApplicationForm(form: HTMLFormElement, profile: JobProfile): Promise<void>;
  submitApplication(): Promise<boolean>;
}
```

**平台注册表 `PlatformRegistry`**：
- 管理所有已注册的平台适配器
- 通过 `get(name)` 获取平台实例
- 新增平台只需 `register(new Platform())`

**领域模型**：
- `JobProfile`：用户求职档案（姓名、邮箱、简历、工作经历、教育背景）
- `JobFilters`：筛选条件（经验等级、工作类型、发布日期等）
- `WorkExperience`：工作经历
- `Education`：教育背景

### 3.3 AI 抽象层

**位置**：`src/lib/ai/`

```
AIProvider (接口)
    │
    └── OpenAICompatibleProvider (实现)
            │
            ├── sendMessage(prompt) → 调用 OpenAI 兼容 API
            └── validateConfig() → 验证配置有效性

ProviderFactory (工厂)
    │
    ├── create(config) → 创建提供商实例
    ├── createDefault() → 使用环境变量创建
    ├── loadConfig() → 从 Chrome Storage 加载配置
    └── saveConfig() → 保存配置到 Chrome Storage
```

**支持的 AI 服务**（任何 OpenAI 兼容格式）：
- OpenAI、Anthropic、DeepSeek、通义千问、智谱、小米 MiMo

### 3.4 并发控制

**位置**：`src/lib/concurrency.ts`

| 类 | 用途 |
|----|------|
| `Mutex` | 互斥锁，保证同一时间只有一个操作 |
| `Semaphore` | 信号量，控制并发数量 |
| `TaskQueue` | 任务队列，支持串行/并行执行 |

**使用场景**：
- `processLock`：防止重复启动申请流程
- `globalLock`：全局互斥锁

### 3.5 Content Script（平台实现）

**位置**：`src/linkedin/` 和 `src/indeed/`

这是真正干活的地方：
- 监听 Background 发来的消息
- 操作 DOM 解析职位列表
- 调用 AI 判断是否匹配
- 自动填写表单并提交

**LinkedIn Content Script 核心流程**：
```
收到 START_JOB_SEARCH 消息
  → processJobListings()
  → scrollToBottomSlowly() 加载所有职位
  → 遍历 jobCards
    → processJobCard()
      → 点击职位卡片
      → extractJobDetails() 提取职位信息
      → checkJobDescriptionFit() AI 判断是否匹配
      → 匹配则 applyToJob()
        → handleEasyApply() 或 handleExternalApply()
        → handleMultiPageForm() 多页表单处理
        → fillFormWithAI() AI 填写表单
```

---

## 四、依赖的三方组件

| 组件 | 用途 | 版本 |
|------|------|------|
| React | UI 框架 | 18.x |
| Vite | 构建工具 | 5.x |
| TypeScript | 类型安全 | 5.x |
| Tailwind CSS | 样式框架 | 3.x |
| Radix UI | 无样式组件库 | 1.x |
| Framer Motion | 动画 | 11.x |
| canvas-confetti | 粒子特效 | 1.x |
| pdf-parser-client-side | PDF 文本提取 | - |
| lucide-react | 图标库 | - |

---

## 五、提示词工程说明

### 5.1 表单填写提示词

**位置**：`src/linkedin/content.ts` 的 `fillFormField()` 函数

**用途**：让 AI 根据表单字段信息生成填写值

**提示词结构**：
```
角色设定：AI 表单填写助手
上下文：当前表单区域标题
字段信息：名称、类型、标签、占位符、是否必填、可选值
规则：
  1. 只返回值，不解释
  2. 地址字段返回逗号分隔的城市列表
  3. 数字字段返回合理数值
  4. 日期格式 MM/YYYY
  5. 多选字段从选项中选择
  6. ...
```

### 5.2 职位匹配提示词

**位置**：`src/linkedin/content.ts` 的 `checkJobDescriptionFit()` 函数

**用途**：判断用户简历是否匹配职位要求

**当前实现**：直接将简历文本和职位详情发给 AI，要求返回 "Yes" 或 "No"

**问题**：提示词被截断（`Please respond with only "Yes"`），没有充分利用 AI 能力

### 5.3 提示词改进建议

1. **结构化输出**：要求 AI 返回 JSON 格式，包含匹配度评分和理由
2. **角色设定**：添加"你是资深 HR"这样的角色设定
3. **Few-shot 示例**：提供几个判断示例
4. **中文优化**：当前提示词是英文，可改为中文以提高国内模型效果

---

## 六、核心能力常用方法入口

### 6.1 启动自动投递

```
App.tsx: startAutoApplying()
  → chrome.runtime.sendMessage(START_AUTO_APPLYING)
  → background/message-router.ts: handleStartAutoApplying()
  → openLinkedInJobsPage() / openIndeedJobsPage()
```

### 6.2 处理职位列表

```
linkedin/content.ts: processJobListings()
  → scrollToBottomSlowly() 加载职位
  → processJobCard() 处理单个职位
  → checkJobDescriptionFit() AI 匹配
  → applyToJob() 申请职位
```

### 6.3 AI 填写表单

```
linkedin/content.ts: fillFormWithAI()
  → extractFormFields() 提取表单字段
  → fillFormField() 逐个字段调用 AI
  → queryLLM() 发送 AI 请求
```

### 6.4 AI 请求

```
lib/ai/openai-provider.ts: sendMessage()
  → fetch(url, { method: 'POST', ... })
  → 解析 ChatCompletionResponse
  → 返回 choices[0].message.content
```

---

## 七、常用函数速查表

| 函数 | 文件 | 作用 |
|------|------|------|
| `routeMessage()` | background/message-router.ts | 消息路由分发 |
| `openLinkedInJobsPage()` | background/message-router.ts | 打开 LinkedIn 搜索页 |
| `addListenerWithTimeout()` | background/retry-handler.ts | 带超时的监听器 |
| `sendMessageWithRetry()` | background/retry-handler.ts | 带重试的消息发送 |
| `processJobListings()` | linkedin/content.ts | 处理职位列表主流程 |
| `processJobCard()` | linkedin/content.ts | 处理单个职位卡片 |
| `checkJobDescriptionFit()` | linkedin/content.ts | AI 判断职位匹配 |
| `fillFormWithAI()` | linkedin/content.ts | AI 填写表单 |
| `queryLLM()` | linkedin/content.ts | 带超时的 AI 查询 |
| `extractFormFields()` | linkedin/content.ts | 提取表单字段 |
| `Mutex.acquire()` | lib/concurrency.ts | 获取锁 |
| `Mutex.release()` | lib/concurrency.ts | 释放锁 |
| `ProviderFactory.create()` | lib/ai/provider-factory.ts | 创建 AI 提供商 |
| `PlatformRegistry.get()` | domain/platforms/platform-registry.ts | 获取平台适配器 |

---

## 八、使用用例

### 用例 1：添加新招聘平台

```typescript
// 1. 实现 JobPlatform 接口
class GlassdoorPlatform implements JobPlatform {
  readonly name = 'Glassdoor';
  readonly baseUrl = 'https://www.glassdoor.com';

  buildSearchUrl(filters, profile) { /* ... */ }
  parseJobList(document) { /* ... */ }
  fillApplicationForm(form, profile) { /* ... */ }
  submitApplication() { /* ... */ }
}

// 2. 注册到平台注册表
platformRegistry.register(new GlassdoorPlatform());

// 3. 在 message-router 中添加处理逻辑
// 4. 创建 content.ts 处理 Glassdoor 页面
```

### 用例 2：切换 AI 服务

```typescript
// 方式 1：在扩展弹窗的"AI 配置"标签页中修改
// 方式 2：修改 .env 文件
AI_BASE_URL=https://api.deepseek.com
AI_API_KEY=sk-xxx
AI_MODEL_NAME=deepseek-chat
```

### 用例 3：调试 AI 请求

```typescript
// 在 linkedin/content.ts 的 queryLLM() 中添加日志
console.log('发送给 AI 的提示词:', prompt);
console.log('AI 返回:', response);
```

---

## 九、数据流图

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  用户操作    │────▶│  App.tsx    │────▶│  Background │
│  (弹窗 UI)  │     │  (React)    │     │  (Service   │
│             │◀────│             │◀────│   Worker)   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
             ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
             │  LinkedIn   │          │   Indeed    │          │   未来平台   │
             │  Content    │          │   Content   │          │   Content   │
             │  Script     │          │   Script    │          │   Script    │
             └──────┬──────┘          └──────┬──────┘          └──────┬──────┘
                    │                          │                          │
                    └──────────────────────────┼──────────────────────────┘
                                               │
                                               ▼
                                     ┌─────────────┐
                                     │  AI 服务     │
                                     │  (OpenAI    │
                                     │   兼容)     │
                                     └─────────────┘
```
