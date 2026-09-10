/**
 * TaskMate — Google Sheets time log + reporting
 *
 * SETUP
 * 1. Paste into Extensions → Apps Script
 * 2. Run setupAllSheets once (authorize)
 * 3. Deploy → Web app (for TaskMate extension logging)
 * 4. Reload spreadsheet — TaskMate menu appears
 *
 * REPORTING
 * Use TaskMate → Reporting for weekly / monthly / custom summaries.
 * Totals are taken from Stop rows (column E = active minutes worked).
 */

const CFG = {
  TIMELOG: 'TimeLog',
  SESSIONS: 'Sessions',
  REPORT: 'Report',
  WEEK_START: 1, // 1 = Monday (AU), 0 = Sunday
};

// ─── Menu ───────────────────────────────────────────────────────────────────

function onOpen() {
  buildMenu_();
}

function buildMenu_() {
  SpreadsheetApp.getUi()
    .createMenu('TaskMate')
    .addItem('Setup & format sheets', 'setupAllSheets')
    .addSeparator()
    .addSubMenu(
      SpreadsheetApp.getUi()
        .createMenu('Reporting')
        .addItem('This week', 'reportThisWeek')
        .addItem('Last week', 'reportLastWeek')
        .addItem('This month', 'reportThisMonth')
        .addItem('Last month', 'reportLastMonth')
        .addItem('Custom date range…', 'reportCustomRange')
    )
    .addItem('Refresh Sessions tab', 'syncSessionsSheet')
    .addToUi();
}

// ─── Setup ──────────────────────────────────────────────────────────────────

function setupAllSheets() {
  setupTimeLogSheet_();
  setupSessionsSheet_();
  syncSessionsSheet();
  SpreadsheetApp.getUi().alert(
    'TaskMate sheets ready.\n\n' +
      '• TimeLog — raw events from the extension\n' +
      '• Sessions — one row per completed session (Stop events)\n' +
      '• Report — generated summaries (TaskMate → Reporting)'
  );
}

/** @deprecated use setupAllSheets */
function setupSheet() {
  setupAllSheets();
}

function setupTimeLogSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CFG.TIMELOG);
  if (!sheet) sheet = ss.insertSheet(CFG.TIMELOG);

  const headers = ['Display Time', 'ISO Time', 'Task', 'Action', 'Elapsed (min)'];
  setRangeValues_(sheet, 1, 1, [headers]);

  const header = sheet.getRange(1, 1, 1, headers.length);
  header
    .setFontWeight('bold')
    .setBackground('#1e293b')
    .setFontColor('#f8fafc')
    .setWrap(false);

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 260);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 220);
  sheet.setColumnWidth(4, 80);
  sheet.setColumnWidth(5, 100);

  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const numRows = lastRow - 1;
    sheet.getRange(2, 2, numRows, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    sheet.getRange(2, 5, numRows, 1).setNumberFormat('0.00');
  }

  applyTimeLogFormatting_(sheet);
}

function setupSessionsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CFG.SESSIONS);
  if (!sheet) sheet = ss.insertSheet(CFG.SESSIONS);

  const headers = [
    'Session end',
    'Task',
    'Minutes',
    'Hours (dec)',
    'Hours (h:mm)',
    'Week starting',
    'Month',
    'Year',
  ];
  setRangeValues_(sheet, 1, 1, [headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#334155')
    .setFontColor('#f8fafc');
  sheet.setFrozenRows(1);
  setColumnWidths_(sheet, [160, 220, 80, 90, 90, 110, 90, 60]);
}

/** setColumnWidths only accepts one width for all columns — set individually instead */
function setColumnWidths_(sheet, widths) {
  widths.forEach(function (w, i) {
    sheet.setColumnWidth(i + 1, w);
  });
}

/** getRange(row, col, numRows, numCols) — write a 2D array safely */
function setRangeValues_(sheet, startRow, startCol, values) {
  if (!values || values.length === 0) return;
  const numRows = values.length;
  const numCols = values[0].length;
  sheet.getRange(startRow, startCol, numRows, numCols).setValues(values);
}

/** Pad a row to a fixed width for bulk setValues */
function padRow_(row, width) {
  const out = row.slice();
  while (out.length < width) out.push('');
  return out;
}

function applyTimeLogFormatting_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const numRows = lastRow - 1;
  sheet.getRange(2, 1, numRows, 5).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);

  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Start')
      .setBackground('#dcfce7')
      .setRanges([sheet.getRange(2, 4, numRows, 1)])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Pause')
      .setBackground('#fef9c3')
      .setRanges([sheet.getRange(2, 4, numRows, 1)])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo('Stop')
      .setBackground('#fee2e2')
      .setFontColor('#991b1b')
      .setRanges([sheet.getRange(2, 4, numRows, 1)])
      .build(),
  ]);
}

