import type { TimeLogEntry, TimeTrackerState } from './time-tracker-types';
import { TIME_TRACKER_KEY } from './time-tracker-types';

export async function loadTimeTracker(): Promise<TimeTrackerState> {
  const result = await chrome.storage.local.get(TIME_TRACKER_KEY);
  return (result[TIME_TRACKER_KEY] as TimeTrackerState | undefined) ?? {
    status: 'idle',
    taskId: null,
    taskTitle: '',
    segmentStartedAt: null,
    accumulatedMs: 0,
  };
}

export async function saveTimeTracker(state: TimeTrackerState): Promise<void> {
  await chrome.storage.local.set({ [TIME_TRACKER_KEY]: state });
}

export async function appendTimeLog(entry: TimeLogEntry): Promise<void> {
  const response = await chrome.runtime.sendMessage({
    type: 'APPEND_TIME_LOG',
    entry,
  });
  if (!response?.ok) {
    throw new Error(response?.error ?? 'Failed to write to Google Sheet');
  }
}

/** Use when the panel may unload before a response (auto-pause on hide) */
export function appendTimeLogAsync(entry: TimeLogEntry): void {
  chrome.runtime.sendMessage({ type: 'APPEND_TIME_LOG', entry }).catch(() => {});
}
