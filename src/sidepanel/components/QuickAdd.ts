import type { Category } from '../../lib/types';
import { createDatePickerField } from './DatePickerField';

export function createQuickAdd(
  getDefaultCategoryId: () => string,
  getCategories: () => Category[],
  onAdd: (title: string, categoryId: string, dueDate?: string) => void
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'quick-add';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'quick-add__input';
  input.placeholder = '+ Quick add task…';

  const select = document.createElement('select');
  select.className = 'quick-add__category';
  select.title = 'Category';

  const duePicker = createDatePickerField(undefined);
  duePicker.el.classList.add('quick-add__due');

  function refreshCategories(): void {
    const cats = getCategories();
    select.replaceChildren(
      ...cats.map((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        return opt;
      })
    );
    select.value = getDefaultCategoryId();
  }

  refreshCategories();

  function submit(): void {
    const title = input.value.trim();
    if (!title) return;
    const dueDate = duePicker.getValue() || undefined;
    onAdd(title, select.value || getDefaultCategoryId(), dueDate);
    input.value = '';
    duePicker.clear();
    input.focus();
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });

  wrap.append(input, select, duePicker.el);

  return Object.assign(wrap, { refreshCategories });
}
