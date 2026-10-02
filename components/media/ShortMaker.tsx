'use client';

import React, { useState, useEffect } from 'react';
import { Film, Play, Pause, RotateCcw, Download, Sparkles, Sliders, Type, Palette, Layout, Crop, Check } from 'lucide-react';
import type { ShortConfig, CaptionWord } from '@/app/api/shorts-generator/route';

interface ShortMakerProps {
  initialTitle?: string;
  initialHook?: string;
}

export function ShortMaker({ initialTitle = '', initialHook = '' }: ShortMakerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(1.8);
  const [hookHeadline, setHookHeadline] = useState(initialHook || 'WAIT TILL THE END 🤯');
  const [captionStyle, setCaptionStyle] = useState<'hormozi' | 'mrbeast' | 'minimal' | 'neon'>('hormozi');
  const [highlightColor, setHighlightColor] = useState('#facc15'); // Yellow
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1'>('9:16');
  const [showProgressBar, setShowProgressBar] = useState(true);
  const [framing, setFraming] = useState<'center' | 'speaker-tracking' | 'split-screen'>('center');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const duration = 28; // 28s duration for simulation

  // Pre-configured word-level kinetic captions
  const [captionWords, setCaptionWords] = useState<CaptionWord[]>([
    { word: 'THE', start: 0.1, end: 0.4, highlight: false },
    { word: 'BIGGEST', start: 0.4, end: 0.8, highlight: true },
    { word: 'MISTAKE', start: 0.8, end: 1.2, highlight: true },
    { word: 'people', start: 1.2, end: 1.6, highlight: false },
    { word: 'make', start: 1.6, end: 1.9, highlight: false },
    { word: 'is', start: 1.9, end: 2.1, highlight: false },
    { word: 'WAITING', start: 2.1, end: 2.6, highlight: true },
    { word: 'for', start: 2.6, end: 2.8, highlight: false },
    { word: 'the', start: 2.8, end: 3.1, highlight: false },
    { word: 'PERFECT', start: 3.1, end: 3.6, highlight: true },
    { word: 'MOMENT.', start: 3.6, end: 4.2, highlight: true },
    { word: 'There', start: 4.3, end: 4.6, highlight: false },
    { word: 'is', start: 4.6, end: 4.8, highlight: false },
    { word: 'NEVER', start: 4.8, end: 5.3, highlight: true },
    { word: 'a', start: 5.3, end: 5.5, highlight: false },
    { word: 'perfect', start: 5.5, end: 6.0, highlight: false },
    { word: 'time.', start: 6.0, end: 6.5, highlight: false },
    { word: 'You', start: 6.6, end: 6.9, highlight: false },
    { word: 'must', start: 6.9, end: 7.2, highlight: false },
    { word: 'START', start: 7.2, end: 7.7, highlight: true },
    { word: 'NOW.', start: 7.7, end: 8.4, highlight: true },
  ]);

  // Tick simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= 8.5) return 0.2;
          return +(prev + 0.1).toFixed(1);
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Current active word
  const activeWord = captionWords.find(
    (w) => currentTime >= w.start && currentTime <= w.end
  );

  // Current chunk of 3-4 words for subtitle display
  const activeChunk = captionWords.filter(
    (w) => currentTime >= w.start - 0.6 && currentTime <= w.end + 0.6
  );

  const handleExport = () => {
    setExportNotice('Exporting 1080x1920 60FPS vertical short video with burned-in kinetic captions...');
    setTimeout(() => {
      setExportNotice('Short video exported successfully! Saved to downloads.');
      setTimeout(() => setExportNotice(null), 4000);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 border border-violet-200 mb-2">
            <Film className="h-3.5 w-3.5" />
            <span>9:16 Short Video Maker Studio</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
            Vertical Short Maker & Kinetic Captions
          </h2>
          <p className="text-xs text-zinc-600 mt-1">
            Reframe any media into 9:16 vertical shorts with Alex Hormozi / MrBeast style word-by-word animated subtitles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-violet-700 transition shadow-sm"
          >
            <Download className="h-4 w-4" />
            Export Short (1080x1920)
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fadeIn">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left / Center: The 9:16 Mobile Canvas Preview */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-[340px] aspect-[9/16] rounded-3xl overflow-hidden border-[6px] border-zinc-900 bg-black shadow-2xl">
            {/* Background video simulation */}
            <img
              src="https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&auto=format&fit=crop&q=80"
              alt="Speaker"
              className="h-full w-full object-cover opacity-90 scale-105 transition-transform"
            />

            {/* Gradient overlays for readability */}
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

            {/* Top Animated Progress Bar */}
            {showProgressBar && (
              <div className="absolute top-2 inset-x-3 h-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-100 ease-linear"
                  style={{ width: `${(currentTime / 8.5) * 100}%` }}
                />
              </div>
            )}

            {/* Top Hook Banner */}
            <div className="absolute top-6 inset-x-4 flex justify-center">
              <div className="bg-amber-400 text-black px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-tight shadow-lg border-2 border-black rotate-[-1deg]">
                {hookHeadline}
              </div>
            </div>

            {/* Center / Lower-Third: Dynamic Word Captions */}
            <div className="absolute inset-x-4 bottom-24 flex flex-wrap items-center justify-center gap-1.5 text-center px-2">
              {activeChunk.map((w, idx) => {
                const isCurrent = currentTime >= w.start && currentTime <= w.end;
                const isPunch = w.highlight;

                if (captionStyle === 'hormozi') {
                  return (
                    <span
                      key={idx}
                      className={`text-lg font-black uppercase tracking-tighter transition-all duration-100 ${
                        isCurrent
                          ? 'scale-115 text-yellow-300 drop-shadow-[0_4px_4px_rgba(0,0,0,0.9)] stroke-black'
                          : isPunch
                          ? 'text-yellow-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]'
                          : 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]'
                      }`}
                    >
                      {w.word}
                    </span>
                  );
                } else if (captionStyle === 'mrbeast') {
                  return (
                    <span
                      key={idx}
                      className={`text-lg font-black uppercase tracking-tight px-1 rounded ${
                        isCurrent
                          ? 'bg-yellow-400 text-black scale-110 shadow-lg'
                          : 'text-white drop-shadow-[0_3px_0_#000]'
                      }`}
                    >
                      {w.word}
                    </span>
                  );
                } else if (captionStyle === 'neon') {
                  return (
                    <span
                      key={idx}
                      className={`text-lg font-extrabold uppercase ${
                        isCurrent
                          ? 'text-cyan-300 drop-shadow-[0_0_12px_#06b6d4] scale-110'
                          : 'text-violet-200 opacity-90'
                      }`}
                    >
                      {w.word}
                    </span>
                  );
                } else {
                  return (
                    <span
                      key={idx}
                      className={`text-base font-semibold ${
                        isCurrent ? 'text-white underline decoration-violet-500 decoration-2' : 'text-zinc-300'
                      }`}
                    >
                      {w.word}
                    </span>
                  );
                }
              })}
            </div>

            {/* Simulated TikTok / Reels UI icons */}
            <div className="absolute right-3 bottom-16 flex flex-col items-center gap-3 text-white text-xs opacity-80 pointer-events-none">
              <div className="flex flex-col items-center">
                <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  ❤️
                </div>
                <span className="text-[10px] mt-0.5 font-bold">142K</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  💬
                </div>
                <span className="text-[10px] mt-0.5 font-bold">1,829</span>
              </div>
            </div>

            {/* Floating Audio Playback Controls */}
            <div className="absolute bottom-3 inset-x-3 flex items-center justify-between bg-black/60 backdrop-blur-md rounded-xl px-3 py-2 text-white">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1 hover:text-violet-400 transition"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <div className="text-[11px] font-mono">00:0{Math.floor(currentTime)} / 00:{duration}</div>
              <button
                onClick={() => setCurrentTime(0.1)}
                className="p-1 hover:text-violet-400 transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Customization Controls & Parameters */}
        <div className="lg:col-span-6 space-y-6">
          {/* Hook Headline Settings */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-violet-600" />
              <h3 className="text-sm font-bold text-zinc-900">Viral Hook Headline Banner</h3>
            </div>
            <input
              type="text"
              value={hookHeadline}
              onChange={(e) => setHookHeadline(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-900 font-bold outline-none focus:border-violet-600 focus:bg-white"
              placeholder="Top headline banner..."
            />
            <div className="flex flex-wrap gap-1.5">
              {[
                'WAIT TILL THE END 🤯',
                'DO NOT MAKE THIS MISTAKE 🚨',
                'THE 10X SECRET REVEALED',
                'HOW TO BEAT 99% OF PEOPLE',
              ].map((preset, i) => (
                <button
                  key={i}
                  onClick={() => setHookHeadline(preset)}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-100"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Caption Style Preset Pickers */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-violet-600" />
              <h3 className="text-sm font-bold text-zinc-900">Caption Aesthetic Style</h3>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'hormozi', name: 'Alex Hormozi', desc: 'Yellow punch highlights + bold drop shadow' },
                { id: 'mrbeast', name: 'MrBeast Viral', desc: 'High-contrast energetic sticker boxes' },
                { id: 'neon', name: 'Cyber Neon', desc: 'Glowing cyan & purple outlines' },
                { id: 'minimal', name: 'Modern Minimal', desc: 'Clean editorial subtitle layout' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setCaptionStyle(st.id as any)}
                  className={`p-3 rounded-xl border text-left transition ${
                    captionStyle === st.id
                      ? 'border-violet-600 bg-violet-50/60 ring-1 ring-violet-600'
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="text-xs font-bold text-zinc-900">{st.name}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">{st.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Reframing & Aspect Ratio */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Crop className="h-4 w-4 text-violet-600" />
              <h3 className="text-sm font-bold text-zinc-900">Framing & Layout</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'center', label: 'Center Crop' },
                { id: 'speaker-tracking', label: 'Speaker Track' },
                { id: 'split-screen', label: 'Split Screen' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFraming(f.id as any)}
                  className={`rounded-xl border py-2 text-xs font-semibold text-center transition ${
                    framing === f.id
                      ? 'border-violet-600 bg-violet-50 text-violet-700'
                      : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-zinc-700">
              <span className="font-semibold">Show Top Progress Bar</span>
              <input
                type="checkbox"
                checked={showProgressBar}
                onChange={(e) => setShowProgressBar(e.target.checked)}
                className="h-4 w-4 rounded text-violet-600 focus:ring-violet-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
