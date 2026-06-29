import type { JobPlatform, JobCard } from '../interfaces/platform';
import type { JobFilters } from '../models/job-filters';
import type { JobProfile } from '../models/job-profile';
import {
  LINKEDIN_EXPERIENCE_MAP,
  LINKEDIN_JOB_TYPE_MAP,
  LINKEDIN_DATE_POSTED_MAP,
  LINKEDIN_REMOTE_MAP,
  LINKEDIN_INDUSTRY_MAP,
} from '../../lib/platform-maps';

/**
 * LinkedIn 平台适配器
 *
 * 实现 JobPlatform 接口，提供 LinkedIn 特定的职位搜索和申请功能
 */
export class LinkedInPlatform implements JobPlatform {
  readonly name = 'LinkedIn';
  readonly baseUrl = 'https://www.linkedin.com';

  /**
   * 构建 LinkedIn 职位搜索 URL
   *
   * @param filters 职位筛选条件
   * @param profile 用户求职档案
   * @returns 完整的搜索 URL
   */
  buildSearchUrl(filters: JobFilters, profile: JobProfile): string {
    const jobTitle = profile.desiredJobTitle.replace(/\s+/g, '+');
    const location = profile.workAddress;

    let url = `${this.baseUrl}/jobs/search/?keywords=${jobTitle}&location=${location}&f_AL=true`;

    if (filters.experienceLevel) {
      url += `&f_E=${LINKEDIN_EXPERIENCE_MAP[filters.experienceLevel as keyof typeof LINKEDIN_EXPERIENCE_MAP]}`;
    }

    if (filters.jobType && filters.jobType.length > 0) {
      const jobTypes = filters.jobType
        .map((type) => LINKEDIN_JOB_TYPE_MAP[type as keyof typeof LINKEDIN_JOB_TYPE_MAP])
        .join(',');
      url += `&f_JT=${jobTypes}`;
    }

    if (filters.datePosted) {
      url += `&f_TPR=${LINKEDIN_DATE_POSTED_MAP[filters.datePosted as keyof typeof LINKEDIN_DATE_POSTED_MAP]}`;
    }

    if (filters.remotePreference) {
      url += `&f_WT=${LINKEDIN_REMOTE_MAP[filters.remotePreference as keyof typeof LINKEDIN_REMOTE_MAP]}`;
    }

    if (filters.industry && filters.industry.length > 0) {
      const industries = filters.industry
        .map((ind) => LINKEDIN_INDUSTRY_MAP[ind as keyof typeof LINKEDIN_INDUSTRY_MAP])
        .join(',');
      url += `&f_I=${industries}`;
    }

    return url;
  }

  /**
   * 解析 LinkedIn 职位列表
   *
   * @param document 页面文档对象
   * @returns 解析出的职位卡片列表
   */
  parseJobList(document: Document): JobCard[] {
    const jobCards: JobCard[] = [];
    const cards = document.querySelectorAll('.job-card-container');

    cards.forEach((card) => {
      const element = card as HTMLElement;
      const linkElement = element.querySelector('a.job-card-container__link') as HTMLAnchorElement;
      const titleElement = element.querySelector('.job-card-list__title');
      const companyElement = element.querySelector('.job-card-container__primary-description');

      if (linkElement && titleElement) {
        jobCards.push({
          title: titleElement.textContent?.trim() || '',
          company: companyElement?.textContent?.trim() || '',
          url: linkElement.href || '',
          element,
        });
      }
    });

    return jobCards;
  }

  /**
   * 填写 LinkedIn 申请表单
   *
   * @param form 表单元素
   * @param profile 用户求职档案
   */
  async fillApplicationForm(form: HTMLFormElement, profile: JobProfile): Promise<void> {
    // LinkedIn 表单填写逻辑
    // 这里需要根据具体的表单字段进行填写
    console.log('填写 LinkedIn 表单:', profile.fullName);

    // 示例：填写姓名字段
    const nameInput = form.querySelector('input[id*="name"]') as HTMLInputElement;
    if (nameInput) {
      nameInput.value = profile.fullName;
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // 示例：填写邮箱字段
    const emailInput = form.querySelector('input[id*="email"]') as HTMLInputElement;
    if (emailInput) {
      emailInput.value = profile.email;
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  /**
   * 提交 LinkedIn 申请
   *
   * @returns 是否提交成功
   */
  async submitApplication(): Promise<boolean> {
    try {
      const submitButton = document.querySelector('button[aria-label="Submit application"]') as HTMLButtonElement;
      if (submitButton) {
        submitButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        return true;
      }
      return false;
    } catch (error) {
      console.error('提交 LinkedIn 申请失败:', error);
      return false;
    }
  }
}
