import type { DBSchema } from 'idb';
import type {
  Product,
  Character,
  Scene,
  GenerationResult,
  ApprovalDecision,
  Batch,
} from '../types/models';

export interface HiggsBotDB extends DBSchema {
  products: {
    key: string;
    value: Product;
    indexes: { 'by-batch': string };
  };
  characters: {
    key: string;
    value: Character;
  };
  scenes: {
    key: string;
    value: Scene;
  };
  results: {
    key: string;
    value: GenerationResult;
    indexes: { 'by-product': string; 'by-batch': string; 'by-job': string };
  };
  approvals: {
    key: string;
    value: ApprovalDecision;
    indexes: { 'by-result': string; 'by-product': string };
  };
  batches: {
    key: string;
    value: Batch;
  };
}

export const DB_NAME = 'higgsbot';
export const DB_VERSION = 1;
