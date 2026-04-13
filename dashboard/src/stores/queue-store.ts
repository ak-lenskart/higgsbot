import { create } from 'zustand';
import type { GenerationJob, QueueState } from '../types/models';

interface QueueStore {
  queue: QueueState;
  jobs: GenerationJob[];
  setQueue: (queue: QueueState) => void;
  setJobs: (jobs: GenerationJob[]) => void;
  updateJob: (id: string, data: Partial<GenerationJob>) => void;
}

const initialQueue: QueueState = {
  status: 'idle',
  jobIds: [],
  currentIndex: 0,
  totalJobs: 0,
  completedJobs: 0,
  failedJobs: 0,
  startedAt: null,
  pausedAt: null,
  estimatedCompletionAt: null,
};

export const useQueueStore = create<QueueStore>((set) => ({
  queue: initialQueue,
  jobs: [],

  setQueue: (queue) => set({ queue }),

  setJobs: (jobs) => set({ jobs }),

  updateJob: (id, data) =>
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...data } : j)),
    })),
}));
