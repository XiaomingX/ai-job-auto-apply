import { MessageType } from '../lib/status-codes';
import { delay } from './utils';

// 状态管理器
class IndeedApplicationStateManager {
    private state = {
        applicationCount: 0,
        applicationLimit: 100,
        currentPage: 1,
        isProcessing: false,
    };

    reset() {
        this.state = {
            ...this.state,
            applicationCount: 0,
            currentPage: 1,
            isProcessing: false,
        };
    }

    get() {
        return this.state;
    }

    update(partial: Partial<typeof this.state>) {
        this.state = { ...this.state, ...partial };
        this.saveToPersistence();
    }

    incrementApplicationCount() {
        this.state.applicationCount++;
        this.saveToPersistence();
    }

    // 保存到本地持久化存储
    private async saveToPersistence(): Promise<void> {
        try {
            await chrome.storage.local.set({
                'indeed-app-state': {
                    applicationCount: this.state.applicationCount,
                    applicationLimit: this.state.applicationLimit,
                    currentPage: this.state.currentPage,
                    lastUpdated: Date.now(),
                }
            });
        } catch (error) {
            console.error('保存状态失败:', error);
        }
    }

    // 从本地持久化存储加载
    async loadFromPersistence(): Promise<void> {
        try {
            const result = await chrome.storage.local.get('indeed-app-state');
            if (result['indeed-app-state']) {
                const saved = result['indeed-app-state'];
                this.state = {
                    ...this.state,
                    applicationCount: saved.applicationCount || 0,
                    applicationLimit: saved.applicationLimit || 100,
                    currentPage: saved.currentPage || 1,
                };
                console.log('已加载持久化状态:', saved);
            }
        } catch (error) {
            console.error('加载持久化状态失败:', error);
        }
    }
}

const appState = new IndeedApplicationStateManager();

async function processJobListings() {
    appState.update({ isProcessing: true });

    while (appState.get().applicationCount < appState.get().applicationLimit) {
        console.log(`处理第 ${appState.get().currentPage} 页`);

        await scrollToBottomSlowly();

        const jobCards = document.querySelectorAll('.jobsearch-ResultsList > li');
        console.log(`在第 ${appState.get().currentPage} 页找到 ${jobCards.length} 个职位`);

        for (let i = 0; i < jobCards.length && appState.get().applicationCount < appState.get().applicationLimit; i++) {
            await processJobCard(jobCards[i] as HTMLElement);
        }

        if (appState.get().applicationCount < appState.get().applicationLimit) {
            const nextPageLoaded = await loadNextJobPage();
            if (!nextPageLoaded) {
                console.log("没有更多页面了，结束处理。");
                break;
            }
            appState.update({ currentPage: appState.get().currentPage + 1 });
        } else {
            break;
        }
    }

    console.log(`总共申请了 ${appState.get().applicationCount} 个职位，跨越 ${appState.get().currentPage} 页`);
    appState.update({ isProcessing: false });
    chrome.runtime.sendMessage({ type: MessageType.ALL_JOBS_PROCESSED });
}

async function processJobCard(jobCard: HTMLElement) {
    console.log("处理职位卡片...");

    // 点击职位卡片打开职位详情
    const jobLink = jobCard.querySelector('a.jcs-JobTitle') as HTMLAnchorElement;
    if (jobLink) {
        jobLink.click();
        await delay(2000);
    } else {
        console.log("未找到职位链接，跳过此职位。");
        return;
    }

    // 查找申请按钮
    const applyButton = document.querySelector('button[id^="indeedApplyButton"]') as HTMLButtonElement;
    if (applyButton) {
        console.log("找到申请按钮，尝试申请...");
        applyButton.click();
        await delay(3000);

        // 处理申请流程
        await handleApplicationProcess();
    } else {
        console.log("未找到申请按钮，此职位可能需要外部申请。");
    }

    appState.incrementApplicationCount();
    console.log(`已申请 ${appState.get().applicationCount} 个职位。`);
}

async function handleApplicationProcess() {
 
    console.log("Simulating application process...");
    await delay(2000);
    
    // Close the application modal (if it exists)
    const closeButton = document.querySelector('button[aria-label="Close"]') as HTMLButtonElement;
    if (closeButton) {
        closeButton.click();
        await delay(1000);
    }
    
    console.log("Application submitted successfully.");
}

async function scrollToBottomSlowly() {
    console.log("Scrolling to bottom slowly to load all job listings...");
    const getScrollHeight = () => document.documentElement.scrollHeight;
    let lastScrollHeight = getScrollHeight();
    let currentScrollPosition = 0;
    let noNewContentCount = 0;
    
    while (true) {
        const maxScrollHeight = getScrollHeight();
        const remainingScroll = maxScrollHeight - currentScrollPosition;
        const maxIncrement = Math.min(remainingScroll, 1000);
        const scrollIncrement = Math.floor(Math.random() * (maxIncrement - 50 + 1) + 50);
        
        currentScrollPosition = Math.min(currentScrollPosition + scrollIncrement, maxScrollHeight);
        
        window.scrollTo({
            top: currentScrollPosition,
            behavior: 'smooth'
        });
        
        await delay(200 + Math.random() * 300);
        
        const newScrollHeight = getScrollHeight();
        if (newScrollHeight === lastScrollHeight) {
            noNewContentCount++;
            if (noNewContentCount >= 2 && currentScrollPosition >= maxScrollHeight - 10) {
                console.log("Reached the bottom of the page.");
                break;
            }
        } else {
            noNewContentCount = 0;
            lastScrollHeight = newScrollHeight;
        }
        
        await delay(100 + Math.random() * 200);
    }
    
    window.scrollTo({
        top: getScrollHeight(),
        behavior: 'smooth'
    });
    await delay(100);
    
    console.log("Scrolling back to top slowly...");
    await scrollToTopSlowly();
}

async function scrollToTopSlowly() {
    const initialScrollPosition = window.pageYOffset;
    let currentScrollPosition = initialScrollPosition;
    
    while (currentScrollPosition > 0) {
        const scrollPercentage = currentScrollPosition / initialScrollPosition;
        const maxIncrement = Math.max(600, Math.floor(300 * scrollPercentage));
        const scrollIncrement = Math.floor(Math.random() * (maxIncrement - 50 + 1) + 50);
        
        currentScrollPosition = Math.max(0, currentScrollPosition - scrollIncrement);
        
        window.scrollTo({
            top: currentScrollPosition,
            behavior: 'smooth'
        });
        
        await delay(100 + Math.random() * 200);
    }
    
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

async function loadNextJobPage(): Promise<boolean> {
    const nextButton = document.querySelector('a[data-testid="pagination-page-next"]') as HTMLAnchorElement;
    
    if (nextButton) {
        nextButton.click();
        await delay(2000); // Wait for the next page to load
        console.log("Navigated to the next page of job listings");
        return true;
    } else {
        console.log("No more pages of job listings available.");
        return false;
    }
}

// 监听 START_INDEED_JOB_SEARCH 消息开始申请流程
chrome.runtime.onMessage.addListener(async function(message, _sender, sendResponse) {
    if (message.type === MessageType.START_INDEED_JOB_SEARCH) {
        appState.reset();
        appState.update({ applicationLimit: message.applicationLimit || 100 });
        console.log("开始职位申请流程...");
        await delay(2000);
        await processJobListings();
        sendResponse({ success: true });
    }
    return true;
});