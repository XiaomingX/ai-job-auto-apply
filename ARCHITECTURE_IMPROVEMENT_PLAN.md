# 架构改进计划

## 一、当前架构分析

### 1.1 系统核心用途

这是一款 Chrome 浏览器扩展，用于自动化职位申请流程：
- 从 LinkedIn/Indeed 页面解析职位信息
- 通过 AI 判断是否匹配用户简历
- 自动填写申请表单并提交

### 1.2 架构精妙之处

**✅ 平台注册表模式（PlatformRegistry）**
- 采用策略模式 + 注册表，新增平台只需实现 `JobPlatform` 接口并注册
- 符合开闭原则，扩展性好

**✅ 并发控制设计**
- Mutex/Semaphore/TaskQueue 三件套，防止重复申请
- `processLock` 保证同一时间只有一个申请流程运行

**✅ 消息类型系统**
- `status-codes.ts` 定义了完整的 MessageType 枚举和 Payload 接口
- 类型安全的消息发送函数（sendMessage/sendTabMessage）

**✅ AI 抽象层**
- `AIProvider` 接口 + `OpenAICompatibleProvider` 实现
- `ProviderFactory` 统一管理配置加载和实例创建

### 1.3 架构边界问题

**❌ 问题 1：Content Script 职责过重**

`linkedin/content.ts` 约 1670 行，`indeed/content.ts` 约 248 行，承担了：
- 状态管理（ApplicationStateManager）
- 错误报告（ErrorReporter）
- DOM 操作
- AI 调用
- 表单填写
- 简历解析

违反单一职责原则，维护成本高。

**❌ 问题 2：领域层形同虚设**

`domain/` 目录定义了接口和模型，但实际业务逻辑全部在 `linkedin/content.ts` 中：
- `LinkedInPlatform.fillApplicationForm()` 只是空壳（console.log）
- 真正的表单填写逻辑在 content.ts 的 `fillFormWithAI()` 等函数中
- 领域模型只作为类型定义使用，没有行为

**❌ 问题 3：平台适配器与 Content Script 耦合**

- `linkedin/selectors.ts` 硬编码了 LinkedIn 的 CSS 选择器
- content.ts 直接操作 DOM，没有抽象层
- 新增平台需要复制大量 DOM 操作代码

**❌ 问题 4：提示词硬编码**

`fillFormField()` 函数中直接拼接英文提示词：
- 不利于维护和调试
- 提示词与业务逻辑耦合
- 没有版本管理

**❌ 问题 5：重复代码**

LinkedIn 和 Indeed 的 content.ts 存在大量重复：
- 滚动加载逻辑（scrollToBottomSlowly/scrollToTopSlowly）
- 状态管理类（ApplicationStateManager/IndeedApplicationStateManager）
- 持久化逻辑

---

## 二、改进计划

### 阶段 1：抽取共享基础设施（低风险）

**目标**：消除重复代码，建立共享工具层

- [x] 1.1 抽取 `BaseStateManager` 基类
  - 文件：`src/lib/state-manager.ts`
  - 包含：reset/get/update/saveToPersistence/loadFromPersistence
  - LinkedIn 和 Indeed 的状态管理器继承此基类

- [x] 1.2 抽取 `ScrollManager` 工具类
  - 文件：`src/lib/scroll-manager.ts`
  - 包含：scrollToBottomSlowly/scrollToTopSlowly
  - 参数化容器选择器和滚动配置

- [x] 1.3 统一错误报告器
  - 文件：`src/lib/error-reporter.ts`
  - 当前 LinkedIn 有 ErrorReporter，Indeed 没有
  - 统一为全局单例

### 阶段 2：强化领域层（中风险）

**目标**：让领域层真正承载业务逻辑

- [x] 2.1 实现 `FormFiller` 领域服务
  - 文件：`src/domain/services/form-filler.ts`
  - 职责：表单字段提取、AI 调用、字段填写
  - 从 content.ts 的 fillFormWithAI 等函数迁移

- [x] 2.2 实现 `ResumeParser` 领域服务
  - 文件：`src/domain/services/resume-parser.ts`
  - 职责：PDF 下载、文本提取、缓存管理

- [x] 2.3 实现 `JobMatcher` 领域服务
  - 文件：`src/domain/services/job-matcher.ts`
  - 职责：调用 AI 判断职位匹配度
  - 封装 checkJobDescriptionFit 逻辑

- [x] 2.4 创建 `PromptTemplate` 值对象
  - 文件：`src/domain/services/prompt-template.ts`
  - 职责：管理提示词模板，支持参数化和版本控制

### 阶段 3：重构 Content Script（中风险）

**目标**：Content Script 只负责 DOM 操作和消息通信

- [x] 3.1 定义 `PageAdapter` 接口
  - 文件：`src/domain/interfaces/page-adapter.ts`
  - 方法：findJobCards/extractJobDetails/findFormFields/clickElement
  - 将 DOM 操作抽象为接口方法

- [x] 3.2 实现 `LinkedInPageAdapter`
  - 文件：`src/linkedin/page-adapter.ts`
  - 迁移 selectors.ts 的选择器和 content.ts 的 DOM 操作

- [x] 3.3 实现 `IndeedPageAdapter`
  - 文件：`src/indeed/page-adapter.ts`

- [ ] 3.4 简化 Content Script
  - content.ts 只保留消息监听和流程编排
  - DOM 操作委托给 PageAdapter
- [ ] 3.5 简化 Content Script
  - content.ts 只保留消息监听和流程编排
  - DOM 操作委托给 PageAdapter

### 阶段 4：提示词工程优化（低风险）

**目标**：提示词独立管理，便于调试和优化

- [x] 4.1 创建提示词模板文件
  - 文件：`src/prompts/form-fill.ts`
  - 文件：`src/prompts/job-match.ts`
  - 文件：`src/prompts/resume-tailor.ts`

- [x] 4.2 实现提示词渲染引擎
  - 支持变量插值
  - 支持条件分支
  - 支持多语言

---

## 三、改进原则

1. **不影响外部接口**：用户交互方式、Chrome API 调用方式不变
2. **渐进式重构**：每个阶段独立可部署，不破坏现有功能
3. **保持简单**：不过度设计，只解决实际问题
4. **测试优先**：关键逻辑补充单元测试

---

## 四、预期收益

| 指标 | 当前 | 改进后 |
|------|------|--------|
| content.ts 行数 | 1670 | < 300 |
| 新增平台工作量 | 复制 500+ 行代码 | 实现 3 个接口 |
| 提示词修改 | 改代码重新构建 | 改配置文件 |
| 代码重复率 | 高（LinkedIn/Indeed 重复） | 低（共享基础设施） |
