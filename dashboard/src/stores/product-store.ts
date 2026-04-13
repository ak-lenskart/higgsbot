import { create } from 'zustand';
import type { Product, Batch } from '../types/models';
import { getDB } from '../db';

interface ProductStore {
  products: Product[];
  batches: Batch[];
  currentBatchId: string | null;
  loaded: boolean;
  load: () => Promise<void>;
  addBatch: (batch: Batch, products: Product[]) => Promise<void>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  updateBatch: (id: string, data: Partial<Batch>) => Promise<void>;
  getProductsByBatch: (batchId: string) => Product[];
  setCurrentBatch: (batchId: string | null) => void;
}

export const useProductStore = create<ProductStore>((set, get) => ({
  products: [],
  batches: [],
  currentBatchId: null,
  loaded: false,

  load: async () => {
    const db = await getDB();
    const [products, batches] = await Promise.all([
      db.getAll('products'),
      db.getAll('batches'),
    ]);
    set({ products, batches, loaded: true });
  },

  addBatch: async (batch, products) => {
    const db = await getDB();
    const tx = db.transaction(['batches', 'products'], 'readwrite');
    tx.objectStore('batches').put(batch);
    for (const p of products) {
      tx.objectStore('products').put(p);
    }
    await tx.done;
    set((s) => ({
      batches: [...s.batches, batch],
      products: [...s.products, ...products],
      currentBatchId: batch.id,
    }));
  },

  updateProduct: async (id, data) => {
    const db = await getDB();
    const existing = await db.get('products', id);
    if (!existing) return;
    const updated = { ...existing, ...data };
    await db.put('products', updated);
    set((s) => ({
      products: s.products.map((p) => (p.id === id ? updated : p)),
    }));
  },

  updateBatch: async (id, data) => {
    const db = await getDB();
    const existing = await db.get('batches', id);
    if (!existing) return;
    const updated = { ...existing, ...data };
    await db.put('batches', updated);
    set((s) => ({
      batches: s.batches.map((b) => (b.id === id ? updated : b)),
    }));
  },

  getProductsByBatch: (batchId) =>
    get().products.filter((p) => p.batchId === batchId),

  setCurrentBatch: (batchId) => set({ currentBatchId: batchId }),
}));
