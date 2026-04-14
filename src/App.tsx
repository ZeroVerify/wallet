import { RouterProvider, createBrowserRouter, Navigate } from "react-router";
import { Landing } from "./pages/Landing";
import { WalletHome } from "./pages/WalletHome";
import { Callback } from "./pages/Callback";
import { Prove } from "./pages/Prove";
import { Mission } from "./pages/Mission";
import { ContactUs } from "./pages/ContactUs";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Layout>
        <Landing />
      </Layout>
    ),
  },
  {
    path: "/wallet",
    element: (
      <Layout>
        <WalletHome />
      </Layout>
    ),
  },
  {
    path: "/callback",
    element: (
      <Layout>
        <Callback />
      </Layout>
    ),
  },
  {
    path: "/prove",
    element: (
      <Layout>
        <Prove />
      </Layout>
    ),
  },
  {
    path: "/mission",
    element: (
      <Layout>
        <Mission />
      </Layout>
    ),
  },
  {
    path: "/contact",
    element: (
      <Layout>
        <ContactUs />
      </Layout>
    ),
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
