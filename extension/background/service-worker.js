import { writeHeartbeat, getQueue } from './storage-manager.js';
import { processNext } from './queue-manager.js';

const HEARTBEAT_ALARM = 'hb-heartbeat';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[HiggsBot] Extension installed');
  chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 0.1 });
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('[HiggsBot] Extension startup');
  chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 0.1 });
  const queue = await getQueue();
  if (queue && queue.status === 'running') {
    console.log('[HiggsBot] Resuming interrupted queue');
    processNext();
  }
});

// Kick off processing as soon as dashboard submits a queue
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (!changes.hb_queue) return;
  const newQueue = changes.hb_queue.newValue;
  const oldQueue = changes.hb_queue.oldValue;
  // Only trigger on transition to 'running' (not on every update)
  if (newQueue?.status === 'running' && oldQueue?.status !== 'running') {
    console.log('[HiggsBot] Queue started, kicking off first job');
    processNext();
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === HEARTBEAT_ALARM) {
    writeHeartbeat();
  }
});
