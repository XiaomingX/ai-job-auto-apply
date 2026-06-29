/**
 * 工作经历模型
 *
 * 表示用户的一段工作经历信息
 */
export interface WorkExperience {
  /** 职位名称 */
  title: string;
  /** 公司名称 */
  company: string;
  /** 所在城市 */
  city: string;
  /** 工作描述 */
  description: string;
  /** 开始日期 */
  startDate: string;
  /** 结束日期 */
  endDate: string;
  /** 是否为当前工作 */
  current: boolean;
}
