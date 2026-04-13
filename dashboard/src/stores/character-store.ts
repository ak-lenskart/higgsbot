import { create } from 'zustand';
import type { Character } from '../types/models';
import { getDB } from '../db';

interface CharacterStore {
  characters: Character[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (character: Character) => Promise<void>;
  update: (id: string, data: Partial<Character>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  getActive: () => Character[];
}

export const useCharacterStore = create<CharacterStore>((set, get) => ({
  characters: [],
  loaded: false,

  load: async () => {
    const db = await getDB();
    const characters = await db.getAll('characters');
    set({ characters, loaded: true });
  },

  add: async (character) => {
    const db = await getDB();
    await db.put('characters', character);
    set((s) => ({ characters: [...s.characters, character] }));
  },

  update: async (id, data) => {
    const db = await getDB();
    const existing = await db.get('characters', id);
    if (!existing) return;
    const updated = { ...existing, ...data };
    await db.put('characters', updated);
    set((s) => ({
      characters: s.characters.map((c) => (c.id === id ? updated : c)),
    }));
  },

  remove: async (id) => {
    const db = await getDB();
    await db.delete('characters', id);
    set((s) => ({ characters: s.characters.filter((c) => c.id !== id) }));
  },

  getActive: () => get().characters.filter((c) => c.active),
}));
