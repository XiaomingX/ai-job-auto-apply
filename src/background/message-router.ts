import { MessageType } from '../lib/status-codes';
import { delay } from '../indeed/utils';
import { addListenerWithTimeout } from './retry-handler';
import { clearJobData, removeJobData, closeTab } from './tab-manager';
import { injectExternalJobsScript } from './script-injector';
import { platformRegistry } from '../domain/platforms';

/**
 * 打开 LinkedIn 职位搜索页面
 */
export function openLinkedInJobsPage({
    jobDetails,
    filters
}: {
    jobDetails: any;
    filters: any;
}): void {
    const linkedinPlatform = platformRegistry.get('linkedin');
    if (!linkedinPlatform) {
        console.error('LinkedIn 平台未注册');
        return;
    }

    const url = linkedinPlatform.buildSearchUrl(filters, jobDetails);

    chrome.tabs.create({ url }, (tab) => {
        if (!tab.id) return;

        addListenerWithTimeout((tabId, changeInfo) => {
            if (tabId === tab.id && changeInfo.status === 'complete') {
                delay(3000).then(() => {
                    chrome.tabs.sendMessage(tabId, { type: MessageType.START_JOB_SEARCH, jobDetails });
                });
            }
        });
    });
}

/**
 * 打开 Indeed 职位搜索页面
 */
export function openIndeedJobsPage({
    jobDetails,
    filters
}: {
    jobDetails: any;
    filters: any;
}): void {
    const indeedPlatform = platformRegistry.get('indeed');
    if (!indeedPlatform) {
        console.error('Indeed 平台未注册');
        return;
    }

    const url = indeedPlatform.buildSearchUrl(filters, jobDetails);

    chrome.tabs.create({ url }, (tab) => {
        if (!tab.id) return;

        addListenerWithTimeout((tabId, changeInfo) => {
            if (tabId === tab.id && changeInfo.status === 'complete') {
                delay(3000).then(() => {
                    chrome.tabs.sendMessage(tabId, { type: MessageType.START_INDEED_JOB_SEARCH, jobDetails, applictionLimit: 10 });
                });
            }
        });
    });
}

/**
 * 处理开始自动投递消息
 */
function handleStartAutoApplying(message: any, sendResponse: (response?: any) => void): void {
    const { job: jobDetails, jobFilters: filters, updatedJobBoards } = message;
    clearJobData();
    removeJobData();

    if (updatedJobBoards.linkedin.enabled) {
        openLinkedInJobsPage({ jobDetails, filters });
    }
    if (updatedJobBoards.indeed.enabled) {
        openIndeedJobsPage({ jobDetails, filters });
    }

    sendResponse({ success: true });
}

/**
 * 处理打开 Indeed 职位页面消息
 */
function handleOpenIndeedJobPage(message: any): void {
    const jobId = message.jobId;
    const url = `https://www.indeed.com/viewjob?jk=${jobId}`;
    chrome.tabs.create({ url, active: true }, (tab) => {
        if (tab.id) {
            addListenerWithTimeout((tabId, info) => {
                if (tabId === tab.id && info.status === 'complete') {
                    chrome.tabs.sendMessage(tab.id!, { action: "applyForJob" });
                    setTimeout(() => {
                        closeTab(tabId);
                        chrome.runtime.sendMessage({ type: MessageType.PROCESS_NEXT_JOB });
                    }, 5000);
                }
            });
        }
    });
}

/**
 * 处理新申请标签页打开消息
 */
function handleNewApplyTabOpened(message: any): void {
    const { jobDetails, resumeText } = message;

    chrome.tabs.onCreated.addListener(function onNewTab(tab) {
        chrome.tabs.onCreated.removeListener(onNewTab);

        if (tab.id) {
            injectExternalJobsScript(tab.id, jobDetails, resumeText);
        }
    });
}

/**
 * 处理完成消息
 */
function handleCompleted(message: any, sendResponse: (response?: any) => void): void {
    if (message.tabId) {
        closeTab(message.tabId);
    }
    sendResponse({ received: true });
}

/**
 * 消息路由
 *
 * @param message 消息内容
 * @param sendResponse 响应回调
 * @returns 是否异步处理
 */
export function routeMessage(
    message: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
): boolean {
    switch (message.type) {
        case MessageType.START_AUTO_APPLYING:
            handleStartAutoApplying(message, sendResponse);
            break;
        case MessageType.OPEN_INDEED_JOB_PAGE:
            handleOpenIndeedJobPage(message);
            break;
        case MessageType.NEW_APPLY_TAB_OPENED:
            handleNewApplyTabOpened(message);
            break;
        case MessageType.COMPLETED:
            handleCompleted(message, sendResponse);
            break;
    }

    return true;
}
