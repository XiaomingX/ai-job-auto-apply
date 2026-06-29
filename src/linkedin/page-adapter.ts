/**
 * LinkedIn 页面适配器
 *
 * 实现 PageAdapter 接口，提供 LinkedIn 特定的 DOM 操作
 */

import type { PageAdapter, FormFieldInfo, JobDetails } from '../domain/interfaces/page-adapter';
import { linkedinScrollManager } from '../lib/scroll-manager';
import { delay } from '../lib/utils';
import { selectors } from './selectors';

export class LinkedInPageAdapter implements PageAdapter {
  readonly name = 'LinkedIn';

  /**
   * 查找职位卡片
   */
  findJobCards(): HTMLElement[] {
    return Array.from(document.querySelectorAll('.job-card-container')) as HTMLElement[];
  }

  /**
   * 提取职位详情
   */
  extractJobDetails(jobCard: HTMLElement): JobDetails {
    const title = jobCard.querySelector('.job-card-list__title')?.textContent?.trim() || '';
    const company = jobCard.querySelector('.job-card-container__primary-description')?.textContent?.trim() || '';
    const linkElement = jobCard.querySelector('a.job-card-container__link') as HTMLAnchorElement;
    const url = linkElement?.href || '';

    return { title, company, description: url };
  }

  /**
   * 查找申请按钮
   */
  findApplyButton(): HTMLElement | null {
    return document.querySelector('.jobs-apply-button') as HTMLElement;
  }

  /**
   * 查找表单字段
   */
  findFormFields(): FormFieldInfo[] {
    const fields: FormFieldInfo[] = [];

    // select 字段
    document.querySelectorAll(selectors.select).forEach((select) => {
      const selectEl = select as HTMLSelectElement;
      const id = selectEl.id;
      const label = document.querySelector(`label[for="${id}"]`)?.textContent?.trim() || '';

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

    // radio 字段
    document.querySelectorAll(selectors.fieldset).forEach((fieldset) => {
      const fieldsetEl = fieldset as HTMLFieldSetElement;
      const legend = fieldsetEl.querySelector('legend');
      const radioButtons = fieldsetEl.querySelectorAll('input[type="radio"]');

      if (legend && radioButtons.length > 0) {
        const fieldName = fieldsetEl.id || 'radioGroup' + Math.random().toString(36).substr(2, 9);
        const legendText = legend.textContent?.trim() || '';
        const isRequired =
          legend.querySelector('.fb-dash-form-element__label-title--is-required') !== null;

        fields.push({
          id: fieldName,
          type: 'radio',
          inputType: 'radio',
          label: legendText,
          placeholder: '',
          required: isRequired,
          options: Array.from(radioButtons).map((radio) => (radio as HTMLInputElement).value),
          element: radioButtons[0] as HTMLElement,
        });
      }
    });

    // input/textarea 字段
    document.querySelectorAll(selectors.textInput).forEach((input) => {
      const inputEl = input as HTMLInputElement | HTMLTextAreaElement;
      const id = inputEl.id;
      const label = document.querySelector(`label[for="${id}"]`)?.textContent?.trim() || '';

      fields.push({
        id,
        type: inputEl.tagName.toLowerCase(),
        inputType: inputEl instanceof HTMLInputElement ? inputEl.type : null,
        label,
        placeholder: inputEl.placeholder,
        required: inputEl.required,
        options: null,
        element: inputEl,
      });
    });

    // checkbox 字段
    document.querySelectorAll(selectors.checkbox).forEach((checkbox) => {
      const checkboxEl = checkbox as HTMLInputElement;
      const id = checkboxEl.id;
      const label = document.querySelector(`label[for="${id}"]`)?.textContent?.trim() || '';

      fields.push({
        id,
        type: 'checkbox',
        inputType: 'checkbox',
        label,
        placeholder: '',
        required: checkboxEl.required,
        options: null,
        element: checkboxEl,
      });
    });

    // 文件上传字段
    const resumeUploadField = document.querySelector(selectors.documentUploadInput) as HTMLInputElement;
    if (resumeUploadField) {
      fields.push({
        id: 'resume',
        type: 'file',
        inputType: 'file',
        label: 'Upload resume',
        placeholder: '',
        required: resumeUploadField.hasAttribute('required'),
        options: null,
        element: resumeUploadField,
      });
    }

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

    // 尝试按 value 匹配
    const optionByValue = Array.from(element.options).find(
      (opt) => opt.value.toLowerCase() === normalizedValue
    );

    if (optionByValue) {
      element.value = optionByValue.value;
    } else {
      // 尝试按文本匹配
      const optionByText = Array.from(element.options).find((opt) =>
        opt.textContent?.toLowerCase().includes(normalizedValue)
      );

      if (optionByText) {
        element.value = optionByText.value;
      } else {
        // 选择第一个非空选项
        element.selectedIndex =
          Array.from(element.options).findIndex((opt) => opt.value !== '') || 0;
      }
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
    const fieldset = (element as HTMLInputElement).closest('fieldset');
    if (!fieldset) return;

    const radioButtons = fieldset.querySelectorAll('input[type="radio"]');
    const normalizedValue = value.toLowerCase().trim();

    let selectedRadio: HTMLInputElement | null = null;

    for (const radio of Array.from(radioButtons)) {
      const radioEl = radio as HTMLInputElement;
      const radioLabel = radioEl.nextElementSibling as HTMLLabelElement;
      const radioLabelText = radioLabel?.textContent?.trim().toLowerCase() || '';

      if (
        radioEl.value.toLowerCase() === normalizedValue ||
        radioLabelText === normalizedValue ||
        radioLabelText.includes(normalizedValue)
      ) {
        selectedRadio = radioEl;
        break;
      }
    }

    // 回退：选择第一个选项
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
    return linkedinScrollManager.scrollToBottom();
  }

  /**
   * 查找并点击下一页按钮
   */
  async goToNextPage(): Promise<boolean> {
    const paginationList = document.querySelector('.artdeco-pagination__pages');
    if (!paginationList) return false;

    const activeButton = paginationList.querySelector('li.active button') as HTMLButtonElement;
    if (!activeButton) return false;

    const currentPage = parseInt(activeButton.textContent?.trim() || '0', 10);
    const nextPage = currentPage + 1;

    let nextButton = paginationList.querySelector(
      `button[aria-label="Page ${nextPage}"]`
    ) as HTMLButtonElement;

    if (!nextButton) {
      nextButton = paginationList.querySelector(
        'li:not(.active) button span:not([data-test-pagination-page-btn])'
      ) as HTMLButtonElement;
    }

    if (nextButton && !nextButton.disabled) {
      nextButton.click();
      await delay(2000);
      return true;
    }

    return false;
  }
}

// 创建全局单例
export const linkedinPageAdapter = new LinkedInPageAdapter();
