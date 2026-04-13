import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductStore } from '../stores/product-store';
import { useCharacterStore } from '../stores/character-store';
import { useSceneStore } from '../stores/scene-store';
import { useSettingsStore } from '../stores/settings-store';
import { analyzeProduct } from '../services/claude-api';
import { ProductCard } from '../components/analysis/ProductCard';

export function AnalysisPage() {
  const { products, currentBatchId, updateProduct, updateBatch, batches } = useProductStore();
  const allCharacters = useCharacterStore((s) => s.characters);
  const allScenes = useSceneStore((s) => s.scenes);
  const characters = useMemo(() => allCharacters.filter((c) => c.active), [allCharacters]);
  const scenes = useMemo(() => allScenes.filter((sc) => sc.active), [allScenes]);
  const apiKey = useSettingsStore((s) => s.apiKey);
  const navigate = useNavigate();

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const batchProducts = products.filter((p) => p.batchId === currentBatchId);
  const currentBatch = batches.find((b) => b.id === currentBatchId);

  const runAnalysis = useCallback(async () => {
    if (!apiKey) {
      alert('Please set your Claude API key in Settings first.');
      return;
    }
    if (characters.length === 0) {
      alert('Please add at least one active character first.');
      return;
    }

    setRunning(true);
    setProgress(0);

    for (let i = 0; i < batchProducts.length; i++) {
      const product = batchProducts[i];
      if (product.analysisStatus === 'complete') {
        setProgress(i + 1);
        continue;
      }

      await updateProduct(product.id, { analysisStatus: 'analyzing' });

      try {
        const result = await analyzeProduct(apiKey, product.imageUrl, characters, scenes);
        await updateProduct(product.id, {
          analysisStatus: 'complete',
          analysisResult: result,
          brand: result.brand,
          productType: result.productType,
          frameColor: result.frameColor,
          frameStyle: result.frameStyle,
          selectedCharacterIds: result.suggestedCharacterIds,
          selectedSceneIds: result.suggestedSceneIds,
        });
      } catch (err) {
        await updateProduct(product.id, {
          analysisStatus: 'error',
          analysisResult: null,
        });
        console.error(`Analysis failed for ${product.id}:`, err);
      }

      setProgress(i + 1);
    }

    if (currentBatch) {
      await updateBatch(currentBatch.id, { status: 'prompting' });
    }
    setRunning(false);
  }, [apiKey, batchProducts, characters, scenes, updateProduct, updateBatch, currentBatch]);

  const completedCount = batchProducts.filter((p) => p.analysisStatus === 'complete').length;
  const allDone = completedCount === batchProducts.length && batchProducts.length > 0;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Product Analysis</h2>
          <p className="text-sm text-muted mt-1">
            {completedCount}/{batchProducts.length} analyzed
          </p>
        </div>
        <div className="flex gap-2">
          {!allDone && (
            <button
              onClick={runAnalysis}
              disabled={running || batchProducts.length === 0}
              className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? `Analyzing ${progress}/${batchProducts.length}...` : 'Run Analysis'}
            </button>
          )}
          {allDone && (
            <button
              onClick={() => navigate('/prompts')}
              className="px-4 py-2 bg-success text-white rounded-md text-sm font-medium hover:opacity-90"
            >
              Generate Prompts
            </button>
          )}
        </div>
      </div>

      {running && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${(progress / batchProducts.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {batchProducts.length === 0 ? (
        <div className="text-center py-12 text-muted text-sm">
          No products to analyze. Upload a CSV first.
        </div>
      ) : (
        <div className="space-y-3">
          {batchProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
