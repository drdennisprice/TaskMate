import { formatElapsed, formatTrayDateTime } from '../../lib/datetime';
import { countOverdueTasks } from '../../lib/task-utils';
import { loadTimeTracker } from '../../lib/time-tracker';
import { getRunningElapsedMs } from '../../lib/time-tracker-types';
import type { Task } from '../../lib/types';
import { createTimeTrackerBar } from './TimeTrackerBar';

export interface CollapseOptions {
  collapsed: boolean;
  onToggle: (collapsed: boolean) => void;
}

export function createDateTimeTray(
  getTasks: () => Task[],
  onTaskSelect: ((taskId: string) => void) | undefined,
  collapse: CollapseOptions
): HTMLElement & { refreshTimeTracker?: () => void } {
  const tray = document.createElement('header');
  tray.className = 'datetime-tray';

  const headerRow = document.createElement('div');
  headerRow.className = 'datetime-tray__header';

  const datetime = document.createElement('div');
  datetime.className = 'datetime-tray__datetime';

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'datetime-tray__collapse';

  headerRow.append(datetime, toggleBtn);

  const badge = document.createElement('div');
  badge.className = 'datetime-tray__badge';

  const timeTracker = createTimeTrackerBar(getTasks, onTaskSelect);

  const mini = document.createElement('div');
  mini.className = 'datetime-tray__mini';
  mini.title = 'Click to expand TaskMate';

  const miniDot = document.createElement('span');
  miniDot.className = 'datetime-tray__mini-dot';

  const miniLabel = document.createElement('span');
  miniLabel.className = 'datetime-tray__mini-label';

  mini.append(miniDot, miniLabel);

  tray.append(headerRow, badge, timeTracker, mini);

  let collapsed = collapse.collapsed;

  function applyCollapsed(): void {
    tray.classList.toggle('datetime-tray--collapsed', collapsed);
    toggleBtn.textContent = collapsed ? '▸ Expand' : '◂ Collapse';
    toggleBtn.title = collapsed ? 'Expand TaskMate' : 'Collapse to a slim bar';
  }

  applyCollapsed();

  function toggle(): void {
    collapsed = !collapsed;
    applyCollapsed();
    collapse.onToggle(collapsed);
  }

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });

  mini.addEventListener('click', () => {
    if (collapsed) toggle();
  });

  async function tickMini(): Promise<void> {
    if (!collapsed) return;
    const tracker = await loadTimeTracker();
    miniDot.className = `datetime-tray__mini-dot datetime-tray__mini-dot--${tracker.status}`;
    miniLabel.textContent =
      tracker.status === 'idle'
        ? 'Not tracking'
        : `${tracker.status === 'running' ? 'Running' : 'Paused'} · ${tracker.taskTitle || '—'} · ${formatElapsed(getRunningElapsedMs(tracker))}`;
  }

  function tick(): void {
    datetime.textContent = formatTrayDateTime();
    const overdue = countOverdueTasks(getTasks());
    if (overdue > 0) {
      badge.textContent = `${overdue} overdue`;
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
    tickMini();
  }

  tick();
  setInterval(tick, 1000);

  return Object.assign(tray, {
    refreshTimeTracker: () => {
      (timeTracker as HTMLElement & { refreshTaskOptions?: () => void }).refreshTaskOptions?.();
    },
  });
}
