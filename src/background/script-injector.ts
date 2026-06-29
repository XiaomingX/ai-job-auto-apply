// @ts-ignore - Vite script import
import externalJobs from '../linkedin/externalJobs?script';
import { addListenerWithTimeout } from './retry-handler';

/**
 * 注入 Content Script 到标签页
 *
 * @param tabId 标签页 ID
 * @param scriptPath 脚本路径
 */
export async function injectContentScript(tabId: number, scriptPath: string): Promise<void> {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            files: [scriptPath]
        });
        console.log(`Content Script 注入成功: ${scriptPath}`);
    } catch (error) {
        console.error('注入 Content Script 失败:', error);
        throw error;
    }
}

/**
 * 注入外部职位处理脚本
 *
 * @param tabId 标签页 ID
 * @param jobDetails 职位详情
 * @param resumeText 简历文本
 */
export function injectExternalJobsScript(
    tabId: number,
    jobDetails: any,
    resumeText: string
): void {
    addListenerWithTimeout((updatedTabId, changeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
            injectContentScript(tabId, externalJobs)
                .then(() => {
                    function messageListener(
                        msg: any,
                        sender: chrome.runtime.MessageSender
                    ) {
                        if (msg.action === 'contentScriptReady' && sender.tab?.id === tabId) {
                            chrome.runtime.onMessage.removeListener(messageListener);

                            chrome.tabs.sendMessage(tabId, {
                                action: 'sendData',
                                jobDetails,
                                resumeText,
                                tabId
                            }, () => {
                                if (chrome.runtime.lastError) {
                                    console.error('发送消息失败:', chrome.runtime.lastError);
                                }
                            });
                        }
                    }
                    chrome.runtime.onMessage.addListener(messageListener);
                })
                .catch((error) => {
                    console.error('注入 Content Script 失败:', error);
                });
        }
    });
}
