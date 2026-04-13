import { useState } from 'react';
import type { Scene, SceneCategory } from '../../types/models';

interface Props {
  initial?: Scene;
  onSave: (data: Omit<Scene, 'id' | 'createdAt' | 'totalGenerations' | 'approvalRate'>) => void;
  onCancel: () => void;
}

const CATEGORIES: SceneCategory[] = ['indoor', 'outdoor', 'urban', 'lifestyle'];

export function SceneForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [promptFragment, setPromptFragment] = useState(initial?.promptFragment ?? '');
  const [category, setCategory] = useState<SceneCategory>(initial?.category ?? 'indoor');
  const [active, setActive] = useState(initial?.active ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, description, promptFragment, category, active });
  };

  const inputClass = 'w-full px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary';
  const labelClass = 'block text-xs font-medium text-gray-700 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Name</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as SceneCategory)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the scene" />
      </div>

      <div>
        <label className={labelClass}>Prompt Fragment</label>
        <textarea
          className={`${inputClass} h-20 resize-none`}
          value={promptFragment}
          onChange={(e) => setPromptFragment(e.target.value)}
          placeholder="The text injected into the Higgsfield prompt for this scene"
        />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} id="scene-active" />
        <label htmlFor="scene-active" className="text-xs text-gray-700">Active</label>
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" className="px-4 py-1.5 bg-primary text-white rounded-md text-sm hover:bg-primary-hover">Save</button>
        <button type="button" onClick={onCancel} className="px-4 py-1.5 border border-border rounded-md text-sm text-gray-600 hover:bg-surface-hover">Cancel</button>
      </div>
    </form>
  );
}
