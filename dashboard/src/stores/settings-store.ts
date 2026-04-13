import { create } from 'zustand';

interface SettingsStore {
  apiKey: string;
  generationGapMs: number;
  maxRetriesPerJob: number;
  generationTimeoutMs: number;
  maxGenerationsPerSession: number;
  setApiKey: (key: string) => void;
  updateSetting: <K extends keyof SettingsStore>(key: K, value: SettingsStore[K]) => void;
  load: () => void;
}

const SETTINGS_KEY = 'hb_settings';

function loadSettings(): Partial<SettingsStore> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSettings(settings: Record<string, unknown>) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export const useSettingsStore = create<SettingsStore>((set, _get) => ({
  apiKey: '',
  generationGapMs: 25000,
  maxRetriesPerJob: 3,
  generationTimeoutMs: 120000,
  maxGenerationsPerSession: 200,

  load: () => {
    const saved = loadSettings();
    set({
      apiKey: (saved.apiKey as string) || '',
      generationGapMs: (saved.generationGapMs as number) || 25000,
      maxRetriesPerJob: (saved.maxRetriesPerJob as number) || 3,
      generationTimeoutMs: (saved.generationTimeoutMs as number) || 120000,
      maxGenerationsPerSession: (saved.maxGenerationsPerSession as number) || 200,
    });
  },

  setApiKey: (key) => {
    set({ apiKey: key });
    const current = loadSettings();
    saveSettings({ ...current, apiKey: key });
  },

  updateSetting: (key, value) => {
    set({ [key]: value } as Partial<SettingsStore>);
    const current = loadSettings();
    saveSettings({ ...current, [key]: value });
  },
}));
