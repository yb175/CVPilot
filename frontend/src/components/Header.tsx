import { useUser, useClerk } from "@clerk/react";
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/Button";
import LogoSvg from "../assets/logo1.svg";

export function Header() {
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
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
    <header className="sticky top-0 z-50 w-full border-b border-border-normal bg-bg-secondary/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        {/* LEFT: Logo + Branding */}
        <Link
          to="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80 active:scale-95 flex-shrink-0"
        >
          <img
            src={LogoSvg}
            alt="CVPilot Logo"
            className="h-8 sm:h-10 w-auto"
          />
          <span className="hidden sm:block text-base sm:text-lg font-bold text-text-primary font-display">CVpilot</span>
        </Link>

        {/* CENTER: Navigation (only for logged-in) */}
        {isSignedIn && (
          <nav className="hidden md:flex items-center gap-8 flex-1 justify-center">
            <Link
              to="/jobs"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Find Jobs
            </Link>
            <Link
              to="/profile"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Profile
            </Link>
          </nav>
        )}

        {/* RIGHT: Auth Actions or User Menu */}
        <div className="flex items-center gap-3 sm:gap-4">
          {!isSignedIn ? (
            // Anonymous users: Show login/signup buttons
            <div className="flex items-center gap-2">
              <Button
                onClick={() => navigate("/sign-in")}
                variant="ghost"
                size="md"
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate("/sign-up")}
                variant="primary"
                size="md"
              >
                Sign Up
              </Button>
            </div>
          ) : (
            // Logged-in users: Show user menu
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 focus:outline-none transition-opacity hover:opacity-80 p-1.5"
                title="User menu"
              >
                <img
                  src={user?.imageUrl}
                  alt="avatar"
                  className="w-8 h-8 rounded-full border border-border-normal"
                />
                <span className="text-sm font-medium text-text-secondary hidden sm:inline truncate max-w-[120px]">
                  {user?.firstName}
                </span>
              </button>

              {/* User Dropdown Menu */}
              {open && (
                <div className="absolute right-0 mt-2 w-48 bg-bg-surface border border-border-normal rounded-lg shadow-lg overflow-hidden animate-fade-in">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-border-light">
                    <p className="text-sm font-semibold text-text-primary">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-text-tertiary truncate mt-1">
                      {user?.primaryEmailAddress?.emailAddress}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <nav className="flex flex-col">
                    <Link
                      to="/jobs"
                      className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors md:hidden"
                      onClick={() => setOpen(false)}
                    >
                      Find Jobs
                    </Link>
                    <Link
                      to="/profile"
                      className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors md:hidden"
                      onClick={() => setOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      to="/saved"
                      className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors flex items-center justify-between"
                      onClick={() => setOpen(false)}
                    >
                      <span>Saved Jobs</span>
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setOpen(false);
                      }}
                      className="text-left px-4 py-2 text-sm text-status-danger hover:bg-status-danger/10 transition-colors"
                    >
                      Sign Out
                    </button>
                  </nav>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}