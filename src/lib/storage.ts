import { generateId } from './id';
import { getNextCategoryOrder, getNextOrder } from './task-utils';
import type {
  AppState,
  Category,
  Priority,
  Task,
  TaskStatus,
} from './types';
import { STORAGE_KEY } from './types';

type Listener = (state: AppState) => void;

let cache: AppState | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();

export async function loadState(): Promise<AppState> {
  if (cache) return cache;
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as AppState | undefined;
  if (stored) {
    cache = stored;
    return stored;
  }
  throw new Error('State not initialized');
}

export async function saveState(state: AppState, immediate = false): Promise<void> {
  cache = state;
  if (immediate) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    await chrome.storage.local.set({ [STORAGE_KEY]: state });
    notify(state);
    return;
  }
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await chrome.storage.local.set({ [STORAGE_KEY]: cache! });
    notify(cache!);
    saveTimer = null;
  }, 300);
}

function notify(state: AppState): void {
  for (const fn of listeners) fn(state);
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function initStorageListener(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[STORAGE_KEY]) return;
    const next = changes[STORAGE_KEY].newValue as AppState;
    cache = next;
    notify(next);
  });
}

async function mutate(updater: (state: AppState) => AppState, immediate = false): Promise<AppState> {
  const state = await loadState();
  const next = updater(state);
  await saveState(next, immediate);
  return next;
}

export async function addTask(
  title: string,
  categoryId: string,
  opts?: Partial<Pick<Task, 'notes' | 'priority' | 'dueDate'>>
): Promise<Task> {
  const state = await loadState();
  const task: Task = {
    id: generateId(),
    title: title.trim(),
    categoryId,
    priority: opts?.priority ?? 'none',
    status: 'active',
    dueDate: opts?.dueDate,
    notes: opts?.notes,
    order: getNextOrder(state.tasks, categoryId),
    createdAt: new Date().toISOString(),
  };
  await mutate((s) => ({ ...s, tasks: [...s.tasks, task] }));
  return task;
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  await mutate((s) => ({
    ...s,
    tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  }));
}

export async function deleteTask(id: string): Promise<void> {
  await mutate((s) => ({
    ...s,
    tasks: s.tasks.filter((t) => t.id !== id),
  }));
}

export async function toggleTaskStatus(id: string): Promise<void> {
  await mutate((s) => ({
    ...s,
    tasks: s.tasks.map((t) => {
      if (t.id !== id) return t;
      const done = t.status === 'done';
      return {
        ...t,
        status: (done ? 'active' : 'done') as TaskStatus,
        completedAt: done ? undefined : new Date().toISOString(),
      };
    }),
  }));
}

export async function reorderTasks(
  taskId: string,
  targetCategoryId: string,
  insertIndex: number
): Promise<void> {
  await mutate((s) => {
    const task = s.tasks.find((t) => t.id === taskId);
    if (!task) return s;

    const moved: Task = { ...task, categoryId: targetCategoryId };
    const others = s.tasks.filter((t) => t.id !== taskId);
    const inTarget = others
      .filter((t) => t.categoryId === targetCategoryId)
      .sort((a, b) => a.order - b.order);

    inTarget.splice(insertIndex, 0, moved);
    const reordered = inTarget.map((t, i) => ({ ...t, order: i }));

    const reorderedIds = new Set(reordered.map((t) => t.id));
    const rest = others.filter((t) => !reorderedIds.has(t.id));

    return { ...s, tasks: [...rest, ...reordered] };
  }, true);
}

export async function addCategory(name: string, color: string): Promise<Category> {
  const state = await loadState();
  const category: Category = {
    id: generateId(),
    name: name.trim(),
    color,
    order: getNextCategoryOrder(state.categories),
  };
  await mutate((s) => ({ ...s, categories: [...s.categories, category] }));
  return category;
}

export async function updateCategory(id: string, patch: Partial<Category>): Promise<void> {
  await mutate((s) => ({
    ...s,
    categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  }));
}

export async function deleteCategory(id: string): Promise<void> {
  await mutate((s) => {
    const fallback = s.categories.find((c) => c.id !== id);
    if (!fallback) return s;
    return {
      ...s,
      categories: s.categories.filter((c) => c.id !== id),
      tasks: s.tasks.map((t) =>
        t.categoryId === id ? { ...t, categoryId: fallback.id } : t
      ),
      settings: {
        ...s.settings,
        defaultCategoryId:
          s.settings.defaultCategoryId === id
            ? fallback.id
            : s.settings.defaultCategoryId,
      },
    };
  });
}

export async function reorderCategories(categoryId: string, newOrder: number): Promise<void> {
  await mutate((s) => {
    const sorted = [...s.categories].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((c) => c.id === categoryId);
    if (idx < 0) return s;
    const [item] = sorted.splice(idx, 1);
    sorted.splice(newOrder, 0, item);
    const categories = sorted.map((c, i) => ({ ...c, order: i }));
    return { ...s, categories };
  }, true);
}

export async function setDefaultCategory(id: string): Promise<void> {
  await mutate((s) => ({
    ...s,
    settings: { ...s.settings, defaultCategoryId: id },
  }));
}

export async function seedStateIfEmpty(state: AppState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
  cache = state;
}
