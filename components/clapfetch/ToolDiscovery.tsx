'use client';

import React from 'react';
import { Scissors, Music, Bell, Captions, Smartphone, ArrowDownToLine, Image as ImageIcon, MoreHorizontal, ArrowRight, DownloadCloud } from 'lucide-react';

interface ToolDiscoveryProps {
  onSelectTool: (tool: 'download' | 'cut' | 'audio' | 'ringtone' | 'reel' | 'subtitles' | 'compress' | 'frame' | 'all') => void;
}

export function ToolDiscovery({ onSelectTool }: ToolDiscoveryProps) {
  const primaryTools = [
    {
      id: 'download' as const,
      title: 'Online Downloader',
      desc: 'Paste any video link to preview and download in 1080p, 720p or MP3.',
      icon: DownloadCloud,
      iconBg: 'bg-[#EDE9FE]',
      iconColor: 'text-[#6D3FC0]',
    },
    {
      id: 'cut' as const,
      title: 'Cut a video',
      desc: 'Choose the exact section you want to keep with 0ms stream loss.',
      icon: Scissors,
      iconBg: 'bg-[#F0EAF8]',
      iconColor: 'text-[#7C3AED]',
    },
    {
      id: 'audio' as const,
      title: 'Extract audio',
      desc: 'Save the whole track or just the part you need in MP3, WAV or FLAC.',
      icon: Music,
      iconBg: 'bg-[#FDF2F8]',
      iconColor: 'text-[#EC4899]',
    },
    {
      id: 'ringtone' as const,
      title: 'Make a ringtone',
      desc: 'Turn your favorite 5–30 seconds into an iPhone or Android ringtone.',
      icon: Bell,
      iconBg: 'bg-[#F0EAF8]',
      iconColor: 'text-[#6D3FC0]',
    },
  ];

  const secondaryTools = [
    {
      id: 'subtitles' as const,
      title: 'Add subtitles',
      desc: 'AI captions, editing and multi-language translation.',
      icon: Captions,
    },
    {
      id: 'reel' as const,
      title: 'Create a Reel',
      desc: 'Turn a moment into a vertical clip.',
      icon: Smartphone,
    },
    {
      id: 'compress' as const,
      title: 'Compress video',
      desc: 'Discord, WhatsApp & email presets.',
      icon: ArrowDownToLine,
    },
    {
      id: 'frame' as const,
      title: 'Frame grabber',
      desc: 'Capture lossless PNG or JPG frames.',
      icon: ImageIcon,
    },
    {
      id: 'all' as const,
      title: 'View all tools',
      desc: 'Explore everything Clapfetch can do.',
      icon: MoreHorizontal,
    },
  ];

  return (
    <section className="pt-2 sm:pt-4 pb-14 sm:pb-18 bg-transparent">
      <div className="mx-auto max-w-[1240px] px-6 sm:px-8">
        {/* Section Heading matching Ref Image - brought closer to hero */}
        <div className="text-center max-w-xl mx-auto mb-8 sm:mb-9">
          <h2 className="text-2xl sm:text-[28px] font-bold text-[#110E1B] tracking-tight">
            What would you like to make?
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-[#69636E]">
            Start with one of the essentials.
          </p>
        </div>

        {/* 4 Primary Cards in a Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {primaryTools.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.title}
                onClick={() => onSelectTool(t.id)}
                className="group flex flex-col justify-between text-left rounded-[20px] border border-[#E9E4EF] bg-white p-6 hover:border-[#DDD6E2] hover:shadow-xs transition cursor-pointer"
              >
                <div>
                  {/* Icon squircle */}
                  <div className={`w-11 h-11 rounded-[14px] ${t.iconBg} ${t.iconColor} flex items-center justify-center mb-4`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-[#110E1B]">
                    {t.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-[#69636E] leading-relaxed">
                    {t.desc}
                  </p>
                </div>

                {/* Bottom link with arrow button */}
                <div className="mt-6 pt-2 flex items-center justify-between text-xs font-semibold text-[#6D3FC0]">
                  <span>Open tool</span>
                  <div className="w-6 h-6 rounded-full bg-[#F5F1FA] text-[#6D3FC0] flex items-center justify-center group-hover:bg-[#EDE5F8] transition">
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Secondary Row below */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-[#E9E4EC]/60">
          {secondaryTools.map((st) => {
            const Icon = st.icon;
            return (
              <button
                key={st.title}
                onClick={() => onSelectTool(st.id)}
                className="flex items-center gap-3.5 text-left p-3 rounded-[14px] hover:bg-white/80 transition cursor-pointer"
              >
                <div className="w-10 h-10 rounded-[12px] bg-[#F5F1FA] text-[#6D3FC0] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#110E1B]">
                    {st.title}
                  </h4>
                  <p className="text-[11px] text-[#69636E]">
                    {st.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
