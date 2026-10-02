'use client';

import React, { useState } from 'react';
import { Sparkles, Play, Flame, Share2, ArrowRight, Clock, Hash, Tag, Layers, CheckCircle } from 'lucide-react';
import type { ViralClip } from '@/app/api/clip-finder/route';

interface ClipFinderProps {
  initialTitle?: string;
  initialUrl?: string;
  onSendToShortMaker: (clip: ViralClip) => void;
}

export function ClipFinder({ initialTitle = '', initialUrl = '', onSendToShortMaker }: ClipFinderProps) {
  const [videoTitle, setVideoTitle] = useState(initialTitle || 'The Psychology of Extreme Focus & High Performance');
  const [videoUrl, setVideoUrl] = useState(initialUrl);
  const [transcript, setTranscript] = useState(
    `Host: Most people fail because they think motivation comes before action. But neurochemistry shows action produces dopamine, which creates motivation.
Speaker: Exactly! If you wait until you feel ready, you will literally wait your entire life. Look at the people who succeed—they work when they are tired, they work when they are bored. That three-second decision window is where everything is won or lost. If you don't take action within three seconds of having the instinct, your brain kills the idea to protect you from uncertainty.`
  );
  const [targetDuration, setTargetDuration] = useState('30-60s');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [clips, setClips] = useState<ViralClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  const handleRunClipFinder = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/clip-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoTitle,
          videoUrl,
          transcript,
          targetDuration,
        }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.clips)) {
        setClips(data.clips);
        setSummary(data.summary || null);
        if (data.clips.length > 0) {
          setSelectedClipId(data.clips[0].id);
        }
      }
    } catch (err) {
      console.error('Clip finder error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 border border-violet-200 mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Viral Highlight Detection</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Auto-Detect High-Retention Viral Moments
          </h2>
          <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
            Our multi-agent AI scans narrative pacing, curiosity gaps, and retention peaks to extract 30–60 second vertical clips optimized for TikTok, Reels, and YouTube Shorts.
          </p>
        </div>

        {/* Input form */}
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                Video / Podcast Title
              </label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-zinc-50/50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-violet-600 focus:bg-white"
                placeholder="Title or episode name..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                Target Clip Length
              </label>
              <div className="flex gap-2">
                {['15-30s', '30-60s', '60-90s'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setTargetDuration(d)}
                    className={`flex-1 rounded-xl border py-2.5 text-xs font-semibold transition ${
                      targetDuration === d
                        ? 'border-violet-600 bg-violet-50 text-violet-700'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
              Transcript or Video Outline
            </label>
            <textarea
              rows={4}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-zinc-50/50 p-3.5 text-xs text-zinc-900 leading-relaxed outline-none focus:border-violet-600 focus:bg-white"
              placeholder="Paste video transcript, monologue, or interview notes here for semantic hook extraction..."
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleRunClipFinder}
              disabled={isAnalyzing}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50 shadow-sm"
            >
              {isAnalyzing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Analyzing Retention Curves...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Extract Viral Clips
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Summary message */}
      {summary && (
        <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4 text-xs font-medium text-violet-900 flex items-center gap-2.5">
          <Layers className="h-4 w-4 text-violet-600 shrink-0" />
          <span>{summary}</span>
        </div>
      )}

      {/* Extracted clips list */}
      {clips.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-900">
              Detected High-Engagement Clips ({clips.length})
            </h3>
            <span className="text-xs text-zinc-500">Sorted by Virality Probability</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {clips.map((clip) => {
              const isSelected = selectedClipId === clip.id;
              const isHigh = clip.viralityScore >= 90;

              return (
                <div
                  key={clip.id}
                  onClick={() => setSelectedClipId(clip.id)}
                  className={`flex flex-col justify-between rounded-2xl border p-5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-violet-600 bg-white ring-2 ring-violet-600/10 shadow-md'
                      : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm'
                  }`}
                >
                  <div>
                    {/* Header badge & score */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                        {clip.category}
                      </span>
                      <div
                        className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          isHigh ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        <Flame className="h-3.5 w-3.5" />
                        <span>{clip.viralityScore}/100</span>
                      </div>
                    </div>

                    {/* Clip title */}
                    <h4 className="text-sm font-bold text-zinc-900 leading-snug">
                      {clip.title}
                    </h4>

                    {/* The Hook callout */}
                    <div className="mt-3 rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 text-xs text-zinc-700">
                      <span className="font-semibold text-violet-700 block mb-0.5">Viral Hook (0:00 - 0:03):</span>
                      <span className="italic font-serif leading-relaxed">"{clip.hook}"</span>
                    </div>

                    {/* Retention reason */}
                    <p className="mt-3 text-xs text-zinc-500 leading-relaxed">
                      💡 {clip.reason}
                    </p>

                    {/* Hashtags */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {clip.suggestedHashtags.map((tag: string, i: number) => (
                        <span key={i} className="text-[11px] font-medium text-zinc-500">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Timestamps & Send to Short Maker */}
                  <div className="mt-5 border-t border-zinc-100 pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-zinc-600">
                      <Clock className="h-3.5 w-3.5 text-zinc-400" />
                      <span>{clip.startTime} - {clip.endTime}</span>
                      <span className="text-zinc-400">({clip.durationSeconds}s)</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSendToShortMaker(clip);
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 transition"
                    >
                      Make Short
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
