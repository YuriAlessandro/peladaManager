import { Route, Routes } from "react-router";
import Home from "./pages/home/home";
import CreateGameDay from "./pages/create-game-day/create-game-day";
import GameDay from "./pages/game-day/game-day";
import History from "./pages/history/history";
import Layout from "./pages/layout";
import HistoryMatch from "./pages/history/history-match";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="criar-pelada" element={<CreateGameDay />} />
        <Route path="pelada" element={<GameDay />} />
        <Route path="historico">
            <Route index element={<History />} />
            <Route path=":id" element={<HistoryMatch />} />
          </Route>
      </Route>
    </Routes>
  );
}

export default App;
