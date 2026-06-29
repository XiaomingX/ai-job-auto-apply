/**
 * 表单填写领域服务
 *
 * 负责表单填写的业务逻辑，包括：
 * - 表单字段验证
 * - AI 填写值生成
 * - 填写结果处理
 *
 * 注意：DOM 操作由 PageAdapter 负责
 */

import type { AIProvider } from '../../lib/ai';
import type { JobProfile } from '../models/job-profile';
import { sanitizeInput } from './prompt-utils';

export interface FormField {
  id: string;
  type: string;
  inputType: string | null;
  label: string;
  placeholder: string;
  required: boolean;
  options: string[] | null;
}

export interface FormFieldValue {
  fieldId: string;
  value: string;
  confidence: number; // 0-1
}

export class FormFiller {
  constructor(private aiProvider: AIProvider) {}

  /**
   * 为表单字段生成填写值
   *
   * @param field 表单字段信息
   * @param profile 用户求职档案
   * @param sectionTitle 当前表单区域标题
   * @param resumeText 简历文本
   * @returns 生成的填写值
   */
  async generateFieldValue(
    field: FormField,
    profile: JobProfile,
    sectionTitle: string,
    resumeText: string
  ): Promise<FormFieldValue> {
    // 特殊字段处理
    const specialValue = this.handleSpecialFields(field, profile);
    if (specialValue) {
      return specialValue;
    }

    // 使用 AI 生成值
    const prompt = this.buildPrompt(field, profile, sectionTitle, resumeText);
    const response = await this.aiProvider.sendMessage(prompt);

    return {
      fieldId: field.id,
      value: this.cleanResponse(response),
      confidence: 0.8,
    };
  }

  /**
   * 处理特殊字段（姓名、邮箱等）
   */
  private handleSpecialFields(
    field: FormField,
    profile: JobProfile
  ): FormFieldValue | null {
    const label = field.label.toLowerCase();

    if (label.includes('first name')) {
      return {
        fieldId: field.id,
        value: profile.fullName.split(' ')[0] || '',
        confidence: 1.0,
      };
    }

    if (label.includes('last name')) {
      return {
        fieldId: field.id,
        value: profile.fullName.split(' ').slice(1).join(' ') || '',
        confidence: 1.0,
      };
    }

    if (label.includes('email') && field.type !== 'select') {
      return {
        fieldId: field.id,
        value: profile.email,
        confidence: 1.0,
      };
    }

    if (label.includes('phone') && !label.includes('country code')) {
      return {
        fieldId: field.id,
        value: profile.phone,
        confidence: 1.0,
      };
    }

    return null;
  }

  /**
   * 构建 AI 提示词
   */
  private buildPrompt(
    field: FormField,
    profile: JobProfile,
    sectionTitle: string,
    resumeText: string
  ): string {
    return `
You are an AI assistant designed to accurately fill out job application forms.

Current section: "${sanitizeInput(sectionTitle)}"

Field details:
- Name: ${sanitizeInput(field.id)}
- Type: ${sanitizeInput(field.type)}
- Label: ${sanitizeInput(field.label)}
- Placeholder: ${sanitizeInput(field.placeholder)}
- Required: ${field.required}
- Options: ${field.options ? field.options.map(o => sanitizeInput(o)).join(', ') : 'N/A'}

User Profile:
- Name: ${profile.fullName}
- Email: ${profile.email}
- Phone: ${profile.phone}
- Skills: ${profile.primarySkills}

Resume excerpt:
${resumeText.substring(0, 500)}

Rules:
1. Provide ONLY the value to fill the field. No explanations.
2. For location fields, provide a comma-separated list of relevant cities from the options.
3. For numeric fields, provide a realistic number.
4. For text fields, provide relevant information from the resume or profile.
5. For multiple choice, select the most appropriate option from the provided list.
6. For dates, use the format 'MM/YYYY'.
7. For yes/no radio buttons, provide one of them.
8. For checkboxes related to terms/conditions, provide 'true'.

Respond with ONLY the value to be entered in the field.
`;
  }

  /**
   * 清理 AI 响应
   */
  private cleanResponse(response: string): string {
    // 取最后一行作为答案（避免 AI 的解释文本）
    const lines = response.trim().split('\n');
    return lines[lines.length - 1].trim();
  }

  /**
   * 批量生成表单字段值
   */
  async generateFieldValues(
    fields: FormField[],
    profile: JobProfile,
    sectionTitle: string,
    resumeText: string
  ): Promise<FormFieldValue[]> {
    const results: FormFieldValue[] = [];

    for (const field of fields) {
      try {
        const value = await this.generateFieldValue(
          field,
          profile,
          sectionTitle,
          resumeText
        );
        results.push(value);
      } catch (error) {
        console.error(`生成字段 ${field.id} 的值失败:`, error);
        results.push({
          fieldId: field.id,
          value: '',
          confidence: 0,
        });
      }
    }

    return results;
  }
}
