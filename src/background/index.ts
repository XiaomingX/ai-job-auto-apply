import { routeMessage } from './message-router';

// 消息监听器
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    return routeMessage(message, sender, sendResponse);
});
