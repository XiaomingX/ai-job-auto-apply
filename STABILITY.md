# 性能与稳定性分析

## 一、概述

本文档从架构师视角分析系统的性能瓶颈、稳定性风险和改进方向。

---

## 二、已识别的风险

### 2.1 内存泄漏风险

#### 风险点 1：事件监听器未清理

**位置**：`src/background.ts:128-136`

```typescript
chrome.tabs.create({ url }, (tab) => {
    chrome.tabs.onUpdated.addListener(async function listener(tabId, changeInfo) {
        if (tabId === tab.id && changeInfo.status === 'complete') {
            await delay(3000)
            chrome.tabs.sendMessage(tabId, { type: MessageType.START_JOB_SEARCH, jobDetails });
            chrome.tabs.onUpdated.removeListener(listener);
        }
    });
});
```

**问题**：如果标签页加载失败或被用户关闭，监听器永远不会被移除。

**影响**：长时间运行后，积累的监听器会消耗内存。

**修复方案**：
```typescript
chrome.tabs.create({ url }, (tab) => {
    const listener = (tabId, changeInfo) => {
        if (tabId === tab.id) {
            if (changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                delay(3000).then(() => {
                    chrome.tabs.sendMessage(tabId, { type: MessageType.START_JOB_SEARCH, jobDetails });
                });
            }
        }
    };
    
    chrome.tabs.onUpdated.addListener(listener);
    
    // 添加超时清理
    setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
    }, 30000);
});
```

**检查清单**：
- [x] 为所有 `chrome.tabs.onUpdated.addListener` 添加超时清理
- [x] 为所有 `chrome.tabs.onCreated.addListener` 添加超时清理
- [x] 确保错误路径也能正确清理监听器

---

#### 风险点 2：Content Script 全局变量

**位置**：`src/linkedin/content.ts:23-29`

```typescript
let jobDetails: JobDetail;
let aiResponse: string;
let allText: string = "";
let resumeText: string;
let userId: number;
let applicationLimit: number;
```

**问题**：这些变量在模块生命周期内持续存在，即使页面刷新也不会重置。

**影响**：
1. 旧数据可能污染新的申请流程
2. 内存占用持续增长

**修复方案**：
```typescript
// 封装为状态管理器
class ApplicationStateManager {
    private state: ApplicationState = { status: 'idle' };
    
    reset() {
        this.state = { status: 'idle' };
    }
    
    update(partial: Partial<ApplicationState>) {
        this.state = { ...this.state, ...partial };
    }
    
    get(): ApplicationState {
        return { ...this.state };
    }
}

export const appState = new ApplicationStateManager();
```

**检查清单**：
- [x] 创建状态管理器类
- [x] 封装所有全局变量到状态管理器
- [x] 在申请流程开始时重置状态
- [x] 在申请流程结束时清理状态

---

### 2.2 并发冲突风险

#### 风险点 3：多标签页并发

**位置**：`src/background.ts:183-195`

```typescript
if (updatedJobBoards.linkedin.enabled) {
    openLinkedInJobsPage({ jobDetails, filters, tailorResume });
}
if (updatedJobBoards.indeed.enabled) {
    openIndeedJobsPage({ jobDetails, filters, tailorResume });
}
```

**问题**：LinkedIn 和 Indeed 的申请流程同时启动，可能造成：
1. 用户被多个标签页打断
2. 申请计数混乱
3. Chrome 性能下降

**影响**：用户体验差，可能导致申请失败。

**修复方案**：
```typescript
// 串行执行，或使用队列
async function startAutoApplying(config) {
    const tasks = [];
    
    if (config.linkedin.enabled) {
        tasks.push(() => openLinkedInJobsPage(config));
    }
    if (config.indeed.enabled) {
        tasks.push(() => openIndeedJobsPage(config));
    }
    
    // 串行执行
    for (const task of tasks) {
        await task();
    }
}
```

**检查清单**：
- [x] 实现任务队列
- [x] 支持串行/并行模式配置
- [x] 添加全局锁防止重复启动

---

#### 风险点 4：消息竞争条件

**位置**：`src/linkedin/content.ts:60-69`

```typescript
for (let i = 0; i < jobCards.length && processedCount < maxJobs; i++) {
    await processJobCard(jobCards[i] as HTMLElement);
    processedCount++;
    
    await delay(500);
    
    if (applicationLimit === 0) {
        console.log("Application limit reached. Stopping the process.");
        chrome.runtime.sendMessage({ type: MessageType.RATE_LIMIT });
        return;
    }
}
```

**问题**：`applicationLimit` 可能被外部消息修改，但循环内没有同步机制。

**影响**：可能超出限制或提前停止。

**修复方案**：
```typescript
// 使用原子操作检查限制
function decrementLimit(): boolean {
    if (applicationLimit <= 0) return false;
    applicationLimit--;
    return true;
}

// 在循环中使用
if (!decrementLimit()) {
    chrome.runtime.sendMessage({ type: MessageType.RATE_LIMIT });
    return;
}
```

**检查清单**：
- [x] 封装限制检查为原子操作
- [x] 在关键路径使用锁或信号量
- [x] 添加并发测试

---

### 2.3 性能瓶颈

#### 风险点 5：大量 DOM 查询

**位置**：`src/linkedin/selectors.ts`

**问题**：每次表单填写都执行大量 `document.querySelector` 调用。

