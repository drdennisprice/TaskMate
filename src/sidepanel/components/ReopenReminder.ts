import { formatElapsed } from '../../lib/datetime';
import type { TimeTrackerState } from '../../lib/time-tracker-types';

export function openReopenReminder(
  tracker: TimeTrackerState,
  onResume: () => void,
  onStop: () => void
): void {
  const elapsed = tracker.pausedAtElapsedMs ?? tracker.accumulatedMs;
  const elapsedLabel = formatElapsed(elapsed);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay reopen-reminder';

  const modal = document.createElement('div');
  modal.className = 'modal reopen-reminder__modal';

  const title = document.createElement('h2');
  title.className = 'modal__title';
  title.textContent = 'Timer paused';

  const body = document.createElement('p');
  body.className = 'reopen-reminder__body';
  body.textContent = `You paused at ${elapsedLabel} on "${tracker.taskTitle}" when the panel closed. Still working on this task?`;

  const actions = document.createElement('div');
  actions.className = 'modal__actions reopen-reminder__actions';

  const resumeBtn = document.createElement('button');
  resumeBtn.type = 'button';
  resumeBtn.className = 'btn btn--primary';
  resumeBtn.textContent = 'Resume';
  resumeBtn.addEventListener('click', () => {
    overlay.remove();
    onResume();
  });

  const stopBtn = document.createElement('button');
  stopBtn.type = 'button';
  stopBtn.className = 'btn btn--danger';
  stopBtn.textContent = 'Stop session';
  stopBtn.addEventListener('click', () => {
    if (
      !confirm(
        `Stop and log ${elapsedLabel} to your sheet?\n\nTask: ${tracker.taskTitle}`
      )
    ) {
      return;
    }
    overlay.remove();
    onStop();
  });

  actions.append(resumeBtn, stopBtn);
  modal.append(title, body, actions);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

export function openStopAndCloseConfirm(
  tracker: TimeTrackerState,
  onConfirm: () => void
): void {
  const elapsed = formatElapsed(
    tracker.pausedAtElapsedMs ?? tracker.accumulatedMs
  );
  if (
    !confirm(
      `Stop session and log ${elapsed} to your sheet?\n\nTask: ${tracker.taskTitle}\n\nYou can close the panel safely after stopping.`
    )
  ) {
    return;
  }
  onConfirm();
}
