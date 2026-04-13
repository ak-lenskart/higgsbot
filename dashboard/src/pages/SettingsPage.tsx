import { useSettingsStore } from '../stores/settings-store';

export function SettingsPage() {
  const { apiKey, setApiKey, generationGapMs, maxRetriesPerJob, generationTimeoutMs, maxGenerationsPerSession, updateSetting } = useSettingsStore();

  const inputClass = 'w-full px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary';
  const labelClass = 'block text-xs font-medium text-gray-700 mb-1';

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Settings</h2>

      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Claude API</h3>
          <div>
            <label className={labelClass}>API Key</label>
            <input
              type="password"
              className={inputClass}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
            />
            <p className="text-xs text-muted mt-1">Stored in localStorage. Never sent to any server except Anthropic's API.</p>
          </div>
        </div>

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
                min={10}
                max={120}
              />
            </div>
            <div>
              <label className={labelClass}>Max Retries Per Job</label>
              <input
                type="number"
                className={inputClass}
                value={maxRetriesPerJob}
                onChange={(e) => updateSetting('maxRetriesPerJob', Number(e.target.value))}
                min={0}
                max={10}
              />
            </div>
            <div>
              <label className={labelClass}>Generation Timeout (seconds)</label>
              <input
                type="number"
                className={inputClass}
                value={generationTimeoutMs / 1000}
                onChange={(e) => updateSetting('generationTimeoutMs', Number(e.target.value) * 1000)}
                min={30}
                max={300}
              />
            </div>
            <div>
              <label className={labelClass}>Max Generations Per Session</label>
              <input
                type="number"
                className={inputClass}
                value={maxGenerationsPerSession}
                onChange={(e) => updateSetting('maxGenerationsPerSession', Number(e.target.value))}
                min={10}
                max={500}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
