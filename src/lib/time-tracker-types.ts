export type TimeTrackerStatus = 'idle' | 'running' | 'paused';

export interface TimeTrackerState {
  status: TimeTrackerStatus;
  taskId: string | null;
  taskTitle: string;
  segmentStartedAt: string | null;
  accumulatedMs: number;
  /** True when paused because the panel/app was hidden or closed */
  autoPaused?: boolean;
  /** Elapsed ms at pause time — used for reopen reminder */
  pausedAtElapsedMs?: number;
}

export interface TimeLogEntry {
  isoTimestamp: string;
  displayTimestamp: string;
  taskTitle: string;
  action: 'Start' | 'Pause' | 'Stop';
  elapsedMs: number;
}

export const TIME_TRACKER_KEY = 'taskmate_time_tracker';

export const DEFAULT_TIME_TRACKER: TimeTrackerState = {
  status: 'idle',
  taskId: null,
  taskTitle: '',
  segmentStartedAt: null,
  accumulatedMs: 0,
};

export function getRunningElapsedMs(state: TimeTrackerState, now = Date.now()): number {
  let total = state.accumulatedMs;
  if (state.status === 'running' && state.segmentStartedAt) {
    total += now - new Date(state.segmentStartedAt).getTime();
  }
  return total;
}
