import { generateId } from './id';
import type { AppState, Category, Task, TaskFilter } from './types';

export function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false;
  return task.dueDate < todayString();
}

export function isDueToday(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false;
  return task.dueDate === todayString();
}

export function formatDueDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => a.order - b.order);
}

export function sortTasksInCategory(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'active' ? -1 : 1;
    }
    return a.order - b.order;
  });
}

export function getTasksForCategory(
  tasks: Task[],
  categoryId: string,
  filter: TaskFilter,
  search: string
): Task[] {
  const q = search.trim().toLowerCase();
  return sortTasksInCategory(
    tasks.filter((t) => {
      if (t.categoryId !== categoryId) return false;
      if (filter === 'active' && t.status !== 'active') return false;
      if (filter === 'done' && t.status !== 'done') return false;
      if (q) {
        const hay = `${t.title} ${t.notes ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
  );
}

export function countOverdueTasks(tasks: Task[]): number {
  return tasks.filter((t) => isOverdue(t)).length;
}

export function getNextOrder(tasks: Task[], categoryId: string): number {
  const inCat = tasks.filter((t) => t.categoryId === categoryId);
  if (inCat.length === 0) return 0;
  return Math.max(...inCat.map((t) => t.order)) + 1;
}

export function getNextCategoryOrder(categories: Category[]): number {
  if (categories.length === 0) return 0;
  return Math.max(...categories.map((c) => c.order)) + 1;
}

export const PRIORITY_COLORS: Record<string, string> = {
  none: 'transparent',
  low: '#6b7280',
  medium: '#f59e0b',
  high: '#ef4444',
};

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Inbox', color: '#6366f1', order: 0 },
  { name: 'Work', color: '#3b82f6', order: 1 },
  { name: 'Personal', color: '#10b981', order: 2 },
  { name: 'Shopping', color: '#f97316', order: 3 },
];

export function createDefaultState(): AppState {
  const categories: Category[] = DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    id: generateId(),
  }));
  return {
    categories,
    tasks: [],
    settings: { defaultCategoryId: categories[0].id },
  };
}
