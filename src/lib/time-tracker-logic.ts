import { formatTrayDateTime, nowIso } from './datetime';
import type { TimeLogEntry, TimeTrackerState } from './time-tracker-types';
import { getRunningElapsedMs } from './time-tracker-types';

export function accumulateRunningSegment(
  state: TimeTrackerState,
  now = Date.now()
): TimeTrackerState {
  if (state.status !== 'running' || !state.segmentStartedAt) return state;
  return {
    ...state,
    accumulatedMs:
      state.accumulatedMs + (now - new Date(state.segmentStartedAt).getTime()),
    segmentStartedAt: null,
  };
}

export function buildTimeLogEntry(
  state: TimeTrackerState,
  action: TimeLogEntry['action'],
  now = new Date()
): TimeLogEntry {
  return {
    isoTimestamp: nowIso(),
    displayTimestamp: formatTrayDateTime(now),
    taskTitle: state.taskTitle,
    action,
    elapsedMs: getRunningElapsedMs(state, now.getTime()),
  };
}

export function pauseTracker(
  state: TimeTrackerState,
  opts: { auto?: boolean; now?: number } = {}
): TimeTrackerState {
  const now = opts.now ?? Date.now();
  let next = accumulateRunningSegment(state, now);
  const elapsed = getRunningElapsedMs(
    { ...next, status: 'running', segmentStartedAt: null },
    now
  );
  return {
    ...next,
    status: 'paused',
    segmentStartedAt: null,
    autoPaused: opts.auto ?? false,
    pausedAtElapsedMs: elapsed,
  };
}

export function resumeTracker(state: TimeTrackerState): TimeTrackerState {
  return {
    ...state,
    status: 'running',
    segmentStartedAt: nowIso(),
    autoPaused: false,
    pausedAtElapsedMs: undefined,
  };
}

export function idleTracker(): TimeTrackerState {
  return {
    status: 'idle',
    taskId: null,
    taskTitle: '',
    segmentStartedAt: null,
    accumulatedMs: 0,
    autoPaused: false,
    pausedAtElapsedMs: undefined,
  };
}

export function needsReopenReminder(state: TimeTrackerState): boolean {
  return state.status === 'paused' && state.autoPaused === true;
}
