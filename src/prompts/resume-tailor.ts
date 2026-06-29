/**
 * 简历优化提示词模板
 */

import { PromptTemplate } from '../domain/services/prompt-template';

/**
 * 简历优化提示词
 */
export const resumeTailorPrompt = new PromptTemplate({
  name: 'resume-tailor',
  version: '1.0.0',
  description: '根据职位要求优化简历内容',
  template: `You are a professional resume writer. Optimize the following resume content to better match the job requirements.

Current Resume:
{{resumeText}}

Job Details:
{{jobTitle}} at {{company}}
{{jobDescription}}

Requirements:
1. Keep all factual information accurate
2. Highlight relevant skills and experience
3. Use keywords from the job description
4. Maintain professional tone
5. Focus on achievements and impact

Provide the optimized resume content. Do not add any explanations.`,
  variables: [
    { name: 'resumeText', description: '原始简历文本', required: true },
    { name: 'jobTitle', description: '职位名称', required: true },
    { name: 'company', description: '公司名称', required: true },
    { name: 'jobDescription', description: '职位描述', required: true },
  ],
});

/**
 * 技能匹配分析提示词
 */
export const skillMatchPrompt = new PromptTemplate({
  name: 'skill-match',
  version: '1.0.0',
  description: '分析技能匹配度',
  template: `Analyze the skill match between the candidate and the job requirements.

Candidate Skills:
{{candidateSkills}}

Job Requirements:
{{jobRequirements}}

Provide a JSON response:
{
  "matchPercentage": 0-100,
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3", "skill4"],
  "recommendations": "brief suggestions"
}

Respond with ONLY the JSON object.`,
  variables: [
    { name: 'candidateSkills', description: '候选人技能', required: true },
    { name: 'jobRequirements', description: '职位要求', required: true },
  ],
});
