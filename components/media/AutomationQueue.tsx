'use client';

import React, { useState } from 'react';
import { Settings2, Zap, Play, CheckCircle2, Clock, Plus, Trash2, ArrowUpRight } from 'lucide-react';

interface AutomationPreset {
  id: string;
  name: string;
  trigger: string;
  actions: string[];
  status: 'Active' | 'Paused';
}

export function AutomationQueue() {
  const [presets, setPresets] = useState<AutomationPreset[]>([
    {
      id: 'p-1',
      name: 'Auto-Podcast Viral Clipper',
      trigger: 'When video > 15 mins uploaded',
      actions: ['Extract 3 highest virality clips', 'Apply Hormozi captions', 'Export 1080x1920 shorts'],
      status: 'Active',
    },
    {
      id: 'p-2',
      name: 'High Bitrate Audio Sync',
      trigger: 'On audio URL link paste',
      actions: ['Extract 320kbps MP3', 'Generate transcription tokens'],
      status: 'Active',
    },
    {
      id: 'p-3',
      name: 'TikTok Trend Repurposer',
      trigger: 'Direct short URL input',
      actions: ['Remove watermark', 'Re-center speaker', 'Auto-generate 3 hook variants'],
      status: 'Paused',
    },
  ]);

  const [queueItems, setQueueItems] = useState([
    {
      id: 'q-1',
      title: 'How To Scale To $10M ARR - Podcast #104',
      status: 'Rendered (3 Shorts Ready)',
      progress: 100,
      time: '2 mins ago',
    },
    {
      id: 'q-2',
      title: 'Discipline Over Motivation - Keynote Speech',
      status: 'AI Transcribing & Finding Hooks',
      progress: 68,
      time: '5 mins ago',
    },
    {
      id: 'q-3',
      title: 'Cold Outreach Strategy That Closed 12 Clients',
      status: 'Queued for 1080p Downloader',
      progress: 25,
      time: '12 mins ago',
    },
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 border border-violet-200 mb-2">
              <Zap className="h-3.5 w-3.5" />
              <span>Background Automation Engine</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
              Automation Rules & Batch Pipeline
            </h2>
            <p className="text-xs text-zinc-600 mt-1">
              Set auto-clipping rules, queue multiple video downloads, and let the AI background processor generate shorts automatically.
            </p>
          </div>
          <button className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 transition shadow-sm">
            <Plus className="h-4 w-4" />
            New Preset
          </button>
        </div>
      </div>

      {/* Grid: Presets & Live Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Presets */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900">Autonomous Content Rules</h3>
            <span className="text-xs font-medium text-zinc-400">Run continuously</span>
          </div>

          <div className="space-y-3">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="rounded-xl border border-zinc-200 p-4 hover:border-zinc-300 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900">{preset.name}</span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      preset.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    {preset.status}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 font-mono">
                  Trigger: <span className="text-zinc-700">{preset.trigger}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {preset.actions.map((act, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600"
                    >
                      {act}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Processing Queue */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900">Live Batch Queue</h3>
            <span className="text-xs font-mono text-emerald-600 font-semibold">● Engine Online</span>
          </div>

          <div className="space-y-3">
            {queueItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-zinc-200 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-900 truncate max-w-[260px]">
                    {item.title}
                  </h4>
                  <span className="text-[11px] text-zinc-400 font-mono">{item.time}</span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-violet-700 font-medium">{item.status}</span>
                  <span className="font-mono font-bold text-zinc-700">{item.progress}%</span>
                </div>

                <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-600 rounded-full transition-all duration-300"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
