'use client';

import React, { useState } from 'react';
import { Download, Link2, Sparkles, Film, Music, CheckCircle2, ArrowRight, Clock, Eye, AlertCircle } from 'lucide-react';
import type { DownloaderResponse, MediaFormat } from '@/app/api/downloader/route';

interface DownloaderCoreProps {
  onSelectForClipFinder: (mediaData: NonNullable<DownloaderResponse['data']>) => void;
  onSelectForShortMaker: (mediaData: NonNullable<DownloaderResponse['data']>) => void;
}

export function DownloaderCore({ onSelectForClipFinder, onSelectForShortMaker }: DownloaderCoreProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaData, setMediaData] = useState<DownloaderResponse['data'] | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>('mp4-1080p');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const sampleUrls = [
    { label: 'YouTube Podcast', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { label: 'TikTok Viral Clip', url: 'https://www.tiktok.com/@creator/video/719283749281' },
    { label: 'Instagram Reel', url: 'https://www.instagram.com/reel/C3zYp1xP8L/' },
    { label: 'Audio Podcast (MP3)', url: 'https://feeds.podcast.com/audio/episode-104.mp3' },
  ];

  const handleFetchMedia = async (targetUrl = url) => {
    if (!targetUrl.trim()) {
      setError('Please paste a video or audio URL.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setDownloadSuccess(null);

    try {
      const res = await fetch('/api/downloader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });
      const data: DownloaderResponse = await res.json();

      if (!res.ok || !data.ok || !data.data) {
        throw new Error(data.error || 'Failed to fetch media metadata.');
      }

      setMediaData(data.data);
      if (data.data.formats.length > 0) {
        setSelectedFormat(data.data.formats[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to downloader service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerDownload = (format: MediaFormat) => {
    setDownloadSuccess(`Initiated download: ${format.label} (${format.filesize}). Stream buffer active.`);
    setTimeout(() => {
      setDownloadSuccess(null);
    }, 4500);
  };

  return (
    <div className="space-y-6">
      {/* Hero / Input Section */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 border border-violet-200 mb-3">
            <Download className="h-3.5 w-3.5" />
            <span>Universal Media Downloader Core</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Extract Full HD Video & Audio from any link
          </h2>
          <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
            Download directly from YouTube, TikTok, Instagram, Twitter/X, and MP3 podcasts. Ready for offline playback or one-click export into our AI Short Video Maker.
          </p>
        </div>

        {/* Input bar */}
        <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
              <Link2 className="h-5 w-5" />
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetchMedia()}
              placeholder="Paste video or audio URL (e.g. YouTube, TikTok, Instagram, Podcast)..."
              className="w-full rounded-xl border border-zinc-300 bg-zinc-50/50 py-3.5 pl-11 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-violet-600 focus:bg-white focus:ring-2 focus:ring-violet-600/10"
            />
          </div>
          <button
            onClick={() => handleFetchMedia()}
            disabled={isLoading || !url.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50 shadow-sm"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Analyzing Stream...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Extract Media
              </>
            )}
          </button>
        </div>

        {/* Quick presets */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span className="font-medium text-zinc-400">Try sample link:</span>
          {sampleUrls.map((s, idx) => (
            <button
              key={idx}
              onClick={() => {
                setUrl(s.url);
                handleFetchMedia(s.url);
              }}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300 transition"
            >
              {s.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {downloadSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}
      </div>

      {/* Extracted Media Details Card */}
      {mediaData && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Thumbnail & Badges */}
            <div className="space-y-3">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-900 group">
                <img
                  src={mediaData.thumbnail}
                  alt={mediaData.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-2.5 right-2.5 rounded bg-black/80 px-2 py-0.5 text-[11px] font-semibold text-white font-mono">
                  {mediaData.duration}
                </div>
                <div className="absolute top-2.5 left-2.5 rounded bg-violet-600/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  {mediaData.platform}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Duration: {mediaData.duration}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-zinc-400" />
                  <span>{mediaData.viewCount}</span>
                </div>
              </div>
            </div>

            {/* Middle: Video Info & Format Selector */}
            <div className="lg:col-span-2 space-y-5">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-violet-600">
                  Extracted Stream Metadata
                </span>
                <h3 className="mt-1 text-lg font-bold text-zinc-900 leading-snug">
                  {mediaData.title}
                </h3>
                <p className="mt-1 text-xs text-zinc-500 font-medium">
                  Source: <span className="text-zinc-800">{mediaData.author}</span> ({mediaData.authorHandle})
                </p>
              </div>

              {/* Format selection */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-2">
                  Select Output Resolution / Format
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {mediaData.formats.map((fmt) => {
                    const isSelected = selectedFormat === fmt.id;
                    const isAudio = fmt.type === 'audio';
                    return (
                      <button
                        key={fmt.id}
                        onClick={() => setSelectedFormat(fmt.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-violet-600 bg-violet-50/60 ring-1 ring-violet-600'
                            : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`p-2 rounded-lg ${
                              isAudio ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {isAudio ? <Music className="h-4 w-4" /> : <Film className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-zinc-900">{fmt.label}</div>
                            <div className="text-[11px] text-zinc-500">{fmt.quality}</div>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-semibold text-zinc-600">{fmt.filesize}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary action buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    const fmt = mediaData.formats.find((f) => f.id === selectedFormat) || mediaData.formats[0];
                    handleTriggerDownload(fmt);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 transition shadow-sm"
                >
                  <Download className="h-4 w-4" />
                  Download File
                </button>

                <button
                  onClick={() => onSelectForClipFinder(mediaData)}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-700 transition shadow-sm"
                >
                  <Sparkles className="h-4 w-4 text-violet-200" />
                  Find Viral Clips with AI
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={() => onSelectForShortMaker(mediaData)}
                  className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs font-bold text-zinc-800 hover:bg-zinc-50 transition"
                >
                  <Film className="h-4 w-4 text-zinc-500" />
                  Send to Short Maker
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
