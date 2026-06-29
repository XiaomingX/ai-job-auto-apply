import { WorkExperience } from './work-experience';
import { Education } from './education';

/**
 * 求职档案模型
 *
 * 表示用户的完整求职档案信息，包括个人信息、工作经历、教育背景等
 */
export interface JobProfile {
  /** 档案 ID */
  id: number;
  /** 用户 ID */
  userId: string;
  /** 姓名 */
  fullName: string;
  /** 邮箱 */
  email: string;
  /** 电话 */
  phone: string;
  /** 地址 */
  address: string;
  /** 工作地址 */
  workAddress: string;
  /** LinkedIn 主页 */
  linkedIn: string | null;
  /** 期望职位 */
  desiredJobTitle: string;
  /** 工作类型（全职、兼职等） */
  jobType: string;
  /** 工作地点偏好 */
  workLocation: string;
  /** 是否愿意搬迁 */
  willingToRelocate: boolean;
  /** 薪资范围 */
  salaryRange: string;
  /** 到岗时间 */
  availability: string;
  /** 当前就业状态 */
  currentEmploymentStatus: string;
  /** 工作年限 */
  yearsOfExperience: number;
  /** 最高学历 */
  highestEducation: string;
  /** 研究领域 */
  fieldOfStudy: string;
  /** 毕业年份 */
  graduationYear: number;
  /** 主要技能 */
  primarySkills: string;
  /** 语言能力 */
  languages: string;
  /** 简历文件 */
  resume: string | null;
  /** 求职信 */
  coverLetter: string | null;
  /** 个人陈述 */
  personalStatement: string | null;
  /** 信息来源 */
  heardAboutUs: string | null;
  /** 是否已删除 */
  isDeleted: boolean;
  /** 工作经历列表 */
  workExperiences: WorkExperience[];
  /** 教育背景列表 */
  educations: Education[];
}
