export interface UiState {
  collapsed: boolean;
}

const UI_STATE_KEY = 'taskmate_ui_state';

const DEFAULT_UI_STATE: UiState = { collapsed: false };

export async function loadUiState(): Promise<UiState> {
  const result = await chrome.storage.local.get(UI_STATE_KEY);
  return {
    ...DEFAULT_UI_STATE,
    ...((result[UI_STATE_KEY] as Partial<UiState> | undefined) ?? {}),
  };
}

export async function saveUiState(state: UiState): Promise<void> {
  await chrome.storage.local.set({ [UI_STATE_KEY]: state });
}
