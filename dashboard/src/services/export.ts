import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { GenerationResult, ApprovalDecision } from '../types/models';

export function exportApprovedCSV(
  results: GenerationResult[],
  approvals: ApprovalDecision[]
) {
  const approved = approvals.filter((a) => a.decision === 'approved');
  if (approved.length === 0) {
    alert('No approved images to export.');
    return;
  }

  const rows = [
    ['resultId', 'productId', 'characterId', 'sceneId', 'imageUrl', 'prompt', 'decidedAt'].join(','),
    ...approved.map((a) => {
      const result = results.find((r) => r.id === a.resultId);
      return [
        a.resultId,
        a.productId,
        a.characterId,
        a.sceneId,
        a.imageUrl,
        `"${(result?.prompt || '').replace(/"/g, '""')}"`,
        new Date(a.decidedAt).toISOString(),
      ].join(',');
    }),
  ];

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `higgsbot-approved-${Date.now()}.csv`);
}

export async function downloadApprovedZip(
  approvals: ApprovalDecision[],
  onProgress?: (done: number, total: number) => void
) {
  const approved = approvals.filter((a) => a.decision === 'approved');
  if (approved.length === 0) {
    alert('No approved images to download.');
    return;
  }

  const zip = new JSZip();
  const folder = zip.folder('approved-images')!;
  let done = 0;

  for (const approval of approved) {
    try {
      const res = await fetch(approval.imageUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const ext = blob.type.includes('png') ? 'png' : 'jpg';
      const filename = `${approval.productId}_${approval.characterId}_${approval.sceneId}_${done + 1}.${ext}`;
      folder.file(filename, blob);
    } catch (err) {
      console.warn(`Could not download ${approval.imageUrl}:`, err);
    }
    done++;
    onProgress?.(done, approved.length);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, `higgsbot-approved-${Date.now()}.zip`);
}
