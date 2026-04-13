import { useQueueStore } from '../stores/queue-store';
import { useQueueSync } from '../hooks/useQueueSync';
import { controlQueue } from '../services/extension-bridge';
import { useExtensionStatus } from '../hooks/useExtensionStatus';

export function QueuePage() {
  useQueueSync();
  const { queue, jobs } = useQueueStore();
  const { connected } = useExtensionStatus();

  const elapsed = queue.startedAt ? Date.now() - queue.startedAt : 0;
  const eta = queue.estimatedCompletionAt ? Math.max(0, queue.estimatedCompletionAt - Date.now()) : 0;

  const formatTime = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Generation Queue</h2>
          <p className="text-sm text-muted mt-1">
            {queue.status === 'idle' ? 'No active queue' : `Status: ${queue.status}`}
          </p>
        </div>
      </div>

      {!connected && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          Extension not connected. Install and enable the HiggsBot extension to run the queue.
        </div>
      )}

      {/* Progress */}
      {queue.totalJobs > 0 && (
        <div className="bg-white rounded-lg border border-border p-4 mb-4">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-gray-700">
              {queue.completedJobs}/{queue.totalJobs} complete
              {queue.failedJobs > 0 && <span className="text-danger ml-2">{queue.failedJobs} failed</span>}
            </span>
            <span className="text-muted text-xs">
              {queue.status === 'running' && `Elapsed: ${formatTime(elapsed)} / ETA: ${formatTime(eta)}`}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full transition-all bg-primary"
              style={{ width: `${queue.totalJobs > 0 ? (queue.completedJobs / queue.totalJobs) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2 mb-6">
        {queue.status === 'running' && (
          <button onClick={() => controlQueue('pause')} className="px-4 py-2 bg-warning text-white rounded-md text-sm hover:opacity-90">
            Pause
          </button>
        )}
        {queue.status === 'paused' && (
          <button onClick={() => controlQueue('resume')} className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-hover">
            Resume
          </button>
        )}
        {(queue.status === 'running' || queue.status === 'paused') && (
          <button onClick={() => controlQueue('cancel')} className="px-4 py-2 border border-border rounded-md text-sm text-gray-600 hover:bg-surface-hover">
            Cancel
          </button>
        )}
        {queue.failedJobs > 0 && (
          <button onClick={() => controlQueue('retry_failed')} className="px-4 py-2 border border-danger text-danger rounded-md text-sm hover:bg-red-50">
            Retry Failed ({queue.failedJobs})
          </button>
        )}
      </div>

      {/* Job list */}
      <div className="space-y-1">
        {jobs.map((job) => (
          <div key={job.id} className="bg-white border border-border rounded px-3 py-2 flex items-center gap-3 text-xs">
            <span className={`w-2 h-2 rounded-full ${
              job.status === 'success' ? 'bg-success' :
              job.status === 'running' ? 'bg-primary' :
              job.status === 'failed' ? 'bg-danger' :
              job.status === 'cancelled' ? 'bg-gray-400' :
              'bg-gray-300'
            }`} />
            <span className="font-mono text-gray-900 w-24 truncate">{job.productId}</span>
            <span className="text-gray-600 w-24 truncate">{job.characterId}</span>
            <span className="text-gray-600 w-24 truncate">{job.sceneId}</span>
            <span className="ml-auto text-muted">
              {job.status}
              {job.retryCount > 0 && ` (retry ${job.retryCount})`}
            </span>
            {job.errorMessage && <span className="text-danger truncate max-w-[200px]">{job.errorMessage}</span>}
          </div>
        ))}
      </div>

      {jobs.length === 0 && queue.status === 'idle' && (
        <div className="text-center py-12 text-muted text-sm">
          No jobs in queue. Generate prompts and send them here.
        </div>
      )}
    </div>
  );
}
