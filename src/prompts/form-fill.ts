/**
 * 表单填写提示词模板
 */

import { PromptTemplate } from '../domain/services/prompt-template';

/**
 * 表单字段填写提示词
 */
export const formFillPrompt = new PromptTemplate({
  name: 'form-fill',
  version: '1.0.0',
  description: '根据表单字段信息生成填写值',
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
3. For numeric fields, provide a realistic number based on the context.
4. For text fields, provide relevant information from the resume or profile.
5. For multiple choice, select the most appropriate option from the provided list.
6. For salary expectations, give a reasonable estimate based on the job details.
7. For dates, use the format 'MM/YYYY - MM/YYYY' or 'MM/YYYY - present'.
8. For work experience fields, extract relevant information from the resume.
9. For yes/no radio buttons, provide one of them.
10. For checkboxes related to terms/conditions, provide 'true'.
11. For cover letters, write a full cover letter based on the user details and job description.

Respond with ONLY the value to be entered in the field. Don't write any explanation.`,
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

/**
 * 工作经历填写提示词
 */
export const workExperiencePrompt = new PromptTemplate({
  name: 'work-experience',
  version: '1.0.0',
  description: '填写工作经历字段',
  template: `You are an AI assistant filling out a job application form.

Current section: "Work Experience"

Field to fill:
- Label: {{fieldLabel}}
- Type: {{fieldType}}
- Options: {{fieldOptions}}

Work Experience:
- Title: {{jobTitle}}
- Company: {{company}}
- City: {{city}}
- Start Date: {{startDate}}
- End Date: {{endDate}}
- Description: {{description}}

Provide ONLY the value to fill this field.`,
  variables: [
    { name: 'fieldLabel', description: '字段标签', required: true },
    { name: 'fieldType', description: '字段类型', required: true },
    { name: 'fieldOptions', description: '可选值', required: false, defaultValue: 'N/A' },
    { name: 'jobTitle', description: '职位名称', required: true },
    { name: 'company', description: '公司名称', required: true },
    { name: 'city', description: '城市', required: false, defaultValue: '' },
    { name: 'startDate', description: '开始日期', required: true },
    { name: 'endDate', description: '结束日期', required: true },
    { name: 'description', description: '工作描述', required: false, defaultValue: '' },
  ],
});

/**
 * 教育背景填写提示词
 */
export const educationPrompt = new PromptTemplate({
  name: 'education',
  version: '1.0.0',
  description: '填写教育背景字段',
  template: `You are an AI assistant filling out a job application form.

Current section: "Education"

Field to fill:
- Label: {{fieldLabel}}
- Type: {{fieldType}}
- Options: {{fieldOptions}}

Education:
- School: {{school}}
- Degree: {{degree}}
- Major: {{major}}
- City: {{city}}
- Start Date: {{startDate}}
- End Date: {{endDate}}

Provide ONLY the value to fill this field.`,
  variables: [
    { name: 'fieldLabel', description: '字段标签', required: true },
    { name: 'fieldType', description: '字段类型', required: true },
    { name: 'fieldOptions', description: '可选值', required: false, defaultValue: 'N/A' },
    { name: 'school', description: '学校名称', required: true },
    { name: 'degree', description: '学位', required: true },
    { name: 'major', description: '专业', required: true },
    { name: 'city', description: '城市', required: false, defaultValue: '' },
    { name: 'startDate', description: '开始日期', required: true },
    { name: 'endDate', description: '结束日期', required: true },
  ],
});
