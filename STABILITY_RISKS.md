# 稳定性风险分析与改进方向

## 一、内存泄漏风险

### 1.1 DOM 缓存无上限

**位置**：`src/lib/dom-cache.ts`

**问题**：
```typescript
export class SelectorCache {
  private cache = new Map<string, Element | null>();
  private nodeListCache = new Map<string, NodeListOf<Element>>();
  // 没有大小限制，没有 TTL，没有 LRU 淘汰
}
```

**风险**：长时间运行后，缓存持续增长，占用内存

**改进建议**：
- 添加最大缓存条目数（如 1000）
- 添加 TTL（如 5 分钟过期）
- 使用 LRU 策略淘汰旧条目
- 页面导航时自动清空缓存

**严重程度**：🟡 中等（Chrome 扩展内存有限制，但单次使用时间通常不长）

### 1.2 ErrorReporter 错误日志无限增长

**位置**：`src/linkedin/content.ts`

**问题**：
```typescript
class ErrorReporter {
  private errors: Array<{...}> = [];  // 只进不出
}
```

**风险**：大量错误发生时，errors 数组持续增长

**改进建议**：
- 设置最大日志条目数（如 100）
- 超过限制时淘汰最旧的日志
- 或者只保留最近 N 分钟的日志

**严重程度**：🟢 低（错误通常不会太多）

### 1.3 事件监听器清理不完整

**位置**：`src/background/retry-handler.ts`

**问题**：
```typescript
export function addListenerWithTimeout(listener, timeout = LISTENER_TIMEOUT) {
  chrome.tabs.onUpdated.addListener(wrappedListener);
  setTimeout(() => {
    chrome.tabs.onUpdated.removeListener(wrappedListener);
  }, timeout);
  return wrappedListener;
}
```

**现状**：✅ 已正确处理超时清理

**但注意**：如果在超时前标签页已完成，监听器仍会保留到超时

**改进建议**：
- 在监听器内部检查条件，满足时立即移除
- 使用 `chrome.tabs.onRemoved` 监听标签页关闭事件

**严重程度**：🟢 低

---

## 二、并发控制风险

### 2.1 Mutex 无超时机制

**位置**：`src/lib/concurrency.ts`

**问题**：
```typescript
async acquire(): Promise<void> {
  if (!this.locked) {
    this.locked = true;
    return;
  }
  return new Promise<void>((resolve) => {
    this.queue.push(resolve);  // 永久等待
  });
}
```

**风险**：如果持有锁的代码异常退出，锁永远不会释放，后续请求永久阻塞

**改进建议**：
- 添加超时参数：`acquire(timeout?: number)`
- 超时后抛出异常或返回 false
- 添加 `tryLock()` 非阻塞尝试

**严重程度**：🔴 高（可能导致扩展完全卡死）

### 2.2 TaskQueue 无任务取消机制

**位置**：`src/lib/concurrency.ts`

**问题**：
```typescript
async add(task: () => Promise<void>): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    this.queue.push(async () => {
      try {
        await task();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    this.processQueue();
  });
}
```

**风险**：无法取消已排队的任务，用户停止投递后任务仍会执行

**改进建议**：
- 返回 AbortController 或取消函数
- 添加 `clear()` 方法清空队列
- 添加 `abort()` 方法中断正在执行的任务

**严重程度**：🟡 中等

### 2.3 竞态条件：AI 提供商初始化

**位置**：`src/linkedin/content.ts`

**问题**：
```typescript
let aiProvider: AIProvider;  // 全局变量

async function initAIProvider(): Promise<void> {
  // 如果两个地方同时调用，可能创建两个实例
  const config = await ProviderFactory.loadConfig();
  aiProvider = ProviderFactory.create(config);
}
```

**风险**：多个地方同时调用 `initAIProvider()` 可能导致竞态

**改进建议**：
- 使用单例模式 + 懒加载
- 或使用 Mutex 保护初始化过程

**严重程度**：🟢 低（实际使用中不太可能并发调用）

---

## 三、错误处理风险

### 3.1 静默吞掉异常

**位置**：多处

**问题**：
```typescript
// linkedin/content.ts
chrome.runtime.sendMessage({...}).catch(() => {});  // 静默处理

// App.tsx
chrome.runtime.sendMessage({...}, (response) => {
  if (response && response.success) {
    // 成功
  } else {
    console.log(response);  // 只打日志
  }
});
```

**风险**：错误被吞掉，用户不知道发生了什么

**改进建议**：
- 关键操作的错误应通知用户
- 使用 toast 显示错误信息
- 保留错误日志供调试

**严重程度**：🟡 中等

### 3.2 AI 请求超时处理不一致

**位置**：`src/linkedin/content.ts`

**问题**：
```typescript
// queryLLM 有超时
const response = await Promise.race([
  aiProvider.sendMessage(prompt),
  new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('AI 请求超时')), AI_REQUEST_TIMEOUT);
  }),
]);

// checkJobDescriptionFit 没有超时
const response = await aiProvider.sendMessage(inputPrompt);  // 可能永久等待
```

**风险**：checkJobDescriptionFit 可能永久阻塞

**改进建议**：
- 统一使用带超时的 AI 调用
- 或在 AIProvider.sendMessage 内部实现超时

**严重程度**：🟡 中等

### 3.3 重试机制缺乏指数退避

**位置**：`src/background/retry-handler.ts`

**问题**：
```typescript
export async function sendMessageWithRetry(
  tabId, message, maxRetries = 3, retryDelay = 2000
) {
  for (let i = 0; i < maxRetries; i++) {
    // 固定间隔重试
    await delay(retryDelay);
  }
}
```

**风险**：固定间隔重试可能导致服务端压力集中

