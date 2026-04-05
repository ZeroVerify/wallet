import { Routes, Route, Navigate } from "react-router-dom";
import { Callback } from "./pages/Callback";
import { WalletHome } from "./pages/WalletHome";

function App() {
  return (
    <Routes>
      <Route path="/" element={<WalletHome />} />
      <Route path="/callback" element={<Callback />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
