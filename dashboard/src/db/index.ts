import { openDB, type IDBPDatabase } from 'idb';
import type { HiggsBotDB } from './schema';
import { DB_NAME, DB_VERSION } from './schema';

let dbInstance: IDBPDatabase<HiggsBotDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<HiggsBotDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<HiggsBotDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Products
      const productStore = db.createObjectStore('products', { keyPath: 'id' });
      productStore.createIndex('by-batch', 'batchId');

      // Characters
      db.createObjectStore('characters', { keyPath: 'id' });

      // Scenes
      db.createObjectStore('scenes', { keyPath: 'id' });

      // Results
      const resultStore = db.createObjectStore('results', { keyPath: 'id' });
      resultStore.createIndex('by-product', 'productId');
      resultStore.createIndex('by-batch', 'batchId');
      resultStore.createIndex('by-job', 'jobId');

      // Approvals
      const approvalStore = db.createObjectStore('approvals', { keyPath: 'id' });
      approvalStore.createIndex('by-result', 'resultId');
      approvalStore.createIndex('by-product', 'productId');

      // Batches
      db.createObjectStore('batches', { keyPath: 'id' });
    },
  });

  return dbInstance;
}
