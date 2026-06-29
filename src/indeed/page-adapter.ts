/**
 * Indeed 页面适配器
 *
 * 实现 PageAdapter 接口，提供 Indeed 特定的 DOM 操作
 */

import type { PageAdapter, FormFieldInfo, JobDetails } from '../domain/interfaces/page-adapter';
import { indeedScrollManager } from '../lib/scroll-manager';
import { delay } from '../lib/utils';

export class IndeedPageAdapter implements PageAdapter {
  readonly name = 'Indeed';

  /**
   * 查找职位卡片
   */
  findJobCards(): HTMLElement[] {
    return Array.from(document.querySelectorAll('.jobsearch-ResultsList > li')) as HTMLElement[];
  }

  /**
   * 提取职位详情
   */
  extractJobDetails(jobCard: HTMLElement): JobDetails {
    const title = jobCard.querySelector('.jobTitle')?.textContent?.trim() || '';
    const company = jobCard.querySelector('.companyName')?.textContent?.trim() || '';
    const location = jobCard.querySelector('.companyLocation')?.textContent?.trim() || '';

    return { title, company, description: '', location };
  }

  /**
   * 查找申请按钮
   */
  findApplyButton(): HTMLElement | null {
    return document.querySelector('button[id^="indeedApplyButton"]') as HTMLElement;
  }

  /**
   * 查找表单字段
   */
  findFormFields(): FormFieldInfo[] {
    const fields: FormFieldInfo[] = [];

    // input 字段
    document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]').forEach((input) => {
      const inputEl = input as HTMLInputElement;
      const id = inputEl.id || inputEl.name || `input-${fields.length}`;
      const label =
        document.querySelector(`label[for="${id}"]`)?.textContent?.trim() ||
        inputEl.getAttribute('aria-label') ||
        '';

      fields.push({
        id,
        type: 'input',
        inputType: inputEl.type,
        label,
        placeholder: inputEl.placeholder,
        required: inputEl.required,
        options: null,
        element: inputEl,
      });
    });

    // textarea 字段
    document.querySelectorAll('textarea').forEach((textarea) => {
      const textareaEl = textarea as HTMLTextAreaElement;
      const id = textareaEl.id || textareaEl.name || `textarea-${fields.length}`;
      const label =
        document.querySelector(`label[for="${id}"]`)?.textContent?.trim() || '';

      fields.push({
        id,
        type: 'textarea',
        inputType: null,
        label,
        placeholder: textareaEl.placeholder,
        required: textareaEl.required,
        options: null,
        element: textareaEl,
      });
    });

    // select 字段
    document.querySelectorAll('select').forEach((select) => {
      const selectEl = select as HTMLSelectElement;
      const id = selectEl.id || selectEl.name || `select-${fields.length}`;
      const label =
        document.querySelector(`label[for="${id}"]`)?.textContent?.trim() || '';

      fields.push({
        id,
        type: 'select',
        inputType: null,
        label,
        placeholder: '',
        required: selectEl.required,
        options: Array.from(selectEl.options).map((opt) => opt.value),
        element: selectEl,
      });
    });

    // checkbox 字段
    document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      const checkboxEl = checkbox as HTMLInputElement;
      const id = checkboxEl.id || checkboxEl.name || `checkbox-${fields.length}`;
      const label =
        document.querySelector(`label[for="${id}"]`)?.textContent?.trim() || '';

      fields.push({
        id,
        type: 'checkbox',
        inputType: 'checkbox',
        label,
        placeholder: '',
        required: false,
        options: null,
        element: checkboxEl,
      });
    });

    return fields;
  }

  /**
   * 点击元素
   */
  clickElement(element: HTMLElement): void {
    element.click();
  }

  /**
   * 填写输入框
   */
  fillInput(element: HTMLElement, value: string): void {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  /**
   * 选择下拉框选项
   */
  selectOption(element: HTMLElement, value: string): void {
    if (!(element instanceof HTMLSelectElement)) return;

    const normalizedValue = value.toLowerCase().trim();
    const optionByText = Array.from(element.options).find((opt) =>
      opt.textContent?.toLowerCase().includes(normalizedValue)
    );

    if (optionByText) {
      element.value = optionByText.value;
    } else {
      element.selectedIndex =
        Array.from(element.options).findIndex((opt) => opt.value !== '') || 0;
    }

    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * 勾选复选框
   */
  setCheckbox(element: HTMLElement, checked: boolean): void {
    if (element instanceof HTMLInputElement && element.type === 'checkbox') {
      element.checked = checked;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  /**
   * 选择单选按钮
   */
  selectRadio(element: HTMLElement, value: string): void {
    const name = (element as HTMLInputElement).name;
    if (!name) return;

    const radioButtons = document.querySelectorAll(`input[type="radio"][name="${name}"]`);
    const normalizedValue = value.toLowerCase().trim();

    let selectedRadio: HTMLInputElement | null = null;

    for (const radio of Array.from(radioButtons)) {
      const radioEl = radio as HTMLInputElement;
      const radioLabel = radioEl.nextElementSibling as HTMLLabelElement;
      const radioLabelText = radioLabel?.textContent?.trim().toLowerCase() || '';

      if (
        radioEl.value.toLowerCase() === normalizedValue ||
        radioLabelText === normalizedValue
      ) {
        selectedRadio = radioEl;
        break;
      }
    }

    if (!selectedRadio) {
      selectedRadio = radioButtons[0] as HTMLInputElement;
    }

    if (selectedRadio) {
      selectedRadio.checked = true;
      selectedRadio.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  /**
   * 等待页面加载完成
   */
  async waitForLoad(timeout = 10000): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, timeout);
      const check = setInterval(() => {
        if (document.readyState === 'complete') {
          clearTimeout(timer);
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * 滚动到底部加载更多内容
   */
  async scrollToLoadMore(): Promise<boolean> {
    return indeedScrollManager.scrollToBottom();
  }

  /**
   * 查找并点击下一页按钮
   */
  async goToNextPage(): Promise<boolean> {
    const nextButton = document.querySelector('a[data-testid="pagination-page-next"]') as HTMLAnchorElement;

    if (nextButton) {
      nextButton.click();
      await delay(2000);
      return true;
    }

    return false;
  }
}

// 创建全局单例
export const indeedPageAdapter = new IndeedPageAdapter();
