/**
 * 教育背景模型
 *
 * 表示用户的一段教育经历信息
 */
export interface Education {
  /** 学校名称 */
  school: string;
  /** 学位 */
  degree: string;
  /** 所在城市 */
  city: string;
  /** 专业 */
  major: string;
  /** 开始日期 */
  startDate: string;
  /** 结束日期 */
  endDate: string;
  /** 是否为当前在读 */
  current: boolean;
}
