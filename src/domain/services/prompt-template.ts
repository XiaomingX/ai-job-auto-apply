/**
 * 提示词模板值对象
 *
 * 管理提示词模板，支持：
 * - 变量插值
 * - 条件分支
 * - 版本控制
 */

export interface PromptVariable {
  name: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

export interface PromptTemplateConfig {
  name: string;
  version: string;
  description: string;
  template: string;
  variables: PromptVariable[];
}

export class PromptTemplate {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  private template: string;
  private variables: Map<string, PromptVariable>;

  constructor(config: PromptTemplateConfig) {
    this.name = config.name;
    this.version = config.version;
    this.description = config.description;
    this.template = config.template;
    this.variables = new Map(config.variables.map((v) => [v.name, v]));
  }

  /**
   * 渲染模板
   *
   * @param data 变量数据
   * @returns 渲染后的提示词
   */
  render(data: Record<string, string>): string {
    // 检查必填变量
    for (const [name, variable] of this.variables) {
      if (variable.required && !(name in data) && !variable.defaultValue) {
        throw new Error(`缺少必填变量: ${name}`);
      }
    }

    // 渲染模板
    let result = this.template;

    // 替换变量 {{variableName}}
    result = result.replace(/\{\{(\w+)\}\}/g, (match, name) => {
      if (name in data) return data[name];
      const variable = this.variables.get(name);
      if (variable?.defaultValue) return variable.defaultValue;
      return match;
    });

    // 处理条件块 {{#if variableName}}...{{/if}}
    result = result.replace(
      /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (_match, name, content) => {
        return data[name] ? content : '';
      }
    );

    // 处理条件块（带 else） {{#if variableName}}...{{else}}...{{/if}}
    result = result.replace(
      /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (_match, name, trueContent, falseContent) => {
        return data[name] ? trueContent : falseContent;
      }
    );

    return result.trim();
  }

  /**
   * 获取变量列表
   */
  getVariables(): PromptVariable[] {
    return Array.from(this.variables.values());
  }

  /**
   * 检查变量是否存在
   */
  hasVariable(name: string): boolean {
    return this.variables.has(name);
  }
}

/**
 * 创建表单填写提示词模板
 */
export function createFormFillTemplate(): PromptTemplate {
  return new PromptTemplate({
    name: 'form-fill',
    version: '1.0.0',
    description: '表单字段填写提示词',
    template: `You are an AI assistant designed to accurately fill out job application forms.

Current section: "{{sectionTitle}}"

Field details:
- Name: {{fieldName}}
- Type: {{fieldType}}
- Label: {{fieldLabel}}
- Placeholder: {{fieldPlaceholder}}
- Required: {{fieldRequired}}
- Options: {{fieldOptions}}

User Profile:
- Name: {{userName}}
- Email: {{userEmail}}
- Phone: {{userPhone}}
- Skills: {{userSkills}}

Resume excerpt:
{{resumeText}}

Rules:
1. Provide ONLY the value to fill the field. No explanations.
2. For location fields, provide a comma-separated list of relevant cities from the options.
3. For numeric fields, provide a realistic number.
4. For text fields, provide relevant information from the resume or profile.
5. For multiple choice, select the most appropriate option from the provided list.
6. For dates, use the format 'MM/YYYY'.
7. For yes/no radio buttons, provide one of them.
8. For checkboxes related to terms/conditions, provide 'true'.

Respond with ONLY the value to be entered in the field.`,
    variables: [
      { name: 'sectionTitle', description: '当前表单区域标题', required: true },
      { name: 'fieldName', description: '字段名称', required: true },
      { name: 'fieldType', description: '字段类型', required: true },
      { name: 'fieldLabel', description: '字段标签', required: true },
      { name: 'fieldPlaceholder', description: '字段占位符', required: false, defaultValue: '' },
      { name: 'fieldRequired', description: '是否必填', required: true },
      { name: 'fieldOptions', description: '可选值列表', required: false, defaultValue: 'N/A' },
      { name: 'userName', description: '用户姓名', required: true },
      { name: 'userEmail', description: '用户邮箱', required: true },
      { name: 'userPhone', description: '用户电话', required: false, defaultValue: '' },
      { name: 'userSkills', description: '用户技能', required: false, defaultValue: '' },
      { name: 'resumeText', description: '简历文本', required: true },
    ],
  });
}

/**
 * 创建职位匹配提示词模板
 */
export function createJobMatchTemplate(): PromptTemplate {
  return new PromptTemplate({
    name: 'job-match',
    version: '1.0.0',
    description: '职位匹配判断提示词',
    template: `You are an experienced HR professional. Analyze how well the candidate's qualifications match the job requirements.

Resume:
{{resumeText}}

Job Details:
{{jobDetails}}

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

Respond with ONLY the JSON object, no other text.`,
    variables: [
      { name: 'resumeText', description: '简历文本', required: true },
      { name: 'jobDetails', description: '职位详情', required: true },
    ],
  });
}
