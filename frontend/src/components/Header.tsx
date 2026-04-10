import { useUser, useClerk } from "@clerk/react";
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

export function Header() {
  const { user } = useUser();
  const { signOut } = useClerk();

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await signOut();
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="w-full border-b border-gray-800 bg-[#0b0f19]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* LEFT: Branding */}

          <span className="text-sm tracking-[0.35em] text-gray-400 font-medium">
            CVPILOT — AI JOB INTELLIGENCE
          </span>
       

        {/* RIGHT: Avatar + Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 focus:outline-none"
          >
            <img
              src={user?.imageUrl}
              alt="avatar"
              className="w-9 h-9 rounded-full border border-gray-700"
            />
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 mt-3 w-44 bg-[#0d111c] border border-gray-800 rounded-xl shadow-xl overflow-hidden">
              
              {/* User Info */}
              <div className="px-4 py-3 border-b border-gray-800">
                <p className="text-sm text-white font-medium">
                  {user?.firstName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.primaryEmailAddress?.emailAddress}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col">
                <Link
                  to="/profile"
                  className="px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition"
                  onClick={() => setOpen(false)}
                >
                  Profile
                </Link>

                <button
                  onClick={handleLogout}
                  className="text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800 transition"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}