import type { JobFilters } from '../models/job-filters';
import type { JobProfile } from '../models/job-profile';

/**
 * 职位卡片信息
 *
 * 从招聘平台页面解析出的职位基本信息
 */
export interface JobCard {
  /** 职位标题 */
  title: string;
  /** 公司名称 */
  company: string;
  /** 职位链接 */
  url: string;
  /** 原始 DOM 元素 */
  element: HTMLElement;
}

/**
 * 招聘平台适配接口
 *
 * 定义了与招聘平台交互的统一契约
 */
export interface JobPlatform {
  /** 平台名称 */
  readonly name: string;

  /** 平台基础 URL */
  readonly baseUrl: string;

  /**
   * 构建搜索 URL
   *
   * @param filters 职位筛选条件
   * @param profile 用户求职档案
   * @returns 完整的搜索 URL
   */
  buildSearchUrl(filters: JobFilters, profile: JobProfile): string;

  /**
   * 解析职位列表
   *
   * @param document 页面文档对象
   * @returns 解析出的职位卡片列表
   */
  parseJobList(document: Document): JobCard[];

  /**
   * 填写申请表单
   *
   * @param form 表单元素
   * @param profile 用户求职档案
   */
  fillApplicationForm(form: HTMLFormElement, profile: JobProfile): Promise<void>;

  /**
   * 提交申请
   *
   * @returns 是否提交成功
   */
  submitApplication(): Promise<boolean>;
}
