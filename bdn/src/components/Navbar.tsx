import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Film, Menu, X, Terminal, Server, User as UserIcon, LogIn, LogOut } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../auth';
import { Badge } from './Badge';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, login, logout } = useAuth();

  const navItems = [
    { label: 'Overview', path: '/' },
    { label: 'Movies', path: '/movies' },
    { label: 'Showtimes', path: '/showtimes' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Netflix Style Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-md bg-[#E50914] flex items-center justify-center text-white shadow-md shadow-red-950/50 group-hover:bg-red-700 transition-colors">
              <Film className="w-5 h-5 fill-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-white leading-none">
                CINEMA<span className="text-[#E50914]">SEAT</span>
              </span>
              <span className="text-[9px] text-neutral-400 tracking-widest font-mono uppercase mt-0.5">
                Official Ticketing
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-all ${
                    active
                      ? 'text-white bg-neutral-800/90 border border-neutral-700 shadow-sm font-semibold'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-850'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Header Controls (Auth) */}
          <div className="hidden sm:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-md p-1 pl-2.5 text-xs">
                <span className="text-neutral-200 font-medium text-xs truncate max-w-[120px]">
                  {user?.name}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="p-1 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => login('guest.viewer@cinemaseat.com')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In
              </button>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-neutral-800 bg-neutral-950 px-4 pt-2 pb-4 space-y-2">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 text-sm font-medium rounded-md ${
                  active
                    ? 'text-white bg-neutral-800 border border-neutral-700'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
            {isAuthenticated ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-neutral-200 font-medium">{user?.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="px-2.5 py-1 text-red-400 bg-neutral-900 border border-neutral-800 rounded font-medium"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  login('guest.viewer@cinemaseat.com');
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2 bg-red-600 text-white font-semibold rounded text-center"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
