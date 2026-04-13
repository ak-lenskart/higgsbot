export type Brand = 'vincent_chase' | 'hustlr' | 'lk_air' | 'john_jacobs' | 'unknown';

export type AnalysisStatus = 'pending' | 'analyzing' | 'complete' | 'error';
export type JobStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
export type BatchStatus = 'analyzing' | 'prompting' | 'queued' | 'generating' | 'reviewing' | 'complete';
export type QueueStatus = 'idle' | 'running' | 'paused' | 'error';
export type Decision = 'approved' | 'rejected';
export type SceneCategory = 'indoor' | 'outdoor' | 'urban' | 'lifestyle';
export type Gender = 'male' | 'female' | 'non_binary';

export type JobErrorType =
  | 'selector_not_found'
  | 'character_not_found'
  | 'generation_timeout'
  | 'session_expired'
  | 'rate_limited'
  | 'unknown';

export type RejectionReason =
  | 'bad_likeness'
  | 'wrong_style'
  | 'eyewear_issue'
  | 'composition'
  | 'lighting'
  | 'skin_tone'
  | 'uncanny'
  | 'other';

// === Core Entities ===

export interface AnalysisResult {
  brand: Brand;
  productType: string;
  frameColor: string;
  frameStyle: string;
  targetDemographic: string;
  suggestedCharacterIds: string[];
  suggestedSceneIds: string[];
  suggestedClothingColor: string;
  reasoning: string;
  tokensUsed: { input: number; output: number };
}

export interface Product {
  id: string;
  imageUrl: string;
  frameName?: string;
  brand: Brand | null;
  productType: string | null;
  frameColor: string | null;
  frameStyle: string | null;
  analysisStatus: AnalysisStatus;
  analysisResult: AnalysisResult | null;
  selectedCharacterIds: string[];
  selectedSceneIds: string[];
  batchId: string;
  createdAt: number;
}

export interface Character {
  id: string;
  name: string;
  higgsName: string;
  gender: Gender;
  skinTone: string;
  ageRange: string;
  style: string;
  brandAffinity: Brand[];
  signatureScenes: string[];
  thumbnailUrl?: string;
  active: boolean;
  totalGenerations: number;
  approvalRate: number | null;
  createdAt: number;
}

export interface Scene {
  id: string;
  name: string;
  description: string;
  promptFragment: string;
  category: SceneCategory;
  active: boolean;
  totalGenerations: number;
  approvalRate: number | null;
  createdAt: number;
}

// === Generation ===

export interface GenerationJob {
  id: string;
  productId: string;
  characterId: string;
  sceneId: string;
  batchId: string;
  prompt: string;
  status: JobStatus;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  errorType?: JobErrorType;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface GenerationResult {
  id: string;
  jobId: string;
  productId: string;
  characterId: string;
  sceneId: string;
  batchId: string;
  imageUrls: string[];
  prompt: string;
  generationTimeMs: number;
  createdAt: number;
}

// === Review ===

export interface ApprovalDecision {
  id: string;
  resultId: string;
  imageUrl: string;
  productId: string;
  characterId: string;
  sceneId: string;
  brand: Brand;
  decision: Decision;
  rejectionReasons?: RejectionReason[];
  notes?: string;
  decidedAt: number;
}

export interface Batch {
  id: string;
  csvFilename: string;
  productCount: number;
  totalJobs: number;
  completedJobs: number;
  approvedCount: number;
  rejectedCount: number;
  status: BatchStatus;
  createdAt: number;
  completedAt?: number;
}

// === Queue ===

export interface QueueState {
  status: QueueStatus;
  jobIds: string[];
  currentIndex: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  startedAt: number | null;
  pausedAt: number | null;
  estimatedCompletionAt: number | null;
}
