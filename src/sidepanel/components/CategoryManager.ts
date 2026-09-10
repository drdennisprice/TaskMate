import {
  addCategory,
  deleteCategory,
  updateCategory,
} from '../../lib/storage';
import type { Category } from '../../lib/types';

const PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f97316',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
];

function createField(labelText: string): { field: HTMLElement; body: HTMLElement } {
  const field = document.createElement('div');
  field.className = 'field';

  const label = document.createElement('span');
  label.className = 'field__label';
  label.textContent = labelText;

  const body = document.createElement('div');
  body.className = 'field__body';

  field.append(label, body);
  return { field, body };
}

export function openCategoryManager(
  category: Category | null,
  onClose: () => void
): void {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal category-manager';

  const title = document.createElement('h2');
  title.className = 'modal__title';
  title.textContent = category ? 'Edit Category' : 'New Category';

  const { field: nameField, body: nameBody } = createField('Name');
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'field__input';
  nameInput.value = category?.name ?? '';
  nameBody.appendChild(nameInput);

  let selectedColor = category?.color ?? PRESET_COLORS[0];

  const { field: colorField, body: colorBody } = createField('Color');
  const colorSection = document.createElement('div');
  colorSection.className = 'color-picker-section';

  const preview = document.createElement('div');
  preview.className = 'color-picker__preview';
  preview.style.backgroundColor = selectedColor;
  preview.title = 'Selected color';

  const nativeColor = document.createElement('input');
  nativeColor.type = 'color';
  nativeColor.className = 'color-picker__native';
  nativeColor.value = selectedColor;
  nativeColor.title = 'Choose custom color';

  const colorRow = document.createElement('div');
  colorRow.className = 'color-picker';

  function setSelectedColor(color: string): void {
    selectedColor = color;
    preview.style.backgroundColor = color;
    nativeColor.value = color;
    colorRow.querySelectorAll('.color-picker__swatch').forEach((el) => {
      el.classList.toggle(
        'color-picker__swatch--active',
        (el as HTMLElement).dataset.color === color
      );
    });
  }

  PRESET_COLORS.forEach((color) => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'color-picker__swatch';
    swatch.dataset.color = color;
    swatch.style.backgroundColor = color;
    swatch.title = color;
    if (color === selectedColor) swatch.classList.add('color-picker__swatch--active');
    swatch.addEventListener('click', () => setSelectedColor(color));
    colorRow.appendChild(swatch);
  });

  nativeColor.addEventListener('input', () => setSelectedColor(nativeColor.value));

  colorSection.append(preview, nativeColor, colorRow);
  colorBody.appendChild(colorSection);

  const actions = document.createElement('div');
  actions.className = 'modal__actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn--ghost';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', close);

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn btn--primary';
  saveBtn.textContent = category ? 'Save' : 'Add';
  saveBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) return;
    if (category) {
      await updateCategory(category.id, { name, color: selectedColor });
    } else {
      await addCategory(name, selectedColor);
    }
    close();
  });

  actions.append(cancelBtn, saveBtn);

  if (category) {
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn--danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', async () => {
      if (!confirm(`Delete category "${category.name}"? Tasks will move to another category.`)) return;
      await deleteCategory(category.id);
      close();
    });
    actions.prepend(deleteBtn);
  }

  modal.append(title, nameField, colorField, actions);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  nameInput.focus();

  function close(): void {
    overlay.remove();
    onClose();
  }
}