// ─── Web app (TaskMate extension) ───────────────────────────────────────────

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const row = payload.row;
    if (!row || !Array.isArray(row)) {
      return jsonResponse_({ ok: false, error: 'Missing row array' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(CFG.TIMELOG);
    if (!sheet) {
      setupTimeLogSheet_();
      sheet = ss.getSheetByName(CFG.TIMELOG);
    }

    const appendRow = sheet.getLastRow() + 1;
    sheet.getRange(appendRow, 1, 1, row.length).setValues([row]);
    sheet.getRange(appendRow, 2).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    sheet.getRange(appendRow, 5).setNumberFormat('0.00');
    applyTimeLogFormatting_(sheet);

    return jsonResponse_({ ok: true });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

function doGet() {
  return jsonResponse_({ ok: true, message: 'TaskMate time log endpoint' });
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// ─── Sessions (derived from Stop rows) ──────────────────────────────────────

function syncSessionsSheet() {
  setupSessionsSheet_();
  const sessions = readSessionsFromLog_();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CFG.SESSIONS);
  const last = sheet.getLastRow();
  if (last > 1) sheet.getRange(2, 1, last - 1, 8).clearContent();

  if (sessions.length === 0) return;

  const tz = getTz_();
  const rows = sessions.map(function (s) {
    return [
      s.endDate,
      s.task,
      s.minutes,
      s.hoursDec,
      minutesToHhMm_(s.minutes),
      s.weekStart,
      s.monthLabel,
      s.year,
    ];
  });

  setRangeValues_(sheet, 2, 1, rows);
  sheet.getRange(2, 1, rows.length, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  sheet.getRange(2, 3, rows.length, 1).setNumberFormat('0.00');
  sheet.getRange(2, 4, rows.length, 1).setNumberFormat('0.00');
}

/**
 * Each Stop row = one completed work session.
 * Elapsed (min) at Stop = total active time (pauses excluded).
 */
function readSessionsFromLog_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CFG.TIMELOG);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const tz = getTz_();
  const lastRow = sheet.getLastRow();
  const data = sheet.getRange('A2:E' + lastRow).getValues();
  const sessions = [];

  data.forEach(function (row) {
    const action = String(row[3] || '').trim();
    if (action !== 'Stop') return;

    const task = String(row[2] || '').trim();
    const minutes = parseFloat(row[4]);
    if (!task || isNaN(minutes)) return;

    const endDate = parseLogDate_(row[1], row[0]);
    if (!endDate) return;

    sessions.push({
      endDate: endDate,
      task: task,
      minutes: minutes,
      hoursDec: round2_(minutes / 60),
      weekStart: getWeekStart_(endDate, tz),
      monthLabel: Utilities.formatDate(endDate, tz, 'MMM yyyy'),
      year: Number(Utilities.formatDate(endDate, tz, 'yyyy')),
    });
  });

  sessions.sort(function (a, b) {
    return a.endDate.getTime() - b.endDate.getTime();
  });
  return sessions;
}

function parseLogDate_(isoVal, displayVal) {
  if (isoVal instanceof Date && !isNaN(isoVal.getTime())) return isoVal;
  if (isoVal) {
    const d = new Date(String(isoVal));
    if (!isNaN(d.getTime())) return d;
  }
  // Fallback: try display string (locale-dependent)
  if (displayVal) {
    const d2 = new Date(String(displayVal));
    if (!isNaN(d2.getTime())) return d2;
  }
  return null;
}

// ─── Reporting ──────────────────────────────────────────────────────────────

function reportThisWeek() {
  const tz = getTz_();
  const today = stripTime_(new Date(), tz);
  const weekStart = getWeekStart_(today, tz);
  const weekEnd = addDays_(weekStart, 6, tz);
  generateReport_(weekStart, endOfDay_(weekEnd, tz), 'This week');
}

function reportLastWeek() {
  const tz = getTz_();
  const today = stripTime_(new Date(), tz);
  const thisWeekStart = getWeekStart_(today, tz);
  const weekStart = addDays_(thisWeekStart, -7, tz);
  const weekEnd = addDays_(weekStart, 6, tz);
  generateReport_(weekStart, endOfDay_(weekEnd, tz), 'Last week');
}

function reportThisMonth() {
  const tz = getTz_();
  const today = stripTime_(new Date(), tz);
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = endOfDay_(new Date(today.getFullYear(), today.getMonth() + 1, 0), tz);
  generateReport_(start, end, 'This month');
}

function reportLastMonth() {
  const tz = getTz_();
  const today = stripTime_(new Date(), tz);
  const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const end = endOfDay_(new Date(today.getFullYear(), today.getMonth(), 0), tz);
  generateReport_(start, end, 'Last month');
}

function reportCustomRange() {
  const ui = SpreadsheetApp.getUi();
  const tz = getTz_();

  const startResp = ui.prompt(
    'Custom report — start date',
    'Enter start date (YYYY-MM-DD):',
    ui.ButtonSet.OK_CANCEL
  );
  if (startResp.getSelectedButton() !== ui.Button.OK) return;
  const start = parseUserDate_(startResp.getResponseText(), tz);
  if (!start) {
    ui.alert('Invalid start date. Use YYYY-MM-DD.');
    return;
  }

  const endResp = ui.prompt(
    'Custom report — end date',
    'Enter end date (YYYY-MM-DD):',
    ui.ButtonSet.OK_CANCEL
  );
  if (endResp.getSelectedButton() !== ui.Button.OK) return;
  const endDay = parseUserDate_(endResp.getResponseText(), tz);
  if (!endDay) {
    ui.alert('Invalid end date. Use YYYY-MM-DD.');
    return;
  }

  generateReport_(start, endOfDay_(endDay, tz), 'Custom range');
}

function generateReport_(rangeStart, rangeEnd, label) {
  syncSessionsSheet();
  const sessions = readSessionsFromLog_().filter(function (s) {
    const t = s.endDate.getTime();
    return t >= rangeStart.getTime() && t <= rangeEnd.getTime();
  });

  const tz = getTz_();
  const summary = aggregateByTask_(sessions);
  writeReportSheet_(rangeStart, rangeEnd, label, summary, sessions, tz);

  SpreadsheetApp.getUi().alert(
    'Report ready on the "' +
      CFG.REPORT +
      '" tab.\n\n' +
      formatPeriod_(rangeStart, rangeEnd, tz) +
      '\nTotal: ' +
      minutesToHhMm_(summary.grandMinutes) +
      ' (' +
      round2_(summary.grandMinutes / 60) +
      ' hrs)'
  );
}

function aggregateByTask_(sessions) {
  const map = {};
  let grandMinutes = 0;
  let grandSessions = 0;

  sessions.forEach(function (s) {
    if (!map[s.task]) {
      map[s.task] = { task: s.task, sessions: 0, minutes: 0 };
    }
    map[s.task].sessions += 1;
    map[s.task].minutes += s.minutes;
    grandMinutes += s.minutes;
    grandSessions += 1;
  });

  const rows = Object.keys(map)
    .sort()
    .map(function (k) {
      const r = map[k];
      return {
        task: r.task,
        sessions: r.sessions,
        minutes: round2_(r.minutes),
        hoursDec: round2_(r.minutes / 60),
        hoursHhMm: minutesToHhMm_(r.minutes),
        pct: grandMinutes > 0 ? round2_((r.minutes / grandMinutes) * 100) : 0,
      };
    });

  return { rows: rows, grandMinutes: round2_(grandMinutes), grandSessions: grandSessions };
}

function writeReportSheet_(rangeStart, rangeEnd, label, summary, sessions, tz) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CFG.REPORT);
  if (!sheet) sheet = ss.insertSheet(CFG.REPORT);
  sheet.clear();

  const period = formatPeriod_(rangeStart, rangeEnd, tz);
  const generated = Utilities.formatDate(new Date(), tz, 'dd MMM yyyy HH:mm');
  const COLS = 5;

  const header = [
    padRow_(['TaskMate Work Report — ' + label], COLS),
    padRow_(['Period', period], COLS),
    padRow_(['Generated', generated], COLS),
    padRow_([''], COLS),
    padRow_(['Summary by task'], COLS),
    ['Task', 'Sessions', 'Hours (h:mm)', 'Hours (dec)', '% of total'],
  ];

  setRangeValues_(sheet, 1, 1, header);
  sheet.getRange(1, 1).setFontSize(14).setFontWeight('bold');
  sheet.getRange(5, 1).setFontWeight('bold');
  sheet.getRange(6, 1, 1, COLS)
    .setFontWeight('bold')
    .setBackground('#1e293b')
    .setFontColor('#f8fafc');

  const startRow = 7;
  if (summary.rows.length === 0) {
    sheet.getRange(startRow, 1).setValue('No completed sessions (Stop events) in this period.');
    return;
  }

  const tableRows = summary.rows.map(function (r) {
    return [r.task, r.sessions, r.hoursHhMm, r.hoursDec, r.pct + '%'];
  });
  setRangeValues_(sheet, startRow, 1, tableRows);

  const totalRow = startRow + tableRows.length;
  setRangeValues_(sheet, totalRow, 1, [
    [
      'TOTAL',
      summary.grandSessions,
      minutesToHhMm_(summary.grandMinutes),
      round2_(summary.grandMinutes / 60),
      '100%',
    ],
  ]);
  sheet.getRange(totalRow, 1, 1, COLS).setFontWeight('bold').setBackground('#e2e8f0');

  const detailStart = totalRow + 3;
  sheet.getRange(detailStart, 1).setValue('Session detail').setFontWeight('bold');
  setRangeValues_(sheet, detailStart + 1, 1, [
    ['Session end', 'Task', 'Minutes', 'Hours (h:mm)'],
  ]);
  sheet.getRange(detailStart + 1, 1, 1, 4)
    .setFontWeight('bold')
    .setBackground('#334155')
    .setFontColor('#f8fafc');

  const detailRows = sessions.map(function (s) {
    return [s.endDate, s.task, s.minutes, minutesToHhMm_(s.minutes)];
  });
  if (detailRows.length) {
    setRangeValues_(sheet, detailStart + 2, 1, detailRows);
    sheet.getRange(detailStart + 2, 1, detailRows.length, 1).setNumberFormat('dd mmm yyyy hh:mm');
    sheet.getRange(detailStart + 2, 3, detailRows.length, 1).setNumberFormat('0.00');
  }

  sheet.setColumnWidth(1, 260);
  sheet.setColumnWidth(2, 220);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 90);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTz_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
}

function stripTime_(date, tz) {
  const s = Utilities.formatDate(date, tz, 'yyyy-MM-dd');
  return new Date(s + 'T00:00:00');
}

function endOfDay_(date, tz) {
  const s = Utilities.formatDate(date, tz, 'yyyy-MM-dd');
  return new Date(s + 'T23:59:59');
}

function addDays_(date, days, tz) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return stripTime_(d, tz);
}

function getWeekStart_(date, tz) {
  const d = stripTime_(date, tz);
  const day = d.getDay(); // 0 Sun … 6 Sat
  let diff = day - CFG.WEEK_START;
  if (diff < 0) diff += 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function parseUserDate_(text, tz) {
  const m = String(text).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(m[1] + '-' + m[2] + '-' + m[3] + 'T00:00:00');
}

function formatPeriod_(start, end, tz) {
  return (
    Utilities.formatDate(start, tz, 'dd MMM yyyy') +
    '  →  ' +
    Utilities.formatDate(end, tz, 'dd MMM yyyy')
  );
}

function minutesToHhMm_(minutes) {
  const totalSec = Math.round(minutes * 60);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return h + ':' + String(m).padStart(2, '0');
}

function round2_(n) {
  return Math.round(n * 100) / 100;
}
