import { useSettingsStore } from '../stores/settings-store';
import type { AIProvider } from '../services/ai-api';

const PROVIDERS: { value: AIProvider; label: string; hint: string; link: string; placeholder: string }[] = [
  {
    value: 'gemini',
    label: 'Google Gemini',
    hint: 'Free tier: 15 req/min, 1M tokens/day. Best value.',
    link: 'https://aistudio.google.com/app/apikey',
    placeholder: 'AIza...',
  },
  {
    value: 'groq',
    label: 'Groq (Llama 4)',
    hint: 'Free tier: very fast inference on Llama 4 Scout (vision).',
    link: 'https://console.groq.com/keys',
    placeholder: 'gsk_...',
  },
  {
    value: 'claude',
    label: 'Claude (Anthropic)',
    hint: 'Haiku — most accurate but costs ~$0.01/product.',
    link: 'https://console.anthropic.com/',
    placeholder: 'sk-ant-...',
  },
];

export function SettingsPage() {
  const {
    aiProvider, setProvider,
    apiKey, setApiKey,
    geminiApiKey, setGeminiApiKey,
    groqApiKey, setGroqApiKey,
    generationGapMs, maxRetriesPerJob,
    generationTimeoutMs, maxGenerationsPerSession,
    updateSetting,
  } = useSettingsStore();

  const inputClass = 'w-full px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary';
  const labelClass = 'block text-xs font-medium text-gray-700 mb-1';

  const activeProvider = PROVIDERS.find((p) => p.value === aiProvider)!;

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Settings</h2>

      <div className="space-y-6">

        {/* AI Provider */}
        <div className="bg-white rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">AI Provider for Analysis</h3>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                onClick={() => setProvider(p.value)}
                className={`px-3 py-2 rounded-md text-sm border text-left ${
                  aiProvider === p.value
                    ? 'bg-primary text-white border-primary'
                    : 'border-border text-gray-700 hover:bg-surface-hover'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-muted mb-3">{activeProvider.hint}</p>

          {/* Claude key */}
          {aiProvider === 'claude' && (
            <div>
              <label className={labelClass}>Anthropic API Key</label>
              <input
                type="password"
                className={inputClass}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
              />
              <p className="text-xs text-muted mt-1">
                Get key at <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer" className="text-primary underline">console.anthropic.com</a>
              </p>
            </div>
          )}

          {/* Gemini key */}
          {aiProvider === 'gemini' && (
            <div>
              <label className={labelClass}>Google AI API Key</label>
              <input
                type="password"
                className={inputClass}
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIza..."
              />
              <p className="text-xs text-muted mt-1">
                Free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-primary underline">aistudio.google.com</a>
              </p>
            </div>
          )}

          {/* Groq key */}
          {aiProvider === 'groq' && (
            <div>
              <label className={labelClass}>Groq API Key</label>
              <input
                type="password"
                className={inputClass}
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
                placeholder="gsk_..."
              />
              <p className="text-xs text-muted mt-1">
                Free key at <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-primary underline">console.groq.com</a>
              </p>
            </div>
          )}
        </div>

        {/* Generation settings */}
        <div className="bg-white rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Generation Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Gap Between Jobs (seconds)</label>
              <input
                type="number"
                className={inputClass}
                value={generationGapMs / 1000}
                onChange={(e) => updateSetting('generationGapMs', Number(e.target.value) * 1000)}
                min={10} max={120}
              />
            </div>
            <div>
              <label className={labelClass}>Max Retries Per Job</label>
              <input
                type="number"
                className={inputClass}
                value={maxRetriesPerJob}
                onChange={(e) => updateSetting('maxRetriesPerJob', Number(e.target.value))}
                min={0} max={10}
              />
            </div>
            <div>
              <label className={labelClass}>Generation Timeout (seconds)</label>
              <input
                type="number"
                className={inputClass}
                value={generationTimeoutMs / 1000}
                onChange={(e) => updateSetting('generationTimeoutMs', Number(e.target.value) * 1000)}
                min={30} max={300}
              />
            </div>
            <div>
              <label className={labelClass}>Max Generations Per Session</label>
              <input
                type="number"
                className={inputClass}
                value={maxGenerationsPerSession}
                onChange={(e) => updateSetting('maxGenerationsPerSession', Number(e.target.value))}
                min={10} max={500}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
