import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { UploadPage } from './pages/UploadPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { PromptsPage } from './pages/PromptsPage';
import { QueuePage } from './pages/QueuePage';
import { ReviewPage } from './pages/ReviewPage';
import { CharactersPage } from './pages/CharactersPage';
import { ScenesPage } from './pages/ScenesPage';
import { SettingsPage } from './pages/SettingsPage';
import { useCharacterStore } from './stores/character-store';
import { useSceneStore } from './stores/scene-store';
import { useProductStore } from './stores/product-store';
import { useReviewStore } from './stores/review-store';
import { useSettingsStore } from './stores/settings-store';

function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-surface">
        <Routes>
          <Route path="/" element={<Navigate to="/upload" replace />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/prompts" element={<PromptsPage />} />
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/characters" element={<CharactersPage />} />
          <Route path="/scenes" element={<ScenesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const loadCharacters = useCharacterStore((s) => s.load);
  const loadScenes = useSceneStore((s) => s.load);
  const loadProducts = useProductStore((s) => s.load);
  const loadReview = useReviewStore((s) => s.load);
  const loadSettings = useSettingsStore((s) => s.load);

  useEffect(() => {
    loadCharacters();
    loadScenes();
    loadProducts();
    loadReview();
    loadSettings();
  }, [loadCharacters, loadScenes, loadProducts, loadReview, loadSettings]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  );
}
