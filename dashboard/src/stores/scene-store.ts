import { create } from 'zustand';
import type { Scene } from '../types/models';
import { getDB } from '../db';
import { createDefaultScenes } from '../data/default-scenes';

interface SceneStore {
  scenes: Scene[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (scene: Scene) => Promise<void>;
  update: (id: string, data: Partial<Scene>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  getActive: () => Scene[];
  seedDefaults: () => Promise<void>;
}

let loadPromise: Promise<void> | null = null;

export const useSceneStore = create<SceneStore>((set, get) => ({
  scenes: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    if (!loadPromise) {
      loadPromise = (async () => {
        const db = await getDB();
        let scenes = await db.getAll('scenes');
        if (scenes.length === 0) {
          await get().seedDefaults();
          scenes = await db.getAll('scenes');
        }
        set({ scenes, loaded: true });
      })();
    }
    await loadPromise;
  },

  seedDefaults: async () => {
    const db = await getDB();
    const defaults = createDefaultScenes();
    const tx = db.transaction('scenes', 'readwrite');
    for (const scene of defaults) {
      tx.store.put(scene);
    }
    await tx.done;
  },

  add: async (scene) => {
    const db = await getDB();
    await db.put('scenes', scene);
    set((s) => ({ scenes: [...s.scenes, scene] }));
  },

  update: async (id, data) => {
    const db = await getDB();
    const existing = await db.get('scenes', id);
    if (!existing) return;
    const updated = { ...existing, ...data };
    await db.put('scenes', updated);
    set((s) => ({
      scenes: s.scenes.map((sc) => (sc.id === id ? updated : sc)),
    }));
  },

  remove: async (id) => {
    const db = await getDB();
    await db.delete('scenes', id);
    set((s) => ({ scenes: s.scenes.filter((sc) => sc.id !== id) }));
  },

  getActive: () => get().scenes.filter((s) => s.active),
}));
