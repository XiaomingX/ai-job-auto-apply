import { delay } from '../indeed/utils';

// 监听器超时时间（毫秒）
const LISTENER_TIMEOUT = 30000;

/**
 * 带超时的监听器注册（防止内存泄漏）
 *
 * @param listener 监听器函数
 * @param timeout 超时时间（毫秒）
 * @returns 包装后的监听器
 */
export function addListenerWithTimeout(
    listener: (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => void,
    timeout: number = LISTENER_TIMEOUT
): (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => void {
    const wrappedListener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        listener(tabId, changeInfo);
    };

    chrome.tabs.onUpdated.addListener(wrappedListener);

    setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(wrappedListener);
    }, timeout);

    return wrappedListener;
}

/**
 * 等待标签页加载完成
 *
 * @param tabId 标签页 ID
 * @returns Promise
 */
export function waitForTabLoad(tabId: number): Promise<void> {
    return new Promise((resolve, reject) => {
        const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
            }
        };
        chrome.tabs.onUpdated.addListener(listener);

        setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(listener);
            reject(new Error('标签页加载超时'));
        }, LISTENER_TIMEOUT);
    });
}

/**
 * 带重试的消息发送
 *
 * @param tabId 标签页 ID
 * @param message 消息内容
 * @param maxRetries 最大重试次数
 * @param retryDelay 重试延迟（毫秒）
 */
export async function sendMessageWithRetry(
    tabId: number,
    message: Record<string, unknown>,
    maxRetries = 3,
    retryDelay = 2000
): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await new Promise<void>((resolve, reject) => {
                chrome.tabs.sendMessage(tabId, message, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            });
            return;
        } catch (error) {
            console.error(`第 ${i + 1} 次发送失败: ${error}`);
            if (i < maxRetries - 1) {
                await delay(retryDelay);
            } else {
                throw new Error(`发送消息失败，已重试 ${maxRetries} 次`);
            }
        }
    }
}

/**
 * 带重试的标签页打开
 *
 * @param url URL 地址
 * @param messageType 消息类型
 * @param data 消息数据
 * @param maxRetries 最大重试次数
 * @param retryDelay 重试延迟（毫秒）
 */
export function openTabWithRetry(
    url: string,
    messageType: string,
    data: Record<string, unknown>,
    maxRetries = 3,
    retryDelay = 2000
): void {
    let retries = 0;

    function attemptOpen() {
        chrome.tabs.create({ url }, async (tab) => {
            try {
                if (!tab.id) throw new Error('标签页创建失败');
                await waitForTabLoad(tab.id);
                await sendMessageWithRetry(tab.id, {
                    type: messageType,
                    ...data
                }, maxRetries, retryDelay);
            } catch (error) {
                console.error(`打开标签页或发送消息失败: ${error}`);
                if (retries < maxRetries) {
                    retries++;
                    console.log(`重试中... 第 ${retries}/${maxRetries} 次`);
                    setTimeout(attemptOpen, retryDelay);
                } else {
                    console.error(`重试 ${maxRetries} 次后仍然失败`);
                }
            }
        });
    }

    attemptOpen();
}
