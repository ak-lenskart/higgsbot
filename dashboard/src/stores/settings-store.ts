import { create } from 'zustand';
import type { AIProvider } from '../services/ai-api';

interface SettingsStore {
  aiProvider: AIProvider;
  apiKey: string;         // Claude key
  geminiApiKey: string;
  groqApiKey: string;
  generationGapMs: number;
  maxRetriesPerJob: number;
  generationTimeoutMs: number;
  maxGenerationsPerSession: number;
  setApiKey: (key: string) => void;
  setGeminiApiKey: (key: string) => void;
  setGroqApiKey: (key: string) => void;
  setProvider: (provider: AIProvider) => void;
  updateSetting: <K extends keyof SettingsStore>(key: K, value: SettingsStore[K]) => void;
  getActiveApiKey: () => string;
  load: () => void;
}

const SETTINGS_KEY = 'hb_settings';

function loadFromStorage(): Partial<SettingsStore> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(settings: Record<string, unknown>) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  aiProvider: 'gemini',
  apiKey: '',
  geminiApiKey: '',
  groqApiKey: '',
  generationGapMs: 25000,
  maxRetriesPerJob: 3,
  generationTimeoutMs: 120000,
  maxGenerationsPerSession: 200,

  load: () => {
    const s = loadFromStorage();
    set({
      aiProvider: (s.aiProvider as AIProvider) || 'gemini',
      apiKey: (s.apiKey as string) || '',
      geminiApiKey: (s.geminiApiKey as string) || '',
      groqApiKey: (s.groqApiKey as string) || '',
      generationGapMs: (s.generationGapMs as number) || 25000,
      maxRetriesPerJob: (s.maxRetriesPerJob as number) || 3,
      generationTimeoutMs: (s.generationTimeoutMs as number) || 120000,
      maxGenerationsPerSession: (s.maxGenerationsPerSession as number) || 200,
    });
  },

  setApiKey: (key) => {
    set({ apiKey: key });
    save({ ...loadFromStorage(), apiKey: key });
  },

  setGeminiApiKey: (key) => {
    set({ geminiApiKey: key });
    save({ ...loadFromStorage(), geminiApiKey: key });
  },

  setGroqApiKey: (key) => {
    set({ groqApiKey: key });
    save({ ...loadFromStorage(), groqApiKey: key });
  },

  setProvider: (provider) => {
    set({ aiProvider: provider });
    save({ ...loadFromStorage(), aiProvider: provider });
  },

  updateSetting: (key, value) => {
    set({ [key]: value } as Partial<SettingsStore>);
    save({ ...loadFromStorage(), [key]: value });
  },

  getActiveApiKey: () => {
    const { aiProvider, apiKey, geminiApiKey, groqApiKey } = get();
    if (aiProvider === 'claude') return apiKey;
    if (aiProvider === 'gemini') return geminiApiKey;
    if (aiProvider === 'groq') return groqApiKey;
    return '';
  },
}));
