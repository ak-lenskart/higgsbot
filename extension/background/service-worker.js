import { writeHeartbeat, getQueue } from './storage-manager.js';
import { processNext } from './queue-manager.js';

const HEARTBEAT_ALARM = 'hb-heartbeat';

// On install/startup
chrome.runtime.onInstalled.addListener(() => {
  console.log('[HiggsBot] Extension installed');
  chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 0.1 }); // ~6s
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('[HiggsBot] Extension startup');
  chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: 0.1 });

  // Check if queue was interrupted
  const queue = await getQueue();
  if (queue && queue.status === 'running') {
    console.log('[HiggsBot] Resuming interrupted queue');
    processNext();
  }
});

// Heartbeat alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === HEARTBEAT_ALARM) {
    writeHeartbeat();
  }
  // queue-manager.js also listens for its own alarms
});
