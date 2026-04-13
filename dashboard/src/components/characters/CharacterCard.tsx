import type { Character } from '../../types/models';

interface Props {
  character: Character;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

export function CharacterCard({ character, onEdit, onDelete, onToggleActive }: Props) {
  return (
    <div className={`bg-white rounded-lg border p-4 ${character.active ? 'border-border' : 'border-border opacity-60'}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-gray-900 text-sm">{character.name}</h4>
          <p className="text-xs text-muted">{character.higgsName}</p>
        </div>
        <button
          onClick={onToggleActive}
          className={`w-8 h-5 rounded-full transition-colors relative ${character.active ? 'bg-success' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${character.active ? 'left-3.5' : 'left-0.5'}`} />
        </button>
      </div>

      <div className="space-y-1 text-xs text-muted mb-3">
        <p>{character.gender} / {character.ageRange} / {character.style}</p>
        <p>Skin: {character.skinTone}</p>
        {character.approvalRate !== null && (
          <p>Approval: {Math.round(character.approvalRate * 100)}%</p>
        )}
        <p>{character.totalGenerations} generations</p>
      </div>

      <div className="flex gap-2">
        <button onClick={onEdit} className="text-xs text-primary hover:underline">Edit</button>
        <button onClick={onDelete} className="text-xs text-danger hover:underline">Delete</button>
      </div>
    </div>
  );
}
