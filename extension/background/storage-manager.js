import { STORAGE_KEYS } from '../lib/constants.js';

export async function getQueue() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.QUEUE);
  return stored[STORAGE_KEYS.QUEUE] || null;
}

export async function setQueue(queue) {
  await chrome.storage.local.set({ [STORAGE_KEYS.QUEUE]: queue });
}

export async function getJob(jobId) {
  const key = `${STORAGE_KEYS.JOB_PREFIX}${jobId}`;
  const stored = await chrome.storage.local.get(key);
  return stored[key] || null;
}

export async function setJob(jobId, job) {
  const key = `${STORAGE_KEYS.JOB_PREFIX}${jobId}`;
  await chrome.storage.local.set({ [key]: job });
}

export async function appendResults(newResults) {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.RESULTS);
  const existing = stored[STORAGE_KEYS.RESULTS] || [];
  const updated = [...existing, ...newResults];
  await chrome.storage.local.set({ [STORAGE_KEYS.RESULTS]: updated });
}

export async function writeHeartbeat() {
  await chrome.storage.local.set({
    [STORAGE_KEYS.HEARTBEAT]: { ts: Date.now() },
  });
}
