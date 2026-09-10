import {
  formatDueDate,
  isDueToday,
  isOverdue,
  PRIORITY_COLORS,
} from '../../lib/task-utils';
import type { Task } from '../../lib/types';

export interface TaskRowCallbacks {
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDragStart: (taskId: string, e: DragEvent) => void;
  onDragOver: (taskId: string, e: DragEvent) => void;
  onDrop: (taskId: string, e: DragEvent) => void;
}

export function createTaskRow(task: Task, callbacks: TaskRowCallbacks): HTMLElement {
  const row = document.createElement('div');
  row.className = 'task-row';
  row.draggable = true;
  row.dataset.taskId = task.id;

  if (task.status === 'done') row.classList.add('task-row--done');

  row.addEventListener('dragstart', (e) => callbacks.onDragStart(task.id, e));
  row.addEventListener('dragover', (e) => callbacks.onDragOver(task.id, e));
  row.addEventListener('drop', (e) => callbacks.onDrop(task.id, e));

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-row__checkbox';
  checkbox.checked = task.status === 'done';
  checkbox.addEventListener('click', (e) => e.stopPropagation());
  checkbox.addEventListener('change', () => callbacks.onToggle(task.id));

  const title = document.createElement('span');
  title.className = 'task-row__title';
  title.textContent = task.title;
  title.title = task.title;

  const meta = document.createElement('div');
  meta.className = 'task-row__meta';

  if (task.priority !== 'none') {
    const dot = document.createElement('span');
    dot.className = 'task-row__priority';
    dot.style.backgroundColor = PRIORITY_COLORS[task.priority];
    dot.title = task.priority;
    meta.appendChild(dot);
  }

  if (task.dueDate) {
    const due = document.createElement('span');
    due.className = 'task-row__due';
    if (isOverdue(task)) due.classList.add('task-row__due--overdue');
    else if (isDueToday(task)) due.classList.add('task-row__due--today');
    due.textContent = isOverdue(task)
      ? `⚠ ${formatDueDate(task.dueDate)}`
      : formatDueDate(task.dueDate);
    meta.appendChild(due);
  }

  row.append(checkbox, title, meta);
  row.addEventListener('click', () => callbacks.onEdit(task));

  return row;
}

export function createDropZone(
  categoryId: string,
  index: number,
  onDragOver: (categoryId: string, index: number, e: DragEvent) => void,
  onDrop: (categoryId: string, index: number, e: DragEvent) => void
): HTMLElement {
  const zone = document.createElement('div');
  zone.className = 'drop-zone';
  zone.dataset.categoryId = categoryId;
  zone.dataset.index = String(index);

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drop-zone--active');
    onDragOver(categoryId, index, e);
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drop-zone--active'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drop-zone--active');
    onDrop(categoryId, index, e);
  });

  return zone;
}
