/**
 * 职位匹配领域服务
 *
 * 负责判断用户简历是否匹配职位要求
 */

import type { AIProvider } from '../../lib/ai';
import { truncateText } from './prompt-utils';

export interface MatchResult {
  matched: boolean;
  confidence: number; // 0-1
  reason?: string;
}

export class JobMatcher {
  private readonly maxResumeLength = 2000;
  private readonly maxJobDetailLength = 2000;

  constructor(private aiProvider: AIProvider) {}

  /**
   * 判断职位是否匹配
   *
   * @param resumeText 简历文本
   * @param jobDetails 职位详情
   * @returns 匹配结果
   */
  async match(resumeText: string, jobDetails: string): Promise<MatchResult> {
    const prompt = this.buildPrompt(resumeText, jobDetails);

    try {
      const response = await this.aiProvider.sendMessage(prompt);
      return this.parseResponse(response);
    } catch (error) {
      console.error('职位匹配判断失败:', error);
      return { matched: false, confidence: 0, reason: 'AI 请求失败' };
    }
  }

  /**
   * 构建提示词
   */
  private buildPrompt(resumeText: string, jobDetails: string): string {
    const truncatedResume = truncateText(resumeText, this.maxResumeLength);
    const truncatedJob = truncateText(jobDetails, this.maxJobDetailLength);

    return `
You are an experienced HR professional. Analyze how well the candidate's qualifications match the job requirements.

Resume:
${truncatedResume}

Job Details:
${truncatedJob}

Please respond in the following JSON format:
{
  "matched": true/false,
  "confidence": 0.0-1.0,
  "reason": "brief explanation"
}

Consider:
1. Required skills and experience
2. Education requirements
3. Years of experience
4. Industry relevance

Respond with ONLY the JSON object, no other text.
`;
  }

  /**
   * 解析 AI 响应
   */
  private parseResponse(response: string): MatchResult {
    try {
      // 尝试提取 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          matched: Boolean(parsed.matched),
          confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
          reason: parsed.reason,
        };
      }

      // 回退：检查是否包含 yes/no
      const normalized = response.toLowerCase().trim();
      if (normalized === 'yes' || normalized.includes('"matched": true')) {
        return { matched: true, confidence: 0.7 };
      }
      if (normalized === 'no' || normalized.includes('"matched": false')) {
        return { matched: false, confidence: 0.7 };
      }

      return { matched: false, confidence: 0, reason: '无法解析 AI 响应' };
    } catch (error) {
      console.error('解析匹配结果失败:', error);
      return { matched: false, confidence: 0, reason: '解析失败' };
    }
  }
}
