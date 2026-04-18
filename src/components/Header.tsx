import { useState } from "react";
import { Link } from "react-router";
import { Wallet, Menu, X } from "lucide-react";
import { Button } from "./ui/button";
import logoImage from "../imports/LOGO.png";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="border-b border-gray-200 bg-white relative">
      <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={logoImage} alt="ZeroVerify" className="h-20" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Home
          </Link>
          <Link
            to="/mission"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Mission
          </Link>
          <Link
            to="/contact"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Contact Us
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/wallet">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Wallet className="size-4" />
              My Wallet
            </Button>
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="size-6" />
            ) : (
              <Menu className="size-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50">
          <nav className="max-w-7xl mx-auto px-8 py-4 flex flex-col gap-4">
            <Link
              to="/"
              onClick={closeMenu}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors py-2"
            >
              Home
            </Link>
            <Link
              to="/mission"
              onClick={closeMenu}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors py-2"
            >
              Mission
            </Link>
            <Link
              to="/contact"
              onClick={closeMenu}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors py-2"
            >
              Contact Us
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
