'use client';

import React from 'react';
import { Download, Sparkles, Film, Settings2, Zap, ShieldCheck } from 'lucide-react';

export type ActiveTab = 'downloader' | 'clip-finder' | 'short-maker' | 'automation';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  hasOpenAI: boolean;
}

export function Navbar({ activeTab, setActiveTab, hasOpenAI }: NavbarProps) {
  const tabs = [
    { id: 'downloader' as ActiveTab, label: 'Downloader Core', icon: Download, desc: 'Video & Audio URL' },
    { id: 'clip-finder' as ActiveTab, label: 'AI Clip Finder', icon: Sparkles, desc: 'Viral Highlights' },
    { id: 'short-maker' as ActiveTab, label: 'Short Maker', icon: Film, desc: '9:16 Kinetic Captions' },
    { id: 'automation' as ActiveTab, label: 'Automations', icon: Settings2, desc: 'Batch & Presets' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-sm">
            <Film className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-zinc-900">ClipFlow AI</span>
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 border border-violet-200">
                PRO MEDIA
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-medium">Downloader Core & Short Video Studio</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 rounded-xl bg-zinc-100 p-1 border border-zinc-200/80">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/60'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-violet-600' : 'text-zinc-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Status & Key indicators */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 border border-emerald-200 text-[11px] font-medium text-emerald-800">
            <Zap className="h-3 w-3 text-emerald-600 fill-emerald-600" />
            <span>AI Connected: GPT-4o + Claude</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200">
            <ShieldCheck className="h-4 w-4 text-violet-600" />
            <span>High Speed Core</span>
          </div>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="flex md:hidden border-t border-zinc-100 px-2 py-1.5 bg-zinc-50/70 overflow-x-auto gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium ${
                isActive ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200' : 'text-zinc-600'
              }`}
            >
              <Icon className="h-3 w-3" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
