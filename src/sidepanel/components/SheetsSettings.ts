import { loadState, saveState } from '../../lib/storage';
import type { GoogleSheetsSettings } from '../../lib/types';

export function openSheetsSettings(onClose?: () => void): void {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal sheets-settings';

  const title = document.createElement('h2');
  title.className = 'modal__title';
  title.textContent = 'Google Sheets Time Log';

  const intro = document.createElement('p');
  intro.className = 'sheets-settings__intro';
  intro.textContent =
    'Each Start, Pause, and Stop writes a timestamped row. Use a Google Apps Script Web App URL (recommended) or Spreadsheet ID with OAuth.';

  function createField(labelText: string): { field: HTMLElement; body: HTMLElement } {
    const field = document.createElement('div');
    field.className = 'field';
    const label = document.createElement('span');
    label.className = 'field__label';
    label.textContent = labelText;
    const body = document.createElement('div');
    body.className = 'field__body';
    field.append(label, body);
    return { field, body };
  }

  const { field: webAppField, body: webAppBody } = createField('Apps Script Web App URL (recommended)');
  const webAppInput = document.createElement('input');
  webAppInput.type = 'url';
  webAppInput.className = 'field__input';
  webAppInput.placeholder = 'https://script.google.com/macros/s/…/exec';
  webAppBody.appendChild(webAppInput);

  const { field: sheetIdField, body: sheetIdBody } = createField('Spreadsheet ID (OAuth — optional)');
  const sheetIdInput = document.createElement('input');
  sheetIdInput.type = 'text';
  sheetIdInput.className = 'field__input';
  sheetIdInput.placeholder = 'From docs.google.com/spreadsheets/d/THIS_PART/edit';
  sheetIdBody.appendChild(sheetIdInput);

  const { field: sheetNameField, body: sheetNameBody } = createField('Sheet tab name');
  const sheetNameInput = document.createElement('input');
  sheetNameInput.type = 'text';
  sheetNameInput.className = 'field__input';
  sheetNameInput.placeholder = 'TimeLog';
  sheetNameBody.appendChild(sheetNameInput);

  const SETUP_GUIDE_URL = 'https://REPLACE_WITH_YOUR_GITHUB_USERNAME.github.io/TaskMate/';

  const help = document.createElement('details');
  help.className = 'sheets-settings__help';
  help.innerHTML = `
    <summary>Apps Script setup</summary>
    <ol>
      <li>Create a Google Sheet</li>
      <li>Extensions → Apps Script → paste <code>google-apps-script/Code.gs</code> from this repo</li>
      <li>Deploy → New deployment → Web app → Execute as Me → Anyone</li>
      <li>Copy the Web App URL here</li>
    </ol>
    <p>Columns written: Display Time, ISO Time, Task, Action, Elapsed (minutes)</p>
    <p><a href="${SETUP_GUIDE_URL}" target="_blank" rel="noopener">Full step-by-step setup guide ↗</a></p>
  `;

  const actions = document.createElement('div');
  actions.className = 'modal__actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn--ghost';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', close);

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn btn--primary';
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', async () => {
    const state = await loadState();
    const googleSheets: GoogleSheetsSettings = {
      webAppUrl: webAppInput.value.trim() || undefined,
      spreadsheetId: sheetIdInput.value.trim() || undefined,
      sheetName: sheetNameInput.value.trim() || 'TimeLog',
    };
    await saveState(
      {
        ...state,
        settings: { ...state.settings, googleSheets },
      },
      true
    );
    close();
  });

  actions.append(cancelBtn, saveBtn);
  modal.append(title, intro, webAppField, sheetIdField, sheetNameField, help, actions);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  loadState().then((state) => {
    const s = state.settings.googleSheets;
    webAppInput.value = s?.webAppUrl ?? '';
    sheetIdInput.value = s?.spreadsheetId ?? '';
    sheetNameInput.value = s?.sheetName ?? 'TimeLog';
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  function close(): void {
    overlay.remove();
    onClose?.();
  }
}
