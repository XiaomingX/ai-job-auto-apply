/**
 * 领域服务索引
 */

export { FormFiller, type FormField, type FormFieldValue } from './form-filler';
export { ResumeParser, resumeParser, type ResumeData } from './resume-parser';
export { JobMatcher, type MatchResult } from './job-matcher';
export {
  PromptTemplate,
  createFormFillTemplate,
  createJobMatchTemplate,
  type PromptVariable,
  type PromptTemplateConfig,
} from './prompt-template';
export { sanitizeInput, renderTemplate, truncateText } from './prompt-utils';
