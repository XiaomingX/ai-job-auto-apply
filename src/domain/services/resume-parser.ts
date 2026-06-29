/**
 * 简历解析领域服务
 *
 * 负责简历的下载、解析和缓存管理
 */

export interface ResumeData {
  url: string;
  text: string;
  parsedAt: number;
}

export class ResumeParser {
  private cache = new Map<string, ResumeData>();

  /**
   * 解析简历
   *
   * @param url 简历 URL
   * @param extractText PDF 文本提取函数
   * @returns 解析后的简历文本
   */
  async parse(
    url: string,
    extractText: (pdfData: Blob) => Promise<string>
  ): Promise<string> {
    // 检查缓存
    const cached = this.cache.get(url);
    if (cached) {
      console.log('使用缓存的简历文本');
      return cached.text;
    }

    // 下载 PDF
    const pdfData = await this.download(url);

    // 提取文本
    const text = await extractText(pdfData);

    // 存入缓存
    this.cache.set(url, {
      url,
      text,
      parsedAt: Date.now(),
    });

    console.log('简历解析完成，文本长度:', text.length);
    return text;
  }

  /**
   * 下载 PDF 文件
   */
  private async download(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`下载简历失败: ${response.status} ${response.statusText}`);
    }
    return response.blob();
  }

  /**
   * 获取缓存的简历
   */
  getCached(url: string): ResumeData | undefined {
    return this.cache.get(url);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  get cacheSize(): number {
    return this.cache.size;
  }
}

// 创建全局单例
export const resumeParser = new ResumeParser();
