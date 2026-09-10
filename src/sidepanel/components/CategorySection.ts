import { getTasksForCategory } from '../../lib/task-utils';
import type { AppState, Category, Task, TaskFilter } from '../../lib/types';
import { createDropZone, createTaskRow, type TaskRowCallbacks } from './TaskRow';

export interface CategorySectionCallbacks extends TaskRowCallbacks {
  onToggleCollapse: (id: string) => void;
  onEditCategory: (category: Category) => void;
  onCategoryDragStart: (categoryId: string, e: DragEvent) => void;
  onCategoryDrop: (categoryId: string, e: DragEvent) => void;
  onCategoryDropZone: (categoryId: string, index: number, e: DragEvent) => void;
}

export function createCategorySection(
  category: Category,
  state: AppState,
  filter: TaskFilter,
  search: string,
  callbacks: CategorySectionCallbacks
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'category-section';
  section.style.setProperty('--cat-color', category.color);
  section.dataset.categoryId = category.id;

  const tasks = getTasksForCategory(state.tasks, category.id, filter, search);

  const header = document.createElement('div');
  header.className = 'category-section__header';
  header.draggable = true;

  header.addEventListener('dragstart', (e) => callbacks.onCategoryDragStart(category.id, e));
  header.addEventListener('dragover', (e) => {
    e.preventDefault();
    header.classList.add('category-section__header--drag-over');
  });
  header.addEventListener('dragleave', () =>
    header.classList.remove('category-section__header--drag-over')
  );
  header.addEventListener('drop', (e) => {
    e.preventDefault();
    header.classList.remove('category-section__header--drag-over');
    callbacks.onCategoryDrop(category.id, e);
  });

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'category-section__toggle';
  toggle.textContent = category.collapsed !== false ? '▶' : '▼';
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    callbacks.onToggleCollapse(category.id);
  });

  const colorDot = document.createElement('span');
  colorDot.className = 'category-section__color';
  colorDot.style.backgroundColor = category.color;
  colorDot.title = category.color;

  const name = document.createElement('span');
  name.className = 'category-section__name';
  name.textContent = `${category.name} (${tasks.length})`;

  const menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.className = 'category-section__menu';
  menuBtn.textContent = '···';
  menuBtn.title = 'Edit category';
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    callbacks.onEditCategory(category);
  });

  header.append(toggle, colorDot, name, menuBtn);
  section.appendChild(header);

  if (category.collapsed === false) {
    const list = document.createElement('div');
    list.className = 'category-section__list';

    list.appendChild(
      createDropZone(category.id, 0, () => {}, callbacks.onCategoryDropZone)
    );

    tasks.forEach((task, i) => {
      list.appendChild(createTaskRow(task, callbacks));
      list.appendChild(
        createDropZone(category.id, i + 1, () => {}, callbacks.onCategoryDropZone)
      );
    });

    section.appendChild(list);
  }

  return section;
}
