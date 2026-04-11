import { Routes, Route, Navigate } from "react-router-dom";
import { WalletProvider } from "./context/WalletProvider";
import { Callback } from "./pages/Callback";
import { WalletHome } from "./pages/WalletHome";
import { Prove } from "./pages/Prove";

function App() {
  return (
    <WalletProvider>
      <Routes>
        <Route path="/" element={<WalletHome />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/prove" element={<Prove />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </WalletProvider>
  );
}

export default App;
