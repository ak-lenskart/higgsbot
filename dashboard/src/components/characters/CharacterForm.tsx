import { useState } from 'react';
import type { Character, Gender, Brand } from '../../types/models';

interface Props {
  initial?: Character;
  onSave: (data: Omit<Character, 'id' | 'createdAt' | 'totalGenerations' | 'approvalRate'>) => void;
  onCancel: () => void;
}

const GENDERS: Gender[] = ['male', 'female', 'non_binary'];
const BRANDS: Brand[] = ['vincent_chase', 'hustlr', 'lk_air', 'john_jacobs'];

export function CharacterForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [higgsName, setHiggsName] = useState(initial?.higgsName ?? '');
  const [gender, setGender] = useState<Gender>(initial?.gender ?? 'male');
  const [skinTone, setSkinTone] = useState(initial?.skinTone ?? 'fair');
  const [ageRange, setAgeRange] = useState(initial?.ageRange ?? '25-30');
  const [style, setStyle] = useState(initial?.style ?? '');
  const [brandAffinity, setBrandAffinity] = useState<Brand[]>(initial?.brandAffinity ?? []);
  const [active, setActive] = useState(initial?.active ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      higgsName: higgsName || name,
      gender,
      skinTone,
      ageRange,
      style,
      brandAffinity,
      signatureScenes: initial?.signatureScenes ?? [],
      thumbnailUrl: initial?.thumbnailUrl,
      active,
    });
  };

  const toggleBrand = (brand: Brand) => {
    setBrandAffinity((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const inputClass = 'w-full px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary';
  const labelClass = 'block text-xs font-medium text-gray-700 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Display Name</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Higgsfield Name</label>
          <input className={inputClass} value={higgsName} onChange={(e) => setHiggsName(e.target.value)} placeholder="Same as display name if blank" />
        </div>
        <div>
          <label className={labelClass}>Gender</label>
          <select className={inputClass} value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
            {GENDERS.map((g) => <option key={g} value={g}>{g.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Skin Tone</label>
          <input className={inputClass} value={skinTone} onChange={(e) => setSkinTone(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Age Range</label>
          <input className={inputClass} value={ageRange} onChange={(e) => setAgeRange(e.target.value)} placeholder="e.g. 25-30" />
        </div>
        <div>
          <label className={labelClass}>Style</label>
          <input className={inputClass} value={style} onChange={(e) => setStyle(e.target.value)} placeholder="e.g. streetwear, corporate" />
        </div>
      </div>

      <div>
        <label className={labelClass}>Brand Affinity</label>
        <div className="flex gap-2 flex-wrap">
          {BRANDS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => toggleBrand(b)}
              className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                brandAffinity.includes(b)
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-border hover:bg-surface-hover'
              }`}
            >
              {b.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} id="active" />
        <label htmlFor="active" className="text-xs text-gray-700">Active</label>
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" className="px-4 py-1.5 bg-primary text-white rounded-md text-sm hover:bg-primary-hover">
          Save
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-1.5 border border-border rounded-md text-sm text-gray-600 hover:bg-surface-hover">
          Cancel
        </button>
      </div>
    </form>
  );
}
