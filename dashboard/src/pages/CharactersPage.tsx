import { useState } from 'react';
import { useCharacterStore } from '../stores/character-store';
import { CharacterCard } from '../components/characters/CharacterCard';
import { CharacterForm } from '../components/characters/CharacterForm';
import type { Character } from '../types/models';
import { v4 as uuid } from 'uuid';

export function CharactersPage() {
  const { characters, add, update, remove } = useCharacterStore();
  const [editing, setEditing] = useState<Character | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleSave = async (data: Omit<Character, 'id' | 'createdAt' | 'totalGenerations' | 'approvalRate'>) => {
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

  const handleEdit = (character: Character) => {
    setEditing(character);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this character?')) {
      await remove(id);
    }
  };

  const activeCount = characters.filter((c) => c.active).length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Characters</h2>
          <p className="text-sm text-muted mt-1">
            {characters.length} total, {activeCount} active
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          Add Character
        </button>
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">
            {editing ? 'Edit Character' : 'New Character'}
          </h3>
          <CharacterForm
            initial={editing || undefined}
            onSave={handleSave}
            onCancel={() => { setEditing(null); setShowForm(false); }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {characters.map((c) => (
          <CharacterCard
            key={c.id}
            character={c}
            onEdit={() => handleEdit(c)}
            onDelete={() => handleDelete(c.id)}
            onToggleActive={() => update(c.id, { active: !c.active })}
          />
        ))}
      </div>

      {characters.length === 0 && !showForm && (
        <div className="text-center py-12 text-muted">
          <p className="text-sm">No characters yet. Add your Higgsfield characters to get started.</p>
        </div>
      )}
    </div>
  );
}
