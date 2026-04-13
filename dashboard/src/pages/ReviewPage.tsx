import { useState, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { useReviewStore } from '../stores/review-store';
import { useProductStore } from '../stores/product-store';
import { useCharacterStore } from '../stores/character-store';
import { useSceneStore } from '../stores/scene-store';
import type { RejectionReason, Decision, Brand } from '../types/models';
import { exportApprovedCSV, downloadApprovedZip } from '../services/export';

const REJECTION_REASONS: { value: RejectionReason; label: string }[] = [
  { value: 'bad_likeness', label: 'Bad likeness' },
  { value: 'wrong_style', label: 'Wrong style' },
  { value: 'eyewear_issue', label: 'Eyewear issue' },
  { value: 'composition', label: 'Composition' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'skin_tone', label: 'Skin tone' },
  { value: 'uncanny', label: 'Uncanny' },
  { value: 'other', label: 'Other' },
];

export function ReviewPage() {
  const { results, approvals, addApproval } = useReviewStore();
  const products = useProductStore((s) => s.products);
  const characters = useCharacterStore((s) => s.characters);
  const scenes = useSceneStore((s) => s.scenes);

  const [filterProduct, setFilterProduct] = useState('');
  const [filterDecision, setFilterDecision] = useState<'' | Decision>('');
  const [selectedImage, setSelectedImage] = useState<{ resultId: string; url: string } | null>(null);
  const [rejectReasons, setRejectReasons] = useState<RejectionReason[]>([]);
  const [zipProgress, setZipProgress] = useState<{ done: number; total: number } | null>(null);

  const charMap = useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters]);
  const sceneMap = useMemo(() => new Map(scenes.map((s) => [s.id, s])), [scenes]);
  const approvalMap = useMemo(() => {
    const m = new Map<string, Decision>();
    for (const a of approvals) {
      m.set(`${a.resultId}_${a.imageUrl}`, a.decision);
    }
    return m;
  }, [approvals]);

  // Flatten: one card per image URL
  const allImages = useMemo(() => {
    return results.flatMap((r) =>
      r.imageUrls.map((url) => ({
        resultId: r.id,
        url,
        productId: r.productId,
        characterId: r.characterId,
        sceneId: r.sceneId,
        prompt: r.prompt,
      }))
    );
  }, [results]);

  const filtered = useMemo(() => {
    return allImages.filter((img) => {
      if (filterProduct && img.productId !== filterProduct) return false;
      if (filterDecision) {
        const key = `${img.resultId}_${img.url}`;
        const dec = approvalMap.get(key);
        if (filterDecision === 'approved' && dec !== 'approved') return false;
        if (filterDecision === 'rejected' && dec !== 'rejected') return false;
      }
      return true;
    });
  }, [allImages, filterProduct, filterDecision, approvalMap]);

  const handleDecision = (resultId: string, url: string, decision: Decision, reasons?: RejectionReason[]) => {
    const result = results.find((r) => r.id === resultId);
    if (!result) return;
    const product = products.find((p) => p.id === result.productId);

    addApproval({
      id: uuid(),
      resultId,
      imageUrl: url,
      productId: result.productId,
      characterId: result.characterId,
      sceneId: result.sceneId,
      brand: (product?.brand || 'unknown') as Brand,
      decision,
      rejectionReasons: reasons,
      decidedAt: Date.now(),
    });

    setSelectedImage(null);
    setRejectReasons([]);
  };

  const uniqueProducts = [...new Set(results.map((r) => r.productId))];
  const approvedCount = approvals.filter((a) => a.decision === 'approved').length;
  const rejectedCount = approvals.filter((a) => a.decision === 'rejected').length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Review Images</h2>
          <p className="text-sm text-muted mt-1">
            {allImages.length} images / {approvedCount} approved / {rejectedCount} rejected
          </p>
        </div>
        {approvedCount > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => exportApprovedCSV(results, approvals)}
              className="px-3 py-1.5 border border-border rounded-md text-sm text-gray-600 hover:bg-surface-hover"
            >
              Export CSV
            </button>
            <button
              onClick={async () => {
                setZipProgress({ done: 0, total: approvedCount });
                await downloadApprovedZip(approvals, (done, total) => setZipProgress({ done, total }));
                setZipProgress(null);
              }}
              disabled={zipProgress !== null}
              className="px-3 py-1.5 bg-primary text-white rounded-md text-sm hover:bg-primary-hover disabled:opacity-50"
            >
              {zipProgress ? `Downloading ${zipProgress.done}/${zipProgress.total}...` : 'Download ZIP'}
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          className="px-3 py-1.5 border border-border rounded-md text-sm"
          value={filterProduct}
          onChange={(e) => setFilterProduct(e.target.value)}
        >
          <option value="">All products</option>
          {uniqueProducts.map((pid) => (
            <option key={pid} value={pid}>{pid}</option>
          ))}
        </select>
        <select
          className="px-3 py-1.5 border border-border rounded-md text-sm"
          value={filterDecision}
          onChange={(e) => setFilterDecision(e.target.value as '' | Decision)}
        >
          <option value="">All decisions</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Image grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted text-sm">
          No images to review. Run the generation queue first.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((img) => {
            const key = `${img.resultId}_${img.url}`;
            const decision = approvalMap.get(key);
            const char = charMap.get(img.characterId);
            const scene = sceneMap.get(img.sceneId);

            return (
              <div
                key={key}
                className={`bg-white rounded-lg border overflow-hidden ${
                  decision === 'approved' ? 'border-success' :
                  decision === 'rejected' ? 'border-danger' :
                  'border-border'
                }`}
              >
                <img
                  src={img.url}
                  alt=""
                  className="w-full aspect-[3/4] object-cover cursor-pointer"
                  onClick={() => setSelectedImage(img)}
                />
                <div className="p-2">
                  <div className="text-xs text-gray-700 truncate">{img.productId}</div>
                  <div className="text-xs text-muted truncate">
                    {char?.name || img.characterId} / {scene?.name || img.sceneId}
                  </div>
                  {!decision && (
                    <div className="flex gap-1 mt-1.5">
                      <button
                        onClick={() => handleDecision(img.resultId, img.url, 'approved')}
                        className="flex-1 py-1 bg-green-50 text-success text-xs rounded hover:bg-green-100"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setSelectedImage(img)}
                        className="flex-1 py-1 bg-red-50 text-danger text-xs rounded hover:bg-red-100"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {decision && (
                    <div className={`text-xs mt-1 ${decision === 'approved' ? 'text-success' : 'text-danger'}`}>
                      {decision}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage.url} alt="" className="w-full aspect-[3/4] object-cover" />
            <div className="p-4">
              <p className="text-xs text-muted mb-3">
                {(() => { const r = results.find((r) => r.id === selectedImage.resultId); return r ? `${r.productId} / ${charMap.get(r.characterId)?.name || r.characterId} / ${sceneMap.get(r.sceneId)?.name || r.sceneId}` : ''; })()}
              </p>

              <div className="mb-3">
                <p className="text-xs font-medium text-gray-700 mb-1">Rejection reasons:</p>
                <div className="flex flex-wrap gap-1">
                  {REJECTION_REASONS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setRejectReasons((prev) => prev.includes(r.value) ? prev.filter((x) => x !== r.value) : [...prev, r.value])}
                      className={`px-2 py-1 text-xs rounded border ${
                        rejectReasons.includes(r.value) ? 'bg-red-100 border-danger text-danger' : 'border-border text-gray-600'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleDecision(selectedImage.resultId, selectedImage.url, 'approved')}
                  className="flex-1 py-2 bg-success text-white rounded-md text-sm hover:opacity-90"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleDecision(selectedImage.resultId, selectedImage.url, 'rejected', rejectReasons)}
                  className="flex-1 py-2 bg-danger text-white rounded-md text-sm hover:opacity-90"
                >
                  Reject
                </button>
                <button
                  onClick={() => { setSelectedImage(null); setRejectReasons([]); }}
                  className="px-4 py-2 border border-border rounded-md text-sm text-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
