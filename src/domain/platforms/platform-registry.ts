import type { JobPlatform } from '../interfaces/platform';
import { LinkedInPlatform } from './linkedin-platform';
import { IndeedPlatform } from './indeed-platform';

/**
 * 平台注册表
 *
 * 管理所有可用的招聘平台适配器
 */
export class PlatformRegistry {
  private platforms: Map<string, JobPlatform> = new Map();

  constructor() {
    // 注册默认平台
    this.register(new LinkedInPlatform());
    this.register(new IndeedPlatform());
  }

  /**
   * 注册平台适配器
   *
   * @param platform 平台适配器实例
   */
  register(platform: JobPlatform): void {
    this.platforms.set(platform.name.toLowerCase(), platform);
    console.log(`已注册平台: ${platform.name}`);
  }

  /**
   * 获取平台适配器
   *
   * @param name 平台名称
   * @returns 平台适配器实例，如果不存在则返回 undefined
   */
  get(name: string): JobPlatform | undefined {
    return this.platforms.get(name.toLowerCase());
  }

  /**
   * 获取所有已注册的平台
   *
   * @returns 平台适配器数组
   */
  getAll(): JobPlatform[] {
    return Array.from(this.platforms.values());
  }

  /**
   * 检查平台是否已注册
   *
   * @param name 平台名称
   * @returns 是否已注册
   */
  has(name: string): boolean {
    return this.platforms.has(name.toLowerCase());
  }
}

// 创建默认的平台注册表实例
export const platformRegistry = new PlatformRegistry();
