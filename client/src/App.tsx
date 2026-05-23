import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import HomePage from "./pages/HomePage";
import HatchesPage from "./pages/HatchesPage";
import HatchFormPage from "./pages/HatchFormPage";
import HatchDetailPage from "./pages/HatchDetailPage";
import HatchEggDetailPage from "./pages/HatchEggDetailPage";
import RegisterChickPage from "./pages/RegisterChickPage";
import ChickensPage from "./pages/ChickensPage";
import ChickenFormPage from "./pages/ChickenFormPage";
import ChickenDetailPage from "./pages/ChickenDetailPage";
import EggsPage from "./pages/EggsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/hatch" element={<HatchesPage />} />
        <Route path="/hatch/new" element={<HatchFormPage />} />
        <Route path="/hatch/:id" element={<HatchDetailPage />} />
        <Route path="/hatch/:hatchId/egg/:eggId" element={<HatchEggDetailPage />} />
        <Route path="/hatch/:hatchId/egg/:eggId/register" element={<RegisterChickPage />} />
        <Route path="/birds" element={<ChickensPage />} />
        <Route path="/birds/new" element={<ChickenFormPage />} />
        <Route path="/birds/:id" element={<ChickenDetailPage />} />
        <Route path="/birds/:id/edit" element={<ChickenFormPage />} />
        <Route path="/eggs" element={<EggsPage />} />
      </Route>
    </Routes>
  );
}
