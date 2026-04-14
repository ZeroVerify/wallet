import { Link } from "react-router";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>© 2026 ZeroVerify. Privacy-first student verification.</p>
          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-gray-900 transition-colors">
              Home
            </Link>
            <Link
              to="/mission"
              className="hover:text-gray-900 transition-colors"
            >
              Mission
            </Link>
            <Link
              to="/contact"
              className="hover:text-gray-900 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
