/**
 * 提示词工具函数
 *
 * 提供提示词相关的工具函数，包括输入清理、模板渲染等
 */

/**
 * 清理用户输入，防止提示词注入
 *
 * 移除或转义可能被解释为提示词指令的内容
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  return input
    .replace(/```[\s\S]*?```/g, '') // 移除代码块
    .replace(/\[INST\]/gi, '')       // 移除 Llama 指令标记
    .replace(/\[\/INST\]/gi, '')
    .replace(/<<SYS>>/gi, '')        // 移除系统提示标记
    .replace(/<\/SYS>>/gi, '')
    .replace(/Human:/gi, '')         // 移除角色标记
    .replace(/Assistant:/gi, '')
    .replace(/System:/gi, '')
    .replace(/\n{3,}/g, '\n\n')      // 压缩多余空行
    .trim();
}

/**
 * 渲染模板字符串
 *
 * @param template 模板字符串，使用 {{key}} 作为占位符
 * @param data 数据对象
 * @returns 渲染后的字符串
 */
export function renderTemplate(
  template: string,
  data: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

/**
 * 截断文本到指定长度
 *
 * @param text 原始文本
 * @param maxLength 最大长度
 * @param suffix 截断后的后缀
 * @returns 截断后的文本
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix = '...'
): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}