**改进建议**：
- 使用指数退避：`delay * Math.pow(2, i)`
- 添加随机抖动避免惊群效应

**严重程度**：🟢 低

---

## 四、性能风险

### 4.1 频繁的 DOM 查询

**位置**：`src/linkedin/content.ts`

**问题**：
```typescript
// extractFormFields() 每次调用都重新查询所有表单元素
function extractFormFields(): Record<string, FormField> {
  document.querySelectorAll(selectors.select).forEach(...)
  document.querySelectorAll(selectors.fieldset).forEach(...)
  document.querySelectorAll(selectors.textInput).forEach(...)
  // ...
}
```

**风险**：在循环中频繁调用会导致性能问题

**改进建议**：
- 使用 SelectorCache 缓存查询结果
- 或一次性查询所有元素，然后分类

**严重程度**：🟡 中等

### 4.2 大量的 delay 等待

**位置**：多处

**问题**：
```typescript
await delay(2000);  // 等待页面加载
await delay(1000);  // 等待动画
await delay(500);   // 等待表单响应
```

**风险**：
- 等待时间过长：用户体验差
- 等待时间过短：操作可能失败

**改进建议**：
- 使用 MutationObserver 等待 DOM 变化
- 使用 waitForElement 等待特定元素出现
- 根据网络状况动态调整等待时间

**严重程度**：🟡 中等

### 4.3 简历 PDF 重复下载

**位置**：`src/linkedin/content.ts`

**问题**：
```typescript
async function checkJobDescriptionFit(resumeUrl: string): Promise<boolean> {
  await processResume(resumeUrl);  // 每次都下载并解析 PDF
  // ...
}
```

**风险**：同一个简历被重复下载和解析

**改进建议**：
- 缓存解析结果
- 使用 Map<url, text> 存储已解析的简历

**严重程度**：🟡 中等

---

## 五、数据一致性风险

### 5.1 状态持久化时机

**位置**：`src/linkedin/content.ts` 和 `src/indeed/content.ts`

**问题**：
```typescript
update(partial: Partial<typeof this.state>) {
  this.state = { ...this.state, ...partial };
  this.saveToPersistence();  // 每次更新都立即保存
}
```

**风险**：
- 频繁写入 Chrome Storage 可能影响性能
- 如果写入失败，内存和存储状态不一致

**改进建议**：
- 使用防抖（debounce）批量写入
- 添加写入失败重试机制

**严重程度**：🟢 低

### 5.2 多标签页状态冲突

**问题**：LinkedIn 和 Indeed 的 Content Script 各自维护独立状态，但共享同一个 Chrome Storage

**风险**：如果用户同时打开多个标签页，状态可能冲突

**改进建议**：
- 使用标签页 ID 作为状态键名
- 或使用 Background Script 作为状态中心

**严重程度**：🟢 低（实际使用中不太可能同时运行）

---

## 六、安全风险

### 6.1 API 密钥存储

**位置**：`src/lib/ai/provider-factory.ts`

**现状**：
```typescript
static async saveConfig(config: AIProviderConfig): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ aiConfig: config }, resolve);
  });
}
```

**风险**：API 密钥以明文存储在 Chrome Storage 中

**改进建议**：
- 使用 Chrome 的 `chrome.storage.session`（内存中，不持久化）
- 或提醒用户注意密钥安全

**严重程度**：🟡 中等

### 6.2 提示词注入风险

**位置**：`src/linkedin/content.ts`

**问题**：
```typescript
const prompt = `
  Field details:
  - Label: ${fieldInfo.label}
  - Options: ${fieldInfo.options ? fieldInfo.options.join(', ') : 'N/A'}
`;
```

**风险**：如果职位页面包含恶意内容，可能注入到提示词中

**改进建议**：
- 对输入进行转义
- 使用模板引擎的自动转义功能

**严重程度**：🟢 低（实际利用难度大）

---

## 七、改进优先级

| 优先级 | 风险项 | 影响 | 改进成本 | 状态 |
|--------|--------|------|----------|------|
| P0 | Mutex 无超时 | 扩展卡死 | 低 | ✅ 已完成 |
| P1 | AI 请求超时不一致 | 流程阻塞 | 低 | ✅ 已完成 |
| P1 | 提示词注入 | 安全风险 | 低 | ✅ 已完成 |
| P2 | DOM 缓存无上限 | 内存增长 | 中 | ✅ 已完成 |
| P2 | 频繁 DOM 查询 | 性能下降 | 中 | ✅ 已完成 |
| P2 | 简历重复下载 | 性能下降 | 低 | ✅ 已完成 |
| P3 | 错误静默吞掉 | 调试困难 | 低 | ✅ 已评估（当前处理合理） |
| P3 | 重试无指数退避 | 服务端压力 | 低 | ✅ 已完成 |
| P3 | 状态持久化时机 | 性能影响 | 低 | ✅ 已完成 |

---

## 八、监控建议

### 8.1 关键指标

- AI 请求成功率和延迟
- 表单填写成功率
- 申请提交成功率
- 内存使用量
- 错误发生频率

### 8.2 日志规范

```typescript
// 建议使用结构化日志
logger.info('职位处理完成', {
  platform: 'linkedin',
  jobTitle: 'Software Engineer',
  company: 'Google',
  matched: true,
  applied: true,
  duration: 1234,
});
```

### 8.3 错误上报

```typescript
// 建议添加错误上报机制
errorReporter.report({
  context: 'fillFormWithAI',
  error: error.message,
  stack: error.stack,
  metadata: {
    platform: 'linkedin',
    fieldName: 'yearsOfExperience',
    fieldType: 'select',
  },
});
```
