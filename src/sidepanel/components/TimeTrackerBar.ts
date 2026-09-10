import { formatElapsed, formatTrayDateTime, nowIso } from '../../lib/datetime';
import type { Task } from '../../lib/types';
import {
  appendTimeLog,
  appendTimeLogAsync,
  loadTimeTracker,
  saveTimeTracker,
} from '../../lib/time-tracker';
import {
  buildTimeLogEntry,
  idleTracker,
  needsReopenReminder,
  pauseTracker,
  resumeTracker,
} from '../../lib/time-tracker-logic';
import type { TimeLogEntry, TimeTrackerState } from '../../lib/time-tracker-types';
import { getRunningElapsedMs } from '../../lib/time-tracker-types';
import { openReopenReminder, openStopAndCloseConfirm } from './ReopenReminder';
import { openSheetsSettings } from './SheetsSettings';

export function createTimeTrackerBar(
  getTasks: () => Task[],
  onTaskSelect?: (taskId: string) => void
): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'time-tracker';

  const row = document.createElement('div');
  row.className = 'time-tracker__row';

  const select = document.createElement('select');
  select.className = 'time-tracker__task';
  select.title = 'Task to track';

  const startBtn = document.createElement('button');
  startBtn.type = 'button';
  startBtn.className = 'time-tracker__btn time-tracker__btn--start';
  startBtn.textContent = 'Start';

  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button';
  pauseBtn.className = 'time-tracker__btn time-tracker__btn--pause';
  pauseBtn.textContent = 'Pause';

  const stopBtn = document.createElement('button');
  stopBtn.type = 'button';
  stopBtn.className = 'time-tracker__btn time-tracker__btn--stop';
  stopBtn.textContent = 'Stop';

  const settingsBtn = document.createElement('button');
  settingsBtn.type = 'button';
  settingsBtn.className = 'time-tracker__settings';
  settingsBtn.title = 'Google Sheets settings';
  settingsBtn.textContent = '⚙';

  row.append(select, startBtn, pauseBtn, stopBtn, settingsBtn);

  const hint = document.createElement('div');
  hint.className = 'time-tracker__hint';
  hint.hidden = true;
  hint.textContent = 'Closing the panel pauses this timer and logs Pause to your sheet.';

  const stopCloseBtn = document.createElement('button');
  stopCloseBtn.type = 'button';
  stopCloseBtn.className = 'time-tracker__stop-close';
  stopCloseBtn.hidden = true;
  stopCloseBtn.textContent = 'Stop & close panel';

  const status = document.createElement('div');
  status.className = 'time-tracker__status';

  const feedback = document.createElement('div');
  feedback.className = 'time-tracker__feedback';

  bar.append(row, hint, stopCloseBtn, status, feedback);

  let tracker: TimeTrackerState = {
    status: 'idle',
    taskId: null,
    taskTitle: '',
    segmentStartedAt: null,
    accumulatedMs: 0,
  };

  let hidePauseHandled = false;
  let reminderShown = false;

  function refreshTaskOptions(): void {
    const tasks = getTasks().filter((t) => t.status === 'active');
    const current = select.value;
    select.replaceChildren(
      (() => {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Select task…';
        return opt;
      })(),
      ...tasks.map((t) => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.title;
        return opt;
      })
    );
    if (tracker.taskId && tasks.some((t) => t.id === tracker.taskId)) {
      select.value = tracker.taskId;
    } else if (current && tasks.some((t) => t.id === current)) {
      select.value = current;
    }
  }

  function updateButtons(): void {
    const active = tracker.status !== 'idle';
    startBtn.disabled = tracker.status === 'running';
    pauseBtn.disabled = tracker.status !== 'running';
    stopBtn.disabled = tracker.status === 'idle';
    select.disabled = tracker.status === 'running';
    hint.hidden = tracker.status !== 'running';
    stopCloseBtn.hidden = !active;
  }

  function updateStatus(): void {
    const elapsed = getRunningElapsedMs(tracker);
    if (tracker.status === 'idle') {
      status.textContent = 'Not tracking';
      status.className = 'time-tracker__status';
      return;
    }
    const label =
      tracker.status === 'running'
        ? 'Running'
        : tracker.status === 'paused'
          ? tracker.autoPaused
            ? 'Paused (panel closed)'
            : 'Paused'
          : '';
    status.textContent = `${label}: ${tracker.taskTitle || '—'} · ${formatElapsed(elapsed)}`;
    status.className = `time-tracker__status time-tracker__status--${tracker.status}`;
  }

  function showFeedback(text: string, isError = false): void {
    feedback.textContent = text;
    feedback.classList.toggle('time-tracker__feedback--error', isError);
    if (text) {
      setTimeout(() => {
        if (feedback.textContent === text) feedback.textContent = '';
      }, 5000);
    }
  }

  async function logAction(action: TimeLogEntry['action']): Promise<void> {
    const now = new Date();
    const entry = buildTimeLogEntry(tracker, action, now);
    await appendTimeLog(entry);
    showFeedback(`Logged ${action.toLowerCase()} at ${entry.displayTimestamp}`);
  }

  async function persist(): Promise<void> {
    await saveTimeTracker(tracker);
    updateButtons();
    updateStatus();
  }

  function autoPauseFromHide(): void {
    if (tracker.status !== 'running' || hidePauseHandled) return;
    hidePauseHandled = true;

    const now = Date.now();
    tracker = pauseTracker(tracker, { auto: true, now });
    const entry = buildTimeLogEntry(tracker, 'Pause', new Date(now));
    appendTimeLogAsync(entry);
    saveTimeTracker(tracker);
  }

  async function stopSession(resetSelect = true): Promise<void> {
    await logAction('Stop');
    tracker = idleTracker();
    hidePauseHandled = false;
    if (resetSelect) select.value = '';
    await persist();
  }

  function maybeShowReopenReminder(): void {
    if (reminderShown || !needsReopenReminder(tracker)) return;
    reminderShown = true;
    openReopenReminder(
      tracker,
      async () => {
        tracker = resumeTracker(tracker);
        try {
          await logAction('Start');
          await persist();
        } catch (err) {
          showFeedback(err instanceof Error ? err.message : 'Resume failed', true);
        }
      },
      async () => {
        try {
          await stopSession(false);
          showFeedback('Session stopped — safe to close the panel');
        } catch (err) {
          showFeedback(err instanceof Error ? err.message : 'Stop failed', true);
        }
      }
    );
  }

  startBtn.addEventListener('click', async () => {
    try {
      const taskId = select.value;
      if (!taskId) {
        showFeedback('Select a task first', true);
        return;
      }
      const task = getTasks().find((t) => t.id === taskId);
      if (!task) {
        showFeedback('Task not found', true);
        return;
      }

      hidePauseHandled = false;

      if (tracker.status === 'idle' || tracker.taskId !== taskId) {
        tracker = {
          status: 'running',
          taskId,
          taskTitle: task.title,
          segmentStartedAt: nowIso(),
          accumulatedMs: 0,
          autoPaused: false,
        };
      } else if (tracker.status === 'paused') {
        tracker = resumeTracker(tracker);
      }

      await logAction('Start');
      await persist();
      onTaskSelect?.(taskId);
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Start failed', true);
    }
  });

  pauseBtn.addEventListener('click', async () => {
    try {
      if (tracker.status !== 'running') return;
      tracker = pauseTracker(tracker, { auto: false });
      await logAction('Pause');
      await persist();
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Pause failed', true);
    }
  });

  stopBtn.addEventListener('click', async () => {
    try {
      if (tracker.status === 'idle') return;
      if (
        !confirm(
          `Stop and log ${formatElapsed(getRunningElapsedMs(tracker))} to your sheet?\n\nTask: ${tracker.taskTitle}`
        )
      ) {
        return;
      }
      await stopSession();
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Stop failed', true);
    }
  });

  stopCloseBtn.addEventListener('click', () => {
    if (tracker.status === 'idle') return;
    openStopAndCloseConfirm(tracker, async () => {
      try {
        await stopSession();
        showFeedback('Session stopped — safe to close the panel');
      } catch (err) {
        showFeedback(err instanceof Error ? err.message : 'Stop failed', true);
      }
    });
  });

  settingsBtn.addEventListener('click', () => openSheetsSettings());

  select.addEventListener('change', () => {
    if (tracker.status === 'idle' && select.value) {
      const task = getTasks().find((t) => t.id === select.value);
      if (task) {
        tracker.taskId = task.id;
        tracker.taskTitle = task.title;
      }
    }
  });

  document.addEventListener('visibilitychange', () => {
    // Note: intentionally NOT auto-pausing on 'hidden'. The side panel fires
    // visibilitychange far more often than an actual close (switching Chrome
    // windows/apps, screen lock, etc.), which was pausing the timer constantly.
    // The timer now keeps running until the user pauses/stops it, or the panel
    // actually unloads (see 'pagehide' below).
    if (document.visibilityState === 'visible') {
      hidePauseHandled = false;
      loadTimeTracker().then((saved) => {
        tracker = saved;
        refreshTaskOptions();
        updateButtons();
        updateStatus();
        maybeShowReopenReminder();
      });
    }
  });

  window.addEventListener('pagehide', () => {
    autoPauseFromHide();
  });

  window.addEventListener('beforeunload', (e) => {
    if (tracker.status !== 'running') return;
    e.preventDefault();
    e.returnValue =
      'Closing TaskMate will pause your running timer and log Pause to your sheet.';
  });

  loadTimeTracker().then((saved) => {
    tracker = saved;
    refreshTaskOptions();
    updateButtons();
    updateStatus();
    maybeShowReopenReminder();
  });

  setInterval(() => {
    if (tracker.status === 'running') updateStatus();
  }, 1000);

  return Object.assign(bar, { refreshTaskOptions });
}
