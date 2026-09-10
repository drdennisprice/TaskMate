# TaskMate

Personal task manager Chrome extension in the side panel.

## Features

- Live day/date/time tray at the top
- **Time tracking** — Start, Pause, Stop with timestamps logged to Google Sheets
- Dense categorized task lists with drag-and-drop ordering
- Quick-add, search, and Active/Done filters
- Calendar due date picker with overdue highlighting
- Priority levels, notes, category management
- Local task storage (`chrome.storage.local`)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Generate icons (first time only):

   ```bash
   node scripts/generate-icons.mjs
   ```

3. Build the extension:

   ```bash
   npm run build
   ```

   For development with auto-rebuild on save:

   ```bash
   npm run dev
   ```

4. Load in Chrome:
   - Open `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select the `dist` folder

5. Click the TaskMate toolbar icon to open the side panel.

## Collapsible panel

Click the **‹** button at the top of the tray to collapse TaskMate down to a slim rail — it hides the toolbar, filters, and task list, leaving just a status dot (and elapsed time, while tracking). Click the rail (or the **›** button) to expand again. The state is remembered between opens.

Note: Chrome doesn't give extensions an API to resize the side panel's docked width itself — the panel's on-screen width is whatever you last dragged it to. Collapsing in-app shrinks TaskMate's own content to a ~40px strip; drag the panel's left edge narrower to match if you want the dock itself to shrink too.

## Google Sheets time log

Each **Start**, **Pause**, and **Stop** writes a row using the same clock shown in the tray.

A hosted step-by-step guide (with a one-click download of `Code.gs`) lives at **https://drdennisprice.github.io/TaskMate/** — see [`docs/index.html`](docs/index.html). It's also linked from the ⚙ settings panel inside the extension.

### Recommended: Apps Script Web App

1. Create a Google Sheet
2. **Extensions → Apps Script**
3. Paste the contents of [`google-apps-script/Code.gs`](google-apps-script/Code.gs)
4. Run **`setupAllSheets`** once (authorize when prompted)
5. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the Web App URL
7. In TaskMate, click **⚙** in the time tracker tray → paste the URL → Save
8. Reload the spreadsheet — the **TaskMate** menu appears in the menu bar

### Sheet tabs

| Tab | Purpose |
|-----|---------|
| **TimeLog** | Raw Start / Pause / Stop events from the extension |
| **Sessions** | One row per completed session (derived from **Stop** rows) |
| **Report** | Generated tax / WFH summaries |

**Important:** Total worked time comes from **Stop** rows — column E (`Elapsed (min)`) is active time only (pauses excluded).

### Reporting (weekly & monthly summaries)

Use **TaskMate → Reporting** in the spreadsheet menu:

- **This week** / **Last week** — Monday–Sunday totals (change `WEEK_START` in Code.gs if needed)
- **This month** / **Last month** — calendar month totals
- **Custom date range** — enter start and end dates (YYYY-MM-DD)

Each report includes:

- Summary by task (sessions, hours as h:mm and decimal, % of total)
- Grand total row
- Session-level detail for audit

Also: **TaskMate → Refresh Sessions tab** rebuilds the Sessions sheet from TimeLog.

### Spreadsheet timezone

Set **File → Settings → Time zone** to your local zone so weekly/monthly boundaries match your tax reporting.

Rows appended to **TimeLog**:

| Display Time | ISO Time | Task | Action | Elapsed (min) |
|--------------|----------|------|--------|---------------|

### Optional: Direct Sheets API (OAuth)

If you prefer not to use Apps Script:

1. Create a [Google Cloud OAuth client](https://console.cloud.google.com/) (type: **Chrome Extension**)
2. Use your extension ID from `chrome://extensions`
3. Enable the Google Sheets API
4. Replace `REPLACE_WITH_YOUR_OAUTH_CLIENT_ID` in `manifest.json` and rebuild
5. In TaskMate settings, enter your **Spreadsheet ID** and sheet tab name

## Publishing to the Chrome Web Store

1. `npm run build` to produce a fresh `dist/` folder.
2. Zip the **contents** of `dist/` (not the folder itself) — e.g. from inside `dist/`: `zip -r ../taskmate.zip .`
3. In the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole), create a new item and upload `taskmate.zip`.
4. Before submitting, decide on visibility:
   - **Unlisted** — installable only via direct link, not searchable. Usually the right choice for a personal tool, and avoids most of Google's review scrutiny.
   - **Public** — searchable in the store; a better fit if this is meant to double as a lead magnet.
5. Two things in `manifest.json` need a decision before a public listing will pass review:
   - The `oauth2.client_id` is still the placeholder `REPLACE_WITH_YOUR_OAUTH_CLIENT_ID...`. It's only used by the optional "Direct Sheets API" auth path — if you only ever use the recommended Apps Script Web App method, you can remove the whole `oauth2` block, the `identity` permission, and the `sheets.googleapis.com` / `www.googleapis.com` host permissions from `manifest.json` (and drop the OAuth code path in `src/background/sheets.ts`) to simplify the review. If you want to keep OAuth available, you'll need a real Google Cloud OAuth client and — for a **public** listing using the sensitive `spreadsheets` scope — Google's OAuth verification process (can take days to weeks) plus a published privacy policy URL in the store listing.
   - Add a short privacy policy page (a paragraph on what data TaskMate stores and where — worth adding to the `docs/` GitHub Pages site) and link it in the store listing if you go public.
6. Fill in a store description, screenshots, and icon (128×128 is already in `src/assets/icons/`).

## Usage

### Tasks

- **Quick add**: Type a task and press Enter
- **Edit task**: Click any task row
- **Complete**: Use the checkbox
- **Reorder**: Drag tasks within or between categories
- **Categories**: Use `+ Category` or the `···` menu on a category header
- **Due dates**: Set via calendar picker in the task editor

### Time tracking

1. Configure Google Sheets (⚙ in the tray)
2. Select a task from the dropdown
3. **Start** — logs start time and begins the timer
4. **Pause** — logs pause time and stops accumulating time
5. **Stop** — logs stop time and resets the tracker

The status line shows running/paused state and elapsed time.
