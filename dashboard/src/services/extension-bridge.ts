import type { GenerationJob, QueueState, GenerationResult } from '../types/models';

type StateCallback = (data: {
  queue: QueueState | null;
  recentResults: GenerationResult[];
  heartbeat: number;
}) => void;

let stateCallback: StateCallback | null = null;

// Listen for messages from the extension bridge content script
if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.type === 'HIGGSBOT_STATE_SYNC' && stateCallback) {
      stateCallback(event.data.payload);
    }
  });
}

export function onStateSync(callback: StateCallback) {
  stateCallback = callback;
}

export function submitQueue(jobs: GenerationJob[], append = false) {
  window.postMessage({
    type: 'HIGGSBOT_QUEUE_SUBMIT',
    payload: { jobs, append },
  }, '*');
}

export function controlQueue(action: 'pause' | 'resume' | 'cancel' | 'retry_failed') {
  window.postMessage({
    type: 'HIGGSBOT_QUEUE_CONTROL',
    payload: { action },
  }, '*');
}

export function pingExtension(): Promise<boolean> {
  return new Promise((resolve) => {
    window.postMessage({ type: 'HIGGSBOT_PING' }, '*');

    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve(false);
    }, 2000);

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'HIGGSBOT_PONG') {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        resolve(true);
      }
    };

    window.addEventListener('message', handler);
  });
}
