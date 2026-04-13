import type { Product } from '../../types/models';
import { BRAND_LABELS } from '../../data/brands';

interface Props {
  product: Product;
}

const STATUS_STYLES = {
  pending: 'bg-gray-100 text-gray-600',
  analyzing: 'bg-blue-100 text-blue-700',
  complete: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
};

export function ProductCard({ product }: Props) {
  return (
    <div className="bg-white rounded-lg border border-border p-4 flex gap-4">
      <img
        src={product.imageUrl}
        alt={product.id}
        className="w-20 h-20 object-cover rounded border border-border shrink-0"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect fill="%23f3f4f6" width="80" height="80"/><text x="40" y="44" text-anchor="middle" fill="%239ca3af" font-size="10">No image</text></svg>';
        }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-sm font-medium text-gray-900">{product.id}</span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_STYLES[product.analysisStatus]}`}>
            {product.analysisStatus}
          </span>
          {product.frameName && (
            <span className="text-xs text-muted">{product.frameName}</span>
          )}
        </div>

        {product.analysisResult && (
          <div className="mt-1 space-y-1">
            <div className="flex gap-3 text-xs">
              <span className="text-gray-700">
                <strong>Brand:</strong> {BRAND_LABELS[product.analysisResult.brand]}
              </span>
              <span className="text-gray-700">
                <strong>Type:</strong> {product.analysisResult.productType}
              </span>
              <span className="text-gray-700">
                <strong>Color:</strong> {product.analysisResult.frameColor}
              </span>
              <span className="text-gray-700">
                <strong>Clothing:</strong> {product.analysisResult.suggestedClothingColor}
              </span>
            </div>
            <p className="text-xs text-muted">{product.analysisResult.reasoning}</p>
            <div className="flex gap-1 text-xs text-muted">
              <span>{product.selectedCharacterIds.length} characters</span>
              <span>/</span>
              <span>{product.selectedSceneIds.length} scenes</span>
              <span>/</span>
              <span>{product.selectedCharacterIds.length * product.selectedSceneIds.length} combos</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
