/**
 * 页面适配器接口
 *
 * 定义与招聘平台页面交互的统一契约
 * 每个平台实现此接口，提供平台特定的 DOM 操作
 */

export interface FormFieldInfo {
  id: string;
  type: string;
  inputType: string | null;
  label: string;
  placeholder: string;
  required: boolean;
  options: string[] | null;
  element: HTMLElement;
}

export interface JobDetails {
  title: string;
  company: string;
  description: string;
  salary?: string;
  location?: string;
}

/**
 * 页面适配器接口
 */
export interface PageAdapter {
  /** 平台名称 */
  readonly name: string;

  /**
   * 查找职位卡片
   */
  findJobCards(): HTMLElement[];

  /**
   * 提取职位详情
   *
   * @param jobCard 职位卡片元素
   */
  extractJobDetails(jobCard: HTMLElement): JobDetails;

  /**
   * 查找申请按钮
   */
  findApplyButton(): HTMLElement | null;

  /**
   * 查找表单字段
   */
  findFormFields(): FormFieldInfo[];

  /**
   * 点击元素
   *
   * @param element 目标元素
   */
  clickElement(element: HTMLElement): void;

  /**
   * 填写输入框
   *
   * @param element 输入元素
   * @param value 填写值
   */
  fillInput(element: HTMLElement, value: string): void;

  /**
   * 选择下拉框选项
   *
   * @param element select 元素
   * @param value 选项值
   */
  selectOption(element: HTMLElement, value: string): void;

  /**
   * 勾选复选框
   *
   * @param element 复选框元素
   * @param checked 是否勾选
   */
  setCheckbox(element: HTMLElement, checked: boolean): void;

  /**
   * 选择单选按钮
   *
   * @param element 单选按钮元素
   * @param value 选项值
   */
  selectRadio(element: HTMLElement, value: string): void;

  /**
   * 等待页面加载完成
   *
   * @param timeout 超时时间（毫秒）
   */
  waitForLoad(timeout?: number): Promise<void>;

  /**
   * 滚动到底部加载更多内容
   */
  scrollToLoadMore(): Promise<boolean>;

  /**
   * 查找并点击下一页按钮
   *
   * @returns 是否成功跳转到下一页
   */
  goToNextPage(): Promise<boolean>;
}
