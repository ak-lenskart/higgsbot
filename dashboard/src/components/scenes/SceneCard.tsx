import type { Scene } from '../../types/models';

interface Props {
  scene: Scene;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

export function SceneCard({ scene, onEdit, onDelete, onToggleActive }: Props) {
  return (
    <div className={`bg-white rounded-lg border p-4 ${scene.active ? 'border-border' : 'border-border opacity-60'}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-gray-900 text-sm">{scene.name}</h4>
          <span className="inline-block mt-0.5 px-1.5 py-0.5 text-xs rounded bg-gray-100 text-muted">{scene.category}</span>
        </div>
        <button
          onClick={onToggleActive}
          className={`w-8 h-5 rounded-full transition-colors relative ${scene.active ? 'bg-success' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${scene.active ? 'left-3.5' : 'left-0.5'}`} />
        </button>
      </div>

      <p className="text-xs text-muted mb-2 line-clamp-2">{scene.description}</p>

      {scene.approvalRate !== null && (
        <p className="text-xs text-muted mb-2">Approval: {Math.round(scene.approvalRate * 100)}%</p>
      )}

      <div className="flex gap-2">
        <button onClick={onEdit} className="text-xs text-primary hover:underline">Edit</button>
        <button onClick={onDelete} className="text-xs text-danger hover:underline">Delete</button>
      </div>
    </div>
  );
}
