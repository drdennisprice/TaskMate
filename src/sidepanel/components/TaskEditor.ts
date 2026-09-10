import { deleteTask, updateTask } from '../../lib/storage';
import type { Category, Priority, Task } from '../../lib/types';
import { createDatePickerField } from './DatePickerField';

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

export function openTaskEditor(
  task: Task,
  categories: Category[],
  onClose: () => void
): void {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal task-editor';

  const title = document.createElement('h2');
  title.className = 'modal__title';
  title.textContent = 'Edit Task';

  const { field: titleField, body: titleBody } = createField('Title');
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.className = 'field__input';
  titleInput.value = task.title;
  titleBody.appendChild(titleInput);

  const { field: notesField, body: notesBody } = createField('Notes');
  const notesInput = document.createElement('textarea');
  notesInput.className = 'field__textarea';
  notesInput.rows = 3;
  notesInput.value = task.notes ?? '';
  notesBody.appendChild(notesInput);

  const { field: categoryField, body: categoryBody } = createField('Category');
  const categorySelect = document.createElement('select');
  categorySelect.className = 'field__input';
  categories.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    if (c.id === task.categoryId) opt.selected = true;
    categorySelect.appendChild(opt);
  });
  categoryBody.appendChild(categorySelect);

  const { field: priorityField, body: priorityBody } = createField('Priority');
  const prioritySelect = document.createElement('select');
  prioritySelect.className = 'field__input';
  (['none', 'low', 'medium', 'high'] as Priority[]).forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p.charAt(0).toUpperCase() + p.slice(1);
    if (p === task.priority) opt.selected = true;
    prioritySelect.appendChild(opt);
  });
  priorityBody.appendChild(prioritySelect);

  const { field: dueField, body: dueBody } = createField('Due date');
  const duePicker = createDatePickerField(task.dueDate);
  dueBody.appendChild(duePicker.el);

  const actions = document.createElement('div');
  actions.className = 'modal__actions';

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'btn btn--danger';
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', async () => {
    if (!confirm('Delete this task?')) return;
    await deleteTask(task.id);
    close();
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn--ghost';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', close);

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn btn--primary';
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', async () => {
    const newTitle = titleInput.value.trim();
    if (!newTitle) return;
    await updateTask(task.id, {
      title: newTitle,
      notes: notesInput.value.trim() || undefined,
      categoryId: categorySelect.value,
      priority: prioritySelect.value as Priority,
      dueDate: duePicker.getValue() || undefined,
    });
    close();
  });

  actions.append(deleteBtn, cancelBtn, saveBtn);
  modal.append(
    title,
    titleField,
    notesField,
    categoryField,
    priorityField,
    dueField,
    actions
  );
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  titleInput.focus();

  function close(): void {
    overlay.remove();
    onClose();
  }
}
