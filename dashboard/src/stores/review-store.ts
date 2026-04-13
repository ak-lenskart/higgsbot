import { create } from 'zustand';
import type { GenerationResult, ApprovalDecision } from '../types/models';
import { getDB } from '../db';

interface ReviewStore {
  results: GenerationResult[];
  approvals: ApprovalDecision[];
  loaded: boolean;
  load: () => Promise<void>;
  addResults: (results: GenerationResult[]) => Promise<void>;
  addApproval: (approval: ApprovalDecision) => Promise<void>;
  getResultsByProduct: (productId: string) => GenerationResult[];
  getApprovalForResult: (resultId: string) => ApprovalDecision | undefined;
  getApprovedResults: () => GenerationResult[];
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  results: [],
  approvals: [],
  loaded: false,

  load: async () => {
    const db = await getDB();
    const [results, approvals] = await Promise.all([
      db.getAll('results'),
      db.getAll('approvals'),
    ]);
    set({ results, approvals, loaded: true });
  },

  addResults: async (newResults) => {
    const db = await getDB();
    const tx = db.transaction('results', 'readwrite');
    for (const r of newResults) {
      tx.store.put(r);
    }
    await tx.done;
    set((s) => ({ results: [...s.results, ...newResults] }));
  },

  addApproval: async (approval) => {
    const db = await getDB();
    await db.put('approvals', approval);
    set((s) => ({
      approvals: [
        ...s.approvals.filter((a) => a.resultId !== approval.resultId || a.imageUrl !== approval.imageUrl),
        approval,
      ],
    }));
  },

  getResultsByProduct: (productId) =>
    get().results.filter((r) => r.productId === productId),

  getApprovalForResult: (resultId) =>
    get().approvals.find((a) => a.resultId === resultId),

  getApprovedResults: () => {
    const approvedIds = new Set(
      get()
        .approvals.filter((a) => a.decision === 'approved')
        .map((a) => a.resultId)
    );
    return get().results.filter((r) => approvedIds.has(r.id));
  },
}));
