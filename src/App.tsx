import { Route, Routes } from "react-router";
import { AppLayout } from "./components/layout/AppLayout";
import { HomePage } from "./pages/HomePage";
import { ExplorePage } from "./pages/ExplorePage";
import { LibraryPage } from "./pages/LibraryPage";
import { DiaryPage } from "./pages/DiaryPage";
import { ProfilePage } from "./pages/ProfilePage";
import { GameDetailsPage } from "./pages/GameDetailsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="diary" element={<DiaryPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="games/:id" element={<GameDetailsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
