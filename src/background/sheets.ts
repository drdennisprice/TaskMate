import type { TimeLogEntry } from '../lib/time-tracker-types';
import type { AppSettings } from '../lib/types';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

async function getAuthToken(interactive: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(new Error(chrome.runtime.lastError?.message ?? 'Could not get Google auth token'));
        return;
      }
      resolve(token);
    });
  });
}

async function removeCachedToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, () => resolve());
  });
}

function rowFromEntry(entry: TimeLogEntry): string[] {
  const elapsedMin = (entry.elapsedMs / 60000).toFixed(2);
  return [
    entry.displayTimestamp,
    entry.isoTimestamp,
    entry.taskTitle,
    entry.action,
    elapsedMin,
  ];
}

async function appendViaWebApp(webAppUrl: string, entry: TimeLogEntry): Promise<void> {
  const res = await fetch(webAppUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ row: rowFromEntry(entry) }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Web App request failed (${res.status}): ${text || res.statusText}`);
  }
  const data = await res.json().catch(() => ({ ok: true }));
  if (data.ok === false) {
    throw new Error(data.error ?? 'Web App returned an error');
  }
}

async function appendViaSheetsApi(
  settings: NonNullable<AppSettings['googleSheets']>,
  entry: TimeLogEntry,
  interactive: boolean
): Promise<void> {
  const spreadsheetId = settings.spreadsheetId?.trim();
  if (!spreadsheetId) {
    throw new Error('Spreadsheet ID is not configured');
  }
  const sheetName = settings.sheetName?.trim() || 'TimeLog';
  const range = encodeURIComponent(`${sheetName}!A:E`);

  let token = await getAuthToken(interactive);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  let res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [rowFromEntry(entry)] }),
  });

  if (res.status === 401) {
    await removeCachedToken(token);
    token = await getAuthToken(true);
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [rowFromEntry(entry)] }),
    });
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ??
        `Sheets API error (${res.status})`
    );
  }
}

export async function appendTimeLogToSheet(
  settings: AppSettings,
  entry: TimeLogEntry,
  interactive = false
): Promise<void> {
  const sheets = settings.googleSheets;
  if (!sheets) {
    throw new Error('Google Sheets is not configured. Open tray settings (⚙) to set it up.');
  }

  const webAppUrl = sheets.webAppUrl?.trim();
  if (webAppUrl) {
    await appendViaWebApp(webAppUrl, entry);
    return;
  }

  if (sheets.spreadsheetId?.trim()) {
    await appendViaSheetsApi(sheets, entry, interactive);
    return;
  }

  throw new Error('Add a Google Apps Script Web App URL or Spreadsheet ID in settings.');
}

export { SHEETS_SCOPE };
