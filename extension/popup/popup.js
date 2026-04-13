import { STORAGE_KEYS } from '../lib/constants.js';

const dot = document.getElementById('dot');
const statusText = document.getElementById('statusText');
const progress = document.getElementById('progress');
const currentJob = document.getElementById('currentJob');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');

async function update() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.QUEUE);
  const queue = stored[STORAGE_KEYS.QUEUE];

  if (!queue) {
    dot.className = 'dot idle';
    statusText.textContent = 'Idle';
    progress.textContent = 'No active queue';
    pauseBtn.style.display = 'none';
    resumeBtn.style.display = 'none';
    return;
  }

  dot.className = `dot ${queue.status}`;
  statusText.textContent = queue.status.charAt(0).toUpperCase() + queue.status.slice(1);
  progress.textContent = `${queue.completedJobs}/${queue.totalJobs} complete, ${queue.failedJobs} failed`;

  if (queue.status === 'running' && queue.currentIndex < queue.jobIds.length) {
    const jobKey = `${STORAGE_KEYS.JOB_PREFIX}${queue.jobIds[queue.currentIndex]}`;
    const jobData = await chrome.storage.local.get(jobKey);
    const job = jobData[jobKey];
    if (job) {
      currentJob.textContent = `Current: ${job.characterName || 'Unknown'} / ${job.sceneId || 'Unknown'}`;
    }
  } else {
    currentJob.textContent = '';
  }

  pauseBtn.style.display = queue.status === 'running' ? '' : 'none';
  resumeBtn.style.display = queue.status === 'paused' ? '' : 'none';
}

pauseBtn.addEventListener('click', async () => {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.QUEUE);
  const queue = stored[STORAGE_KEYS.QUEUE];
  if (queue) {
    queue.status = 'paused';
    queue.pausedAt = Date.now();
    await chrome.storage.local.set({ [STORAGE_KEYS.QUEUE]: queue });
    update();
  }
});

resumeBtn.addEventListener('click', async () => {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.QUEUE);
  const queue = stored[STORAGE_KEYS.QUEUE];
  if (queue) {
    queue.status = 'running';
    queue.pausedAt = null;
    await chrome.storage.local.set({ [STORAGE_KEYS.QUEUE]: queue });
    update();
  }
});

update();
setInterval(update, 2000);
