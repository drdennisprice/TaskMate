import { appendTimeLogToSheet } from './sheets';
import { createDefaultState } from '../lib/task-utils';
import { seedStateIfEmpty } from '../lib/storage';
import { STORAGE_KEY } from '../lib/types';
import type { AppState } from '../lib/types';
import type { TimeLogEntry } from '../lib/time-tracker-types';

chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  if (!result[STORAGE_KEY]) {
    await seedStateIfEmpty(createDefaultState());
  }

  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'APPEND_TIME_LOG') return false;

  (async () => {
    try {
      const stored = await chrome.storage.local.get(STORAGE_KEY);
      const state = stored[STORAGE_KEY] as AppState | undefined;
      if (!state) throw new Error('App state not found');

      const entry = message.entry as TimeLogEntry;
      const needsAuth = !state.settings.googleSheets?.webAppUrl?.trim();
      await appendTimeLogToSheet(state.settings, entry, needsAuth);
      sendResponse({ ok: true });
    } catch (err) {
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  })();

  return true;
});
