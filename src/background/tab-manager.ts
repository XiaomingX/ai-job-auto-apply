/**
 * 清理 jobIds 和搜索状态
 */
export function clearJobData(): void {
    chrome.storage.local.set({ jobIdsIndeed: [], isActiveSearch: false });
    console.log("已清理 jobIds 和搜索状态");
}

/**
 * 从 storage 中移除 jobIds
 */
export function removeJobData(): void {
    chrome.storage.local.remove('jobIds', () => {
        console.log("已从 storage 中移除 jobIds");
    });
}

/**
 * 关闭标签页
 *
 * @param tabId 标签页 ID
 */
export function closeTab(tabId: number): void {
    chrome.tabs.remove(tabId, () => {
        if (chrome.runtime.lastError) {
            console.error(`关闭标签页失败: ${chrome.runtime.lastError.message}`);
        }
    });
}
