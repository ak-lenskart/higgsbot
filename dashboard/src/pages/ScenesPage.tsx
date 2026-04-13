import { useState } from 'react';
import { useSceneStore } from '../stores/scene-store';
import { SceneCard } from '../components/scenes/SceneCard';
import { SceneForm } from '../components/scenes/SceneForm';
import type { Scene } from '../types/models';
import { v4 as uuid } from 'uuid';

export function ScenesPage() {
  const { scenes, add, update, remove } = useSceneStore();
  const [editing, setEditing] = useState<Scene | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleSave = async (data: Omit<Scene, 'id' | 'createdAt' | 'totalGenerations' | 'approvalRate'>) => {
    if (editing) {
      await update(editing.id, data);
    } else {
      await add({
        ...data,
        id: uuid(),
        totalGenerations: 0,
        approvalRate: null,
        createdAt: Date.now(),
      });
    }
    setEditing(null);
    setShowForm(false);
  };

  const activeCount = scenes.filter((s) => s.active).length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Scenes</h2>
          <p className="text-sm text-muted mt-1">
            {scenes.length} total, {activeCount} active
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          Add Scene
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">
            {editing ? 'Edit Scene' : 'New Scene'}
          </h3>
          <SceneForm
            initial={editing || undefined}
            onSave={handleSave}
            onCancel={() => { setEditing(null); setShowForm(false); }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {scenes.map((s) => (
          <SceneCard
            key={s.id}
            scene={s}
            onEdit={() => { setEditing(s); setShowForm(true); }}
            onDelete={() => { if (confirm('Delete this scene?')) remove(s.id); }}
            onToggleActive={() => update(s.id, { active: !s.active })}
          />
        ))}
      </div>
    </div>
  );
}
