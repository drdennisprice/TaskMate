import {
  addTask,
  initStorageListener,
  loadState,
  reorderCategories,
  reorderTasks,
  subscribe,
  toggleTaskStatus,
  updateCategory,
} from '../lib/storage';
import { createDefaultState, sortCategories } from '../lib/task-utils';
import type { AppState, TaskFilter } from '../lib/types';
import { STORAGE_KEY } from '../lib/types';
import { loadUiState, saveUiState } from '../lib/ui-state';
import { createCategorySection } from './components/CategorySection';
import { openCategoryManager } from './components/CategoryManager';
import { createDateTimeTray } from './components/DateTimeTray';
import { createQuickAdd } from './components/QuickAdd';
import { createSearchBar } from './components/SearchBar';
import { openTaskEditor } from './components/TaskEditor';

let state: AppState;
let search = '';
let filter: TaskFilter = 'active';
let dragTaskId: string | null = null;
let dragCategoryId: string | null = null;

const app = document.getElementById('app')!;
const listsEl = document.createElement('div');
listsEl.className = 'task-lists';
listsEl.id = 'task-lists';

let trayEl: HTMLElement & { refreshTimeTracker?: () => void };

const filterButtons: HTMLButtonElement[] = [];

async function bootstrap(): Promise<void> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  if (!stored[STORAGE_KEY]) {
    const defaults = createDefaultState();
    await chrome.storage.local.set({ [STORAGE_KEY]: defaults });
  }

  initStorageListener();
  state = await loadState();
  const ui = await loadUiState();
  buildShell(ui.collapsed);
  applyCollapsed(ui.collapsed);
  renderLists();
  updateFilters();

  subscribe((next) => {
    state = next;
    refreshQuickAdd();
    trayEl?.refreshTimeTracker?.();
    renderLists();
  });
}

function applyCollapsed(collapsed: boolean): void {
  app.classList.toggle('app--collapsed', collapsed);
}

function buildShell(initialCollapsed: boolean): void {
  trayEl = createDateTimeTray(
    () => state.tasks,
    (taskId) => {
      const row = document.querySelector(`[data-task-id="${taskId}"]`);
      row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },
    {
      collapsed: initialCollapsed,
      onToggle: (collapsed) => {
        applyCollapsed(collapsed);
        void saveUiState({ collapsed });
      },
    }
  );
  app.appendChild(trayEl);

  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';

  const searchBar = createSearchBar((q) => {
    search = q;
    renderLists();
  });

  const quickAdd = createQuickAdd(
    () => state.settings.defaultCategoryId,
    () => state.categories,
    async (title, categoryId, dueDate) => {
      await addTask(title, categoryId, dueDate ? { dueDate } : undefined);
    }
  );
  quickAdd.id = 'quick-add';

  toolbar.append(searchBar, quickAdd);
  app.appendChild(toolbar);

  const filters = document.createElement('div');
  filters.className = 'filters';
  filters.id = 'filters';

  (['all', 'active', 'done'] as TaskFilter[]).forEach((f) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filters__btn';
    btn.dataset.filter = f;
    btn.textContent = f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Done';
    btn.addEventListener('click', () => {
      filter = f;
      updateFilters();
      renderLists();
    });
    filterButtons.push(btn);
    filters.appendChild(btn);
  });

  const addCatBtn = document.createElement('button');
  addCatBtn.type = 'button';
  addCatBtn.className = 'filters__btn filters__btn--add';
  addCatBtn.textContent = '+ Category';
  addCatBtn.addEventListener('click', () => openCategoryManager(null, () => {}));
  filters.appendChild(addCatBtn);

  app.appendChild(filters);
  app.appendChild(listsEl);
}

function refreshQuickAdd(): void {
  const el = document.getElementById('quick-add') as HTMLElement & {
    refreshCategories?: () => void;
  };
  el?.refreshCategories?.();
}

function updateFilters(): void {
  filterButtons.forEach((btn) => {
    btn.classList.toggle('filters__btn--active', btn.dataset.filter === filter);
  });
}

function renderLists(): void {
  listsEl.replaceChildren();

  const callbacks = {
    onToggle: (id: string) => toggleTaskStatus(id),
    onEdit: (task: Parameters<typeof openTaskEditor>[0]) =>
      openTaskEditor(task, state.categories, () => {}),
    onDragStart: (taskId: string, e: DragEvent) => {
      dragTaskId = taskId;
      dragCategoryId = null;
      e.dataTransfer!.effectAllowed = 'move';
      e.dataTransfer!.setData('text/plain', taskId);
    },
    onDragOver: (_taskId: string, e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';
    },
    onDrop: (taskId: string, e: DragEvent) => {
      e.preventDefault();
      const catId = state.tasks.find((t) => t.id === taskId)?.categoryId ?? '';
      handleTaskDrop(catId, taskId);
    },
    onToggleCollapse: (id: string) => {
      const cat = state.categories.find((c) => c.id === id);
      if (cat) updateCategory(id, { collapsed: !cat.collapsed });
    },
    onEditCategory: (category: Parameters<typeof openCategoryManager>[0]) =>
      openCategoryManager(category, () => {}),
    onCategoryDragStart: (categoryId: string, e: DragEvent) => {
      dragCategoryId = categoryId;
      dragTaskId = null;
      e.dataTransfer!.effectAllowed = 'move';
      e.dataTransfer!.setData('text/plain', categoryId);
    },
    onCategoryDrop: (targetCategoryId: string, e: DragEvent) => {
      e.preventDefault();
      if (dragCategoryId && dragCategoryId !== targetCategoryId) {
        const sorted = sortCategories(state.categories);
        const targetIdx = sorted.findIndex((c) => c.id === targetCategoryId);
        reorderCategories(dragCategoryId, targetIdx);
        dragCategoryId = null;
      } else if (dragTaskId) {
        const tasks = state.tasks.filter((t) => t.categoryId === targetCategoryId);
        reorderTasks(dragTaskId, targetCategoryId, tasks.length);
        dragTaskId = null;
      }
    },
    onCategoryDropZone: (categoryId: string, index: number, e: DragEvent) => {
      e.preventDefault();
      if (dragTaskId) {
        reorderTasks(dragTaskId, categoryId, index);
        dragTaskId = null;
      }
    },
  };

  sortCategories(state.categories).forEach((cat) => {
    listsEl.appendChild(createCategorySection(cat, state, filter, search, callbacks));
  });
}

function handleTaskDrop(categoryId: string, beforeTaskId: string): void {
  if (!dragTaskId || dragTaskId === beforeTaskId) return;
  const catTasks = state.tasks
    .filter((t) => t.categoryId === categoryId)
    .sort((a, b) => a.order - b.order);
  const idx = catTasks.findIndex((t) => t.id === beforeTaskId);
  reorderTasks(dragTaskId, categoryId, idx >= 0 ? idx : catTasks.length);
  dragTaskId = null;
}

bootstrap();
