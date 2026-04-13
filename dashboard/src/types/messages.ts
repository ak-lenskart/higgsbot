import type { GenerationJob, GenerationResult, QueueState } from './models';

// Dashboard -> Extension (via postMessage to bridge content script)
export type DashboardMessage =
  | { type: 'HIGGSBOT_PING' }
  | { type: 'HIGGSBOT_QUEUE_SUBMIT'; payload: { jobs: GenerationJob[]; append: boolean } }
  | { type: 'HIGGSBOT_QUEUE_CONTROL'; payload: { action: 'pause' | 'resume' | 'cancel' | 'retry_failed' } };

// Extension -> Dashboard (via postMessage from bridge content script)
export type ExtensionMessage =
  | { type: 'HIGGSBOT_PONG' }
  | { type: 'HIGGSBOT_STATE_SYNC'; payload: { queue: QueueState; recentResults: GenerationResult[]; heartbeat: number } };

// Storage keys
export const STORAGE_KEYS = {
  QUEUE: 'hb_queue',
  JOB_PREFIX: 'hb_job_',
  RESULTS: 'hb_results',
  HEARTBEAT: 'hb_heartbeat',
  SESSION: 'hb_session',
  CONFIG: 'hb_config',
} as const;
