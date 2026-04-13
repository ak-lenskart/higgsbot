import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { useProductStore } from '../stores/product-store';
import { useCharacterStore } from '../stores/character-store';
import { useSceneStore } from '../stores/scene-store';
import { useSettingsStore } from '../stores/settings-store';
import { useQueueStore } from '../stores/queue-store';
import { generatePrompts } from '../services/ai-api';
import { submitQueue } from '../services/extension-bridge';
import type { GenerationJob } from '../types/models';

interface PromptJob {
  id: string;
  productId: string;
  characterId: string;
  characterName: string;
  sceneId: string;
  sceneName: string;
  prompt: string;
  status: 'pending' | 'generating' | 'ready';
}

export function PromptsPage() {
  const products = useProductStore((s) => s.products);
  const currentBatchId = useProductStore((s) => s.currentBatchId);
  const characters = useCharacterStore((s) => s.characters);
  const scenes = useSceneStore((s) => s.scenes);
  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const getActiveApiKey = useSettingsStore((s) => s.getActiveApiKey);
  const setJobs = useQueueStore((s) => s.setJobs);
  const navigate = useNavigate();

  const [promptJobs, setPromptJobs] = useState<PromptJob[]>([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [promptsPerPid, setPromptsPerPid] = useState(3);

  const batchProducts = useMemo(
    () => products.filter((p) => p.batchId === currentBatchId && p.analysisStatus === 'complete'),
    [products, currentBatchId]
  );

  const buildCombinations = useCallback((limit = promptsPerPid) => {
    const combos: PromptJob[] = [];
    for (const product of batchProducts) {
      let count = 0;
      outer: for (const charId of product.selectedCharacterIds) {
        const char = characters.find((c) => c.id === charId);
        if (!char) continue;
        for (const sceneId of product.selectedSceneIds) {
          if (count >= limit) break outer;
          const scene = scenes.find((s) => s.id === sceneId);
          if (!scene) continue;
          combos.push({
            id: uuid(),
            productId: product.id,
            characterId: charId,
            characterName: char.name,
            sceneId,
            sceneName: scene.name,
            prompt: '',
            status: 'pending',
          });
          count++;
        }
      }
    }
    setPromptJobs(combos);
    return combos;
  }, [batchProducts, characters, scenes, promptsPerPid]);

  const generateAllPrompts = useCallback(async () => {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
      alert('Set your API key in Settings first.');
      return;
    }

    let jobs = promptJobs;
    if (jobs.length === 0) {
      jobs = buildCombinations(promptsPerPid);
    }

    setGenerating(true);
    setProgress(0);

    const updated = [...jobs];
    for (let i = 0; i < updated.length; i++) {
      const job = updated[i];
      if (job.status === 'ready') { setProgress(i + 1); continue; }

      const product = batchProducts.find((p) => p.id === job.productId);
      const char = characters.find((c) => c.id === job.characterId);
      const scene = scenes.find((s) => s.id === job.sceneId);
      if (!product || !char || !scene || !product.analysisResult) continue;

      updated[i] = { ...job, status: 'generating' };
      setPromptJobs([...updated]);

      try {
        const prompt = await generatePrompts(
          aiProvider,
          apiKey,
          `${product.analysisResult.productType}, ${product.analysisResult.frameStyle}`,
          product.analysisResult.frameColor,
          char,
          scene,
          product.analysisResult.suggestedClothingColor
        );
        updated[i] = { ...job, prompt, status: 'ready' };
      } catch (err) {
        console.error('Prompt generation failed:', err);
        updated[i] = { ...job, prompt: '[Generation failed — edit manually]', status: 'ready' };
      }

      setPromptJobs([...updated]);
      setProgress(i + 1);
    }

    setGenerating(false);
  }, [aiProvider, getActiveApiKey, promptJobs, promptsPerPid, buildCombinations, batchProducts, characters, scenes]);

  const handleEditPrompt = (index: number, newPrompt: string) => {
    setPromptJobs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], prompt: newPrompt };
      return updated;
    });
  };

  const sendToQueue = () => {
    const genJobs: GenerationJob[] = promptJobs
      .filter((j) => j.status === 'ready' && j.prompt)
      .map((j) => ({
        id: j.id,
        productId: j.productId,
        characterId: j.characterId,
        characterName: j.characterName,
        sceneId: j.sceneId,
        batchId: currentBatchId!,
        prompt: j.prompt,
        status: 'queued' as const,
        retryCount: 0,
        maxRetries: 3,
        createdAt: Date.now(),
      }));

    setJobs(genJobs);
    submitQueue(genJobs, false);
    navigate('/queue');
  };

  const readyCount = promptJobs.filter((j) => j.status === 'ready').length;
  const maxCombos = batchProducts.reduce(
    (sum, p) => sum + p.selectedCharacterIds.length * p.selectedSceneIds.length,
    0
  );
  const previewCount = batchProducts.length * promptsPerPid;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Prompts</h2>
          <p className="text-sm text-muted mt-1">
            {promptJobs.length > 0
              ? `${readyCount}/${promptJobs.length} ready`
              : `${batchProducts.length} products · up to ${maxCombos} total combos`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Prompts per PID selector */}
          {promptJobs.length === 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 whitespace-nowrap">Prompts per product:</span>
              <div className="flex rounded-md border border-border overflow-hidden">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setPromptsPerPid(n)}
                    className={`px-3 py-1.5 text-sm border-r border-border last:border-r-0 ${
                      promptsPerPid === n
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-surface-hover'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <span className="text-xs text-muted">= {previewCount} jobs</span>
            </div>
          )}
          <button
            onClick={generateAllPrompts}
            disabled={generating || batchProducts.length === 0}
            className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
          >
            {generating ? `Generating ${progress}/${promptJobs.length}...` : 'Generate Prompts'}
          </button>
          {readyCount > 0 && !generating && (
            <button
              onClick={sendToQueue}
              className="px-4 py-2 bg-success text-white rounded-md text-sm font-medium hover:opacity-90"
            >
              Send to Queue ({readyCount})
            </button>
          )}
        </div>
      </div>

      {generating && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${promptJobs.length > 0 ? (progress / promptJobs.length) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {promptJobs.length === 0 && batchProducts.length === 0 && (
        <div className="text-center py-12 text-muted text-sm">
          No analyzed products. Run analysis first.
        </div>
      )}

      <div className="space-y-2">
        {promptJobs.map((job, i) => (
          <div key={job.id} className="bg-white rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 mb-1 text-xs">
              <span className="font-mono text-gray-900">{job.productId}</span>
              <span className="text-muted">/</span>
              <span className="text-gray-700">{job.characterName}</span>
              <span className="text-muted">/</span>
              <span className="text-gray-700">{job.sceneName}</span>
              <span className={`ml-auto px-1.5 py-0.5 rounded text-xs ${
                job.status === 'ready' ? 'bg-green-100 text-green-700' :
                job.status === 'generating' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {job.status}
              </span>
            </div>
            {job.prompt && (
              <textarea
                className="w-full text-xs text-gray-700 bg-surface border border-border rounded p-2 mt-1 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                rows={2}
                value={job.prompt}
                onChange={(e) => handleEditPrompt(i, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
