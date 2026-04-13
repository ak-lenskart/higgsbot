import { getQueue, setQueue, getJob, setJob, appendResults } from './storage-manager.js';
import { MESSAGE_TYPES, DEFAULTS } from '../lib/constants.js';

const ALARM_NEXT_JOB = 'hb-next-job';

export async function processNext() {
  const queue = await getQueue();
  if (!queue || queue.status !== 'running') return;

  // Find next queued job
  let nextIndex = queue.currentIndex;
  let job = null;

  while (nextIndex < queue.jobIds.length) {
    const candidate = await getJob(queue.jobIds[nextIndex]);
    if (candidate && candidate.status === 'queued') {
      job = candidate;
      break;
    }
    nextIndex++;
  }

  if (!job) {
    // All done
    queue.status = 'idle';
    await setQueue(queue);
    return;
  }

  queue.currentIndex = nextIndex;
  await setQueue(queue);

  // Mark job as running
  job.status = 'running';
  job.startedAt = Date.now();
  await setJob(job.id, job);

  // Find or open Higgsfield tab
  const tab = await ensureHiggsfieldTab();
  if (!tab) {
    job.status = 'failed';
    job.errorType = 'unknown';
    job.errorMessage = 'Could not open Higgsfield tab';
    await setJob(job.id, job);
    queue.failedJobs++;
    queue.currentIndex = nextIndex + 1;
    await setQueue(queue);
    scheduleNextJob();
    return;
  }

  // Execute generation via content script
  try {
    const result = await chrome.tabs.sendMessage(tab.id, {
      type: MESSAGE_TYPES.EXECUTE_GENERATION,
      job: {
        ...job,
        characterName: job.characterName || '',
      },
    });

    if (result.success) {
      job.status = 'success';
      job.completedAt = Date.now();
      await setJob(job.id, job);

      // Save results
      await appendResults([{
        id: crypto.randomUUID(),
        jobId: job.id,
        productId: job.productId,
        characterId: job.characterId,
        sceneId: job.sceneId,
        batchId: job.batchId,
        imageUrls: result.imageUrls,
        prompt: job.prompt,
        generationTimeMs: result.generationTimeMs,
        createdAt: Date.now(),
      }]);

      queue.completedJobs++;
    } else {
      job.retryCount = (job.retryCount || 0) + 1;

      if (result.errorType === 'session_expired' || result.errorType === 'selector_not_found') {
        // Don't retry — pause the whole queue
        job.status = 'failed';
        job.errorType = result.errorType;
        job.errorMessage = result.error;
        await setJob(job.id, job);
        queue.status = 'paused';
        queue.failedJobs++;
        await setQueue(queue);
        return;
      }

      if (job.retryCount >= (job.maxRetries || DEFAULTS.MAX_RETRIES)) {
        job.status = 'failed';
        job.errorType = result.errorType;
        job.errorMessage = result.error;
        queue.failedJobs++;
      } else {
        job.status = 'queued'; // Will retry
      }
      await setJob(job.id, job);
    }
  } catch (err) {
    job.retryCount = (job.retryCount || 0) + 1;
    if (job.retryCount >= (job.maxRetries || DEFAULTS.MAX_RETRIES)) {
      job.status = 'failed';
      job.errorType = 'unknown';
      job.errorMessage = err.message;
      queue.failedJobs++;
    } else {
      job.status = 'queued';
    }
    await setJob(job.id, job);
  }

  queue.currentIndex = nextIndex + 1;

  // Calculate ETA
  const elapsed = Date.now() - queue.startedAt;
  const remaining = queue.totalJobs - queue.completedJobs - queue.failedJobs;
  const avgPerJob = queue.completedJobs > 0 ? elapsed / queue.completedJobs : DEFAULTS.GENERATION_GAP_MS + 30000;
  queue.estimatedCompletionAt = Date.now() + remaining * avgPerJob;

  await setQueue(queue);
  scheduleNextJob();
}

function scheduleNextJob() {
  const gapMs = DEFAULTS.GENERATION_GAP_MS + Math.random() * DEFAULTS.GENERATION_JITTER_MS;
  chrome.alarms.create(ALARM_NEXT_JOB, { delayInMinutes: gapMs / 60000 });
}

async function waitForTabLoad(tabId, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const listener = (id, info) => {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(() => { chrome.tabs.onUpdated.removeListener(listener); resolve(); }, timeoutMs);
  });
}

async function ensureHiggsfieldTab() {
  const SOUL_URL = 'https://higgsfield.ai/image/soul';

  // Look for existing Higgsfield tab already on the soul page
  const existing = await chrome.tabs.query({ url: ['https://higgsfield.ai/*', 'https://www.higgsfield.ai/*'] });
  if (existing.length > 0) {
    const tab = existing[0];
    await chrome.tabs.update(tab.id, { active: true });
    // Navigate to soul page if not already there
    if (!tab.url.includes('/image/soul')) {
      await chrome.tabs.update(tab.id, { url: SOUL_URL });
      await waitForTabLoad(tab.id);
      await new Promise((r) => setTimeout(r, 3000));
    }
    return tab;
  }

  // Open new tab directly on soul page
  const tab = await chrome.tabs.create({ url: SOUL_URL, active: true });
  await waitForTabLoad(tab.id);
  await new Promise((r) => setTimeout(r, 4000)); // Wait for React to hydrate
  return tab;
}

// Handle alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NEXT_JOB) {
    processNext();
  }
});
