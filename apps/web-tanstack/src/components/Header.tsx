import { Link } from "@tanstack/react-router";
import { Home, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <header className="flex items-center bg-gray-800 p-4 text-white shadow-lg">
        <button
          aria-label="Open menu"
          className="rounded-lg p-2 transition-colors hover:bg-gray-700"
          onClick={() => setIsOpen(true)}
        >
          <Menu size={24} />
        </button>
        <h1 className="ml-4 font-semibold text-xl">
          <Link to="/">
            <img
              alt="TanStack Logo"
              className="h-10"
              src="/tanstack-word-logo-white.svg"
            />
          </Link>
        </h1>
      </header>

      <aside
        className={`fixed top-0 left-0 z-50 flex h-full w-80 transform flex-col bg-gray-900 text-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-gray-700 border-b p-4">
          <h2 className="font-bold text-xl">Navigation</h2>
          <button
            aria-label="Close menu"
            className="rounded-lg p-2 transition-colors hover:bg-gray-800"
            onClick={() => setIsOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <Link
            activeProps={{
              className:
                "flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2",
            }}
            className="mb-2 flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-gray-800"
            onClick={() => setIsOpen(false)}
            to="/"
          >
            <Home size={20} />
            <span className="font-medium">Home</span>
          </Link>

          {/* Demo Links Start */}

          {/* Demo Links End */}
        </nav>
      </aside>
    </>
  );
}
