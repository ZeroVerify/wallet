import { Routes, Route, Navigate } from "react-router-dom";
import { WalletProvider } from "./context/WalletProvider";
import { Callback } from "./pages/Callback";
import { WalletHome } from "./pages/WalletHome";

function App() {
  return (
    <WalletProvider>
      <Routes>
        <Route path="/" element={<WalletHome />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </WalletProvider>
  );
}

export default App;
