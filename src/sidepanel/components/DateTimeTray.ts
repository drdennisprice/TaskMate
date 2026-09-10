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

  const rail = document.createElement('div');
  rail.className = 'datetime-tray__rail';
  rail.title = 'Expand TaskMate';

  const railDot = document.createElement('span');
  railDot.className = 'datetime-tray__rail-dot';

  const railTime = document.createElement('span');
  railTime.className = 'datetime-tray__rail-time';

  rail.append(railDot, railTime);

  tray.append(headerRow, badge, timeTracker, rail);

  let collapsed = collapse.collapsed;

  function applyCollapsed(): void {
    tray.classList.toggle('datetime-tray--collapsed', collapsed);
    toggleBtn.textContent = collapsed ? '›' : '‹';
    toggleBtn.title = collapsed ? 'Expand TaskMate' : 'Collapse to a small tab';
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

  rail.addEventListener('click', () => {
    if (collapsed) toggle();
  });

  async function tickRail(): Promise<void> {
    if (!collapsed) return;
    const tracker = await loadTimeTracker();
    railDot.className = `datetime-tray__rail-dot datetime-tray__rail-dot--${tracker.status}`;
    railTime.textContent =
      tracker.status === 'idle' ? '' : formatElapsed(getRunningElapsedMs(tracker));
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
    tickRail();
  }

  tick();
  setInterval(tick, 1000);

  return Object.assign(tray, {
    refreshTimeTracker: () => {
      (timeTracker as HTMLElement & { refreshTaskOptions?: () => void }).refreshTaskOptions?.();
    },
  });
}
