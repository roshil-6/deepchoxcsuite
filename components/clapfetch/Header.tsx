'use client';

import React, { useState } from 'react';
import { Logo } from './Logo';
import { ArrowLeft } from 'lucide-react';

interface HeaderProps {
  activeView: 'home' | 'tools' | 'library' | 'playlists';
  setActiveView: (view: 'home' | 'tools' | 'library' | 'playlists') => void;
  onResetWorkspace?: () => void;
  isWorkspaceActive?: boolean;
}

export function Header({
  activeView,
  setActiveView,
  onResetWorkspace,
  isWorkspaceActive = false,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (view: 'home' | 'tools' | 'library' | 'playlists') => {
    setActiveView(view);
    if (view === 'home' && onResetWorkspace) {
      onResetWorkspace();
    }
  };

  const handleBackToHome = () => {
    setActiveView('home');
    if (onResetWorkspace) {
      onResetWorkspace();
    }
  };

  return (
    <header className="bg-transparent border-b border-[#E9E4EC]/20 relative z-30 transition-all">
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-6 sm:px-8">
        {/* Left: Brand Logo & Optional Back Button */}
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center text-left cursor-pointer"
          >
            <Logo size="md" />
          </button>

          {/* Prominent Back to Home button when media is loaded or viewing a sub-view */}
          {(isWorkspaceActive || activeView !== 'home') && (
            <button
              onClick={handleBackToHome}
              className="flex items-center gap-1.5 h-[36px] px-3 rounded-[10px] bg-white/80 border border-[#E9E4EF] text-xs font-semibold text-[#211D25] hover:text-[#6D3FC0] hover:border-[#DDD6E2] hover:bg-white transition cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#6D3FC0]" />
              <span>Back to Home</span>
            </button>
          )}
        </div>

        {/* Desktop Navigation (No Account / No Sign-up clutter) */}
        <div className="hidden md:flex items-center gap-7">
          <nav className="flex items-center gap-7">
            <button
              onClick={() => handleNavClick('tools')}
              className={`text-sm font-medium transition cursor-pointer ${
                activeView === 'tools' ? 'text-[#6D3FC0] font-semibold' : 'text-[#69636E] hover:text-[#211D25]'
              }`}
            >
              Tools
            </button>
            <button
              onClick={() => handleNavClick('library')}
              className={`text-sm font-medium transition cursor-pointer ${
                activeView === 'library' ? 'text-[#6D3FC0] font-semibold' : 'text-[#69636E] hover:text-[#211D25]'
              }`}
            >
              Library
            </button>
            <button
              onClick={() => handleNavClick('playlists')}
              className={`text-sm font-medium transition cursor-pointer ${
                activeView === 'playlists' ? 'text-[#6D3FC0] font-semibold' : 'text-[#69636E] hover:text-[#211D25]'
              }`}
            >
              Playlists
            </button>
          </nav>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-2">
          {(isWorkspaceActive || activeView !== 'home') && (
            <button
              onClick={handleBackToHome}
              className="flex items-center gap-1 p-2 text-xs font-medium text-[#6D3FC0]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#69636E] hover:text-[#211D25] text-xs font-medium"
          >
            {mobileMenuOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E9E4EC] bg-white/95 backdrop-blur-md px-6 py-4 space-y-3">
          <button
            onClick={() => {
              handleNavClick('home');
              setMobileMenuOpen(false);
            }}
            className="block text-left text-sm font-medium text-[#211D25] py-1"
          >
            Home
          </button>
          <button
            onClick={() => {
              handleNavClick('tools');
              setMobileMenuOpen(false);
            }}
            className="block text-left text-sm font-medium text-[#211D25] py-1"
          >
            Tools
          </button>
          <button
            onClick={() => {
              handleNavClick('library');
              setMobileMenuOpen(false);
            }}
            className="block text-left text-sm font-medium text-[#211D25] py-1"
          >
            Library
          </button>
          <button
            onClick={() => {
              handleNavClick('playlists');
              setMobileMenuOpen(false);
            }}
            className="block text-left text-sm font-medium text-[#211D25] py-1"
          >
            Playlists
          </button>
        </div>
      )}
    </header>
  );
}
