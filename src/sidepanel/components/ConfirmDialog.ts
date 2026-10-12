/**
 * In-page replacement for window.confirm().
 * Some Chromium browsers (e.g. Vivaldi) silently suppress native dialogs in
 * extension side panels, so confirm() returns false and the action never runs.
 */
export function confirmDialog(
  message: string,
  confirmLabel = 'Confirm',
  danger = true
): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';

    const body = document.createElement('p');
    body.style.whiteSpace = 'pre-line';
    body.textContent = message;

    const actions = document.createElement('div');
    actions.className = 'modal__actions';

    const finish = (result: boolean): void => {
      overlay.remove();
      resolve(result);
    };

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn--ghost';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => finish(false));

    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.className = danger ? 'btn btn--danger' : 'btn btn--primary';
    okBtn.textContent = confirmLabel;
    okBtn.addEventListener('click', () => finish(true));

    actions.append(cancelBtn, okBtn);
    modal.append(body, actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    okBtn.focus();
  });
}
