import { useEffect } from 'react';
import { useQueueStore } from '../stores/queue-store';
import { useReviewStore } from '../stores/review-store';
import { onStateSync } from '../services/extension-bridge';

export function useQueueSync() {
  const setQueue = useQueueStore((s) => s.setQueue);
  const addResults = useReviewStore((s) => s.addResults);

  useEffect(() => {
    onStateSync((data) => {
      if (data.queue) {
        setQueue(data.queue);
      }
      if (data.recentResults?.length > 0) {
        addResults(data.recentResults);
      }
    });
  }, [setQueue, addResults]);
}
