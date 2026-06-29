/**
 * 职位筛选条件模型
 *
 * 表示用户设置的职位筛选条件
 */
export interface JobFilters {
  /** 经验等级 */
  experienceLevel: string;
  /** 工作类型 */
  jobType: string[];
  /** 发布日期 */
  datePosted: string;
  /** 远程办公偏好 */
  remotePreference: string;
  /** 行业 */
  industry: string[];
}