**影响**：在复杂页面上可能造成卡顿。

**修复方案**：
```typescript
// 缓存 DOM 查询结果
class SelectorCache {
    private cache = new Map<string, Element | null>();
    
    query(selector: string): Element | null {
        if (this.cache.has(selector)) {
            return this.cache.get(selector)!;
        }
        const element = document.querySelector(selector);
        this.cache.set(selector, element);
        return element;
    }
    
    clear() {
        this.cache.clear();
    }
}

// 在页面变化时清理缓存
const selectorCache = new SelectorCache();
```

**检查清单**：
- [x] 实现 DOM 查询缓存
- [x] 在页面变化时清理缓存
- [x] 监控查询性能

---

#### 风险点 6：AI 请求无超时

**位置**：`src/linkedin/content.ts` 中的 `chatSession.sendMessage` 调用

**问题**：AI 请求没有设置超时，可能无限等待。

**影响**：单个请求卡住会阻塞整个申请流程。

**修复方案**：
```typescript
async function queryLLMWithTimeout(prompt: string, timeout = 30000): Promise<string | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const result = await Promise.race([
            chatSession.sendMessage(prompt),
            new Promise((_, reject) => {
                controller.signal.addEventListener('abort', () => {
                    reject(new Error('AI request timeout'));
                });
            })
        ]);
        
        clearTimeout(timeoutId);
        return result.response.text().trim();
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('AI request failed:', error);
        return null;
    }
}
```

**检查清单**：
- [x] 为所有 AI 请求添加超时
- [x] 实现请求重试机制
- [x] 添加请求队列限制并发数

---

### 2.4 错误处理缺陷

#### 风险点 7：静默失败

**位置**：多处 `try-catch` 块

```typescript
try {
    // ... 操作
} catch (error) {
    console.error("Error:", error);
    // 继续执行，没有通知用户
}
```

**问题**：错误被静默吞掉，用户不知道发生了什么。

**影响**：申请可能失败但用户以为成功了。

**修复方案**：
```typescript
interface ErrorReport {
    timestamp: number;
    context: string;
    error: Error;
    recovered: boolean;
}

class ErrorReporter {
    private errors: ErrorReport[] = [];
    
    report(context: string, error: Error, recovered: boolean) {
        this.errors.push({
            timestamp: Date.now(),
            context,
            error,
            recovered
        });
        
        // 通知用户
        if (!recovered) {
            chrome.runtime.sendMessage({
                type: 'ERROR_REPORT',
                context,
                message: error.message
            });
        }
    }
    
    getErrors(): ErrorReport[] {
        return [...this.errors];
    }
}
```

**检查清单**：
- [x] 实现错误报告机制
- [x] 区分可恢复和不可恢复错误
- [x] 向用户展示错误信息
- [x] 添加错误日志持久化

---

## 三、改进建议优先级

### P0：必须修复

1. **事件监听器清理** — 防止内存泄漏
2. **AI 请求超时** — 防止流程卡死
3. **错误报告机制** — 提升用户体验

### P1：建议修复

4. **全局状态封装** — 提升代码可维护性
5. **并发控制** — 防止资源竞争
6. **DOM 查询缓存** — 提升性能

### P2：可选优化

7. **任务队列** — 支持更灵活的执行策略
8. **性能监控** — 收集运行时数据

---

## 四、监控指标建议

### 4.1 关键指标

| 指标 | 说明 | 告警阈值 |
|------|------|----------|
| 申请成功率 | 成功提交 / 尝试提交 | < 80% |
| AI 响应时间 | 单次 AI 请求耗时 | > 10s |
| 表单填写时间 | 单个表单填写耗时 | > 30s |
| 错误率 | 错误次数 / 总操作次数 | > 5% |
| 内存使用 | Content Script 内存占用 | > 50MB |

### 4.2 监控实现

```typescript
class PerformanceMonitor {
    private metrics = {
        attempts: 0,
        successes: 0,
        errors: 0,
        aiResponseTimes: [] as number[],
        formFillTimes: [] as number[],
    };
    
    recordAttempt() { this.metrics.attempts++; }
    recordSuccess() { this.metrics.successes++; }
    recordError() { this.metrics.errors++; }
    recordAITime(ms: number) { this.metrics.aiResponseTimes.push(ms); }
    recordFormTime(ms: number) { this.metrics.formFillTimes.push(ms); }
    
    getReport() {
        return {
            successRate: this.metrics.successes / this.metrics.attempts,
            avgAIResponseTime: average(this.metrics.aiResponseTimes),
            avgFormFillTime: average(this.metrics.formFillTimes),
            errorRate: this.metrics.errors / this.metrics.attempts,
        };
    }
}
```

---

## 五、测试策略建议

### 5.1 单元测试

- 状态管理器
- 工具函数
- 平台参数映射

### 5.2 集成测试

- 消息传递流程
- 表单填写逻辑
- 错误恢复机制

### 5.3 E2E 测试

- 完整申请流程
- 多平台并发
- 边界条件（限制、网络错误）

---

## 六、总结

当前系统的核心架构是合理的，但存在一些稳定性和性能风险。建议按优先级逐步修复：

1. **短期**：修复内存泄漏和超时问题
2. **中期**：改进状态管理和错误处理
3. **长期**：添加监控和测试覆盖

这些改进不会影响用户界面和外部交互，属于底层优化。
