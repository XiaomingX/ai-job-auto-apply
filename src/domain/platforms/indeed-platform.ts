import type { JobPlatform, JobCard } from '../interfaces/platform';
import type { JobFilters } from '../models/job-filters';
import type { JobProfile } from '../models/job-profile';
import {
  INDEED_EXPERIENCE_MAP,
  INDEED_JOB_TYPE_MAP,
  INDEED_DATE_POSTED_MAP,
  INDEED_REMOTE_MAP,
} from '../../lib/platform-maps';

/**
 * Indeed 平台适配器
 *
 * 实现 JobPlatform 接口，提供 Indeed 特定的职位搜索和申请功能
 */
export class IndeedPlatform implements JobPlatform {
  readonly name = 'Indeed';
  readonly baseUrl = 'https://www.indeed.com';

  /**
   * 构建 Indeed 职位搜索 URL
   *
   * @param filters 职位筛选条件
   * @param profile 用户求职档案
   * @returns 完整的搜索 URL
   */
  buildSearchUrl(filters: JobFilters, profile: JobProfile): string {
    const jobTitle = `${profile.desiredJobTitle.replace(/\s+/g, '+')}+indeedapply:1`;
    const location = profile.workAddress;

    let url = `${this.baseUrl}/jobs?q=${jobTitle}&l=${location}&fromage=1&apply=1`;

    if (filters.experienceLevel) {
      url += `&explvl=${INDEED_EXPERIENCE_MAP[filters.experienceLevel as keyof typeof INDEED_EXPERIENCE_MAP]}`;
    }

    if (filters.jobType && filters.jobType.length > 0) {
      const jobTypes = filters.jobType
        .map((type) => INDEED_JOB_TYPE_MAP[type as keyof typeof INDEED_JOB_TYPE_MAP])
        .join(',');
      url += `&jt=${jobTypes}`;
    }

    if (filters.datePosted) {
      url += `&fromage=${INDEED_DATE_POSTED_MAP[filters.datePosted as keyof typeof INDEED_DATE_POSTED_MAP]}`;
    }

    if (filters.remotePreference) {
      url += `&remote=${INDEED_REMOTE_MAP[filters.remotePreference as keyof typeof INDEED_REMOTE_MAP]}`;
    }

    if (filters.industry && filters.industry.length > 0) {
      const industries = filters.industry.map((ind) => ind.toLowerCase()).join(',');
      url += `&ind=${industries}`;
    }

    return url;
  }

  /**
   * 解析 Indeed 职位列表
   *
   * @param document 页面文档对象
   * @returns 解析出的职位卡片列表
   */
  parseJobList(document: Document): JobCard[] {
    const jobCards: JobCard[] = [];
    const cards = document.querySelectorAll('.jobsearch-ResultsList > li');

    cards.forEach((card) => {
      const element = card as HTMLElement;
      const linkElement = element.querySelector('a.jcs-JobTitle') as HTMLAnchorElement;
      const titleElement = element.querySelector('.jobTitle');
      const companyElement = element.querySelector('.companyName');

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
   * 填写 Indeed 申请表单
   *
   * @param form 表单元素
   * @param profile 用户求职档案
   */
  async fillApplicationForm(form: HTMLFormElement, profile: JobProfile): Promise<void> {
    // Indeed 表单填写逻辑
    console.log('填写 Indeed 表单:', profile.fullName);

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
   * 提交 Indeed 申请
   *
   * @returns 是否提交成功
   */
  async submitApplication(): Promise<boolean> {
    try {
      const submitButton = document.querySelector('button[id^="indeedApplyButton"]') as HTMLButtonElement;
      if (submitButton) {
        submitButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        return true;
      }
      return false;
    } catch (error) {
      console.error('提交 Indeed 申请失败:', error);
      return false;
    }
  }
}
