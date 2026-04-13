// Content script injected into the HiggsBot dashboard (localhost:5173 or higgsbot.vercel.app)
// Bridges window.postMessage <-> chrome.storage.local

import { STORAGE_KEYS, MESSAGE_TYPES, DEFAULTS } from '../lib/constants.js';

// Listen for messages from the dashboard page
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  const { type, payload } = event.data || {};

  switch (type) {
    case MESSAGE_TYPES.PING:
      window.postMessage({ type: MESSAGE_TYPES.PONG }, '*');
      break;

    case MESSAGE_TYPES.QUEUE_SUBMIT:
      await handleQueueSubmit(payload);
      break;

    case MESSAGE_TYPES.QUEUE_CONTROL:
      await handleQueueControl(payload);
      break;
  }
});

async function handleQueueSubmit(payload) {
  const { jobs, append } = payload;

  // Write individual jobs
  const jobEntries = {};
  for (const job of jobs) {
    jobEntries[`${STORAGE_KEYS.JOB_PREFIX}${job.id}`] = job;
  }
  await chrome.storage.local.set(jobEntries);

  // Update queue state
  if (append) {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.QUEUE);
    const existing = stored[STORAGE_KEYS.QUEUE] || { status: 'idle', jobIds: [], currentIndex: 0, totalJobs: 0, completedJobs: 0, failedJobs: 0, startedAt: null, pausedAt: null, estimatedCompletionAt: null };
    existing.jobIds.push(...jobs.map((j) => j.id));
    existing.totalJobs = existing.jobIds.length;
    await chrome.storage.local.set({ [STORAGE_KEYS.QUEUE]: existing });
  } else {
    const queueState = {
      status: 'running',
      jobIds: jobs.map((j) => j.id),
      currentIndex: 0,
      totalJobs: jobs.length,
      completedJobs: 0,
      failedJobs: 0,
      startedAt: Date.now(),
      pausedAt: null,
      estimatedCompletionAt: null,
    };
    await chrome.storage.local.set({ [STORAGE_KEYS.QUEUE]: queueState });
  }
}

async function handleQueueControl(payload) {
  const { action } = payload;
  const stored = await chrome.storage.local.get(STORAGE_KEYS.QUEUE);
  const queue = stored[STORAGE_KEYS.QUEUE];
  if (!queue) return;

  switch (action) {
    case 'pause':
      queue.status = 'paused';
      queue.pausedAt = Date.now();
      break;
    case 'resume':
      queue.status = 'running';
      queue.pausedAt = null;
      break;
    case 'cancel':
      queue.status = 'idle';
      break;
    case 'retry_failed':
      // Reset failed jobs to queued
      for (const jobId of queue.jobIds) {
        const key = `${STORAGE_KEYS.JOB_PREFIX}${jobId}`;
        const jobData = await chrome.storage.local.get(key);
        const job = jobData[key];
        if (job && job.status === 'failed') {
          job.status = 'queued';
          job.retryCount = 0;
          await chrome.storage.local.set({ [key]: job });
        }
      }
      queue.status = 'running';
      queue.failedJobs = 0;
      break;
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.QUEUE]: queue });
}

// Poll chrome.storage and relay state to dashboard
setInterval(async () => {
  try {
    const stored = await chrome.storage.local.get([
      STORAGE_KEYS.QUEUE,
      STORAGE_KEYS.RESULTS,
      STORAGE_KEYS.HEARTBEAT,
    ]);

    window.postMessage({
      type: MESSAGE_TYPES.STATE_SYNC,
      payload: {
        queue: stored[STORAGE_KEYS.QUEUE] || null,
        recentResults: stored[STORAGE_KEYS.RESULTS] || [],
        heartbeat: stored[STORAGE_KEYS.HEARTBEAT]?.ts || 0,
      },
    }, '*');
  } catch {
    // Extension context may be invalid
  }
}, DEFAULTS.DASHBOARD_SYNC_INTERVAL_MS);
