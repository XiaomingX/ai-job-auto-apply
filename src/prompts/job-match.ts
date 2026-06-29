/**
 * 职位匹配提示词模板
 */

import { PromptTemplate } from '../domain/services/prompt-template';

/**
 * 职位匹配判断提示词
 */
export const jobMatchPrompt = new PromptTemplate({
  name: 'job-match',
  version: '1.0.0',
  description: '判断简历是否匹配职位要求',
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
5. Salary expectations alignment

Respond with ONLY the JSON object, no other text.`,
  variables: [
    { name: 'resumeText', description: '简历文本', required: true },
    { name: 'jobDetails', description: '职位详情', required: true },
  ],
});

/**
 * 职位匹配简化提示词（用于快速判断）
 */
export const jobMatchSimplePrompt = new PromptTemplate({
  name: 'job-match-simple',
  version: '1.0.0',
  description: '快速判断职位是否匹配',
  template: `Based on the resume and job details below, should this candidate apply for this job?

Resume: {{resumeText}}

Job: {{jobTitle}} at {{company}}
Requirements: {{jobRequirements}}

Respond with only "Yes" or "No".`,
  variables: [
    { name: 'resumeText', description: '简历文本', required: true },
    { name: 'jobTitle', description: '职位名称', required: true },
    { name: 'company', description: '公司名称', required: true },
    { name: 'jobRequirements', description: '职位要求', required: true },
  ],
});
