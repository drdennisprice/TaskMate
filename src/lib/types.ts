export type Priority = 'none' | 'low' | 'medium' | 'high';
export type TaskStatus = 'active' | 'done';
export type TaskFilter = 'all' | 'active' | 'done';

export interface Category {
  id: string;
  name: string;
  color: string;
  order: number;
  collapsed?: boolean;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  categoryId: string;
  priority: Priority;
  status: TaskStatus;
  dueDate?: string;
  order: number;
  createdAt: string;
  completedAt?: string;
}

export interface GoogleSheetsSettings {
  /** Google Apps Script Web App URL (recommended — no OAuth setup) */
  webAppUrl?: string;
  /** Spreadsheet ID for direct Sheets API (requires OAuth client in manifest) */
  spreadsheetId?: string;
  /** Sheet tab name, default TimeLog */
  sheetName?: string;
}

export interface AppSettings {
  defaultCategoryId: string;
  googleSheets?: GoogleSheetsSettings;
}

export interface AppState {
  categories: Category[];
  tasks: Task[];
  settings: AppSettings;
}

export const STORAGE_KEY = 'taskmate_state';
