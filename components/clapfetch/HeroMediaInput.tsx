'use client';

import React, { useState } from 'react';
import { Link2, ArrowRight, Upload, AlertCircle } from 'lucide-react';
import { WorkspaceMedia } from '@/lib/media/types';

interface HeroMediaInputProps {
  onMediaLoaded: (media: WorkspaceMedia) => void;
}

export function HeroMediaInput({ onMediaLoaded }: HeroMediaInputProps) {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const trimmed = url.trim();
    if (!trimmed) return;

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setErrorMsg('Please enter a valid link starting with https://');
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch('/api/downloader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });

      const json = await res.json();
      if (json.ok && json.data) {
        onMediaLoaded({
          id: `media-${Date.now()}`,
          filename: json.data.title || 'Imported Media',
          url: json.data.thumbnail || 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=1000&auto=format&fit=crop&q=80',
          title: json.data.title,
          mimeType: 'video/mp4',
          fileSize: 45 * 1024 * 1024,
          durationSeconds: json.data.durationSeconds || 180,
          source: 'link',
          sourceUrl: trimmed,
        });
      } else {
        setInfoMsg('URL import is in preview. Upload a local file for full offline processing.');
      }
    } catch {
      setInfoMsg('URL import is in preview. Upload a local file for full offline processing.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    setInfoMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMsg('File exceeds 500 MB limit.');
      return;
    }

    setIsProcessing(true);
    const localBlobUrl = URL.createObjectURL(file);
    const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|flac)$/i.test(file.name);

    let browserDuration = 120;
    try {
      const mediaEl = document.createElement(isAudio ? 'audio' : 'video');
      mediaEl.preload = 'metadata';
      mediaEl.src = localBlobUrl;
      await new Promise<void>((resolve) => {
        mediaEl.onloadedmetadata = () => {
          if (mediaEl.duration && !isNaN(mediaEl.duration)) {
            browserDuration = Math.round(mediaEl.duration);
          }
          resolve();
        };
        mediaEl.onerror = () => resolve();
        setTimeout(resolve, 1500);
      });
    } catch {}

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.ok && data.media) {
        onMediaLoaded({
          id: data.media.id,
          filename: data.media.filename || file.name,
          url: localBlobUrl,
          title: file.name.replace(/\.[^/.]+$/, ''),
          mimeType: data.media.mimeType || file.type || (isAudio ? 'audio/mpeg' : 'video/mp4'),
          fileSize: data.media.fileSize || file.size,
          durationSeconds: data.media.durationSeconds || browserDuration,
          width: data.media.width,
          height: data.media.height,
          codec: data.media.codec,
          thumbnailUrl: data.media.thumbnailUrl,
          storagePath: data.media.storagePath,
          source: 'upload',
        });
      } else {
        onMediaLoaded({
          id: `media-${Date.now()}`,
          filename: file.name,
          url: localBlobUrl,
          title: file.name.replace(/\.[^/.]+$/, ''),
          mimeType: file.type || (isAudio ? 'audio/mpeg' : 'video/mp4'),
          fileSize: file.size,
          durationSeconds: browserDuration,
          source: 'upload',
        });
      }
    } catch {
      onMediaLoaded({
        id: `media-${Date.now()}`,
        filename: file.name,
        url: localBlobUrl,
        title: file.name.replace(/\.[^/.]+$/, ''),
        mimeType: file.type || (isAudio ? 'audio/mpeg' : 'video/mp4'),
        fileSize: file.size,
        durationSeconds: browserDuration,
        source: 'upload',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section className="pt-8 sm:pt-11 pb-4 sm:pb-6 px-6 text-center">
      <div className="max-w-2xl mx-auto">
        {/* Eyebrow */}
        <p className="text-[11px] sm:text-xs font-semibold tracking-[0.22em] text-[#7C3AED] uppercase mb-3">
          YOUR MEDIA. YOUR WAY.
        </p>

        {/* Main Headline with Gradient */}
        <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold text-[#110E1B] tracking-tight leading-[1.12]">
          Keep the part{' '}
          <span className="bg-gradient-to-r from-[#6D3FC0] via-[#9333EA] to-[#D946EF] bg-clip-text text-transparent">
            that matters.
          </span>
        </h1>

        {/* Subtitle */}
        <div className="mt-3 text-[#69636E] text-base sm:text-lg leading-relaxed max-w-lg mx-auto">
          <p>Cut, convert, subtitle and save your media.</p>
          <p>Start with a link or your own file.</p>
        </div>

        {/* Universal Input Area */}
        <div className="mt-8 space-y-3.5 max-w-xl mx-auto text-left">
          {/* Row 1: Link input bar */}
          <form
            onSubmit={handleUrlSubmit}
            className="flex items-center rounded-[18px] border border-[#E9E4EF] bg-white p-1.5 shadow-xs focus-within:border-[#8061C9] transition"
          >
            <div className="pl-3.5 pr-2 text-[#918B95]">
              <Link2 className="w-4 h-4" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a video or media link..."
              disabled={isProcessing}
              className="flex-1 h-[44px] bg-transparent text-sm text-[#211D25] placeholder:text-[#918B95] outline-none"
            />
            <button
              type="submit"
              disabled={isProcessing || !url.trim()}
              className="h-[44px] px-6 rounded-[12px] bg-[#6D3FC0] text-white text-xs sm:text-sm font-medium hover:bg-[#5C35A3] transition disabled:opacity-40 flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span>Import</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 py-0.5">
            <div className="flex-1 h-[1px] bg-[#E9E4EF]" />
            <span className="text-[11px] font-semibold text-[#918B95] uppercase tracking-wider">OR</span>
            <div className="flex-1 h-[1px] bg-[#E9E4EF]" />
          </div>

          {/* Row 2: Upload Box */}
          <label className="cursor-pointer block group">
            <div className="rounded-[20px] border border-[#DDD6E2] bg-[#FAF8FD]/90 p-6 text-center group-hover:border-[#8061C9] group-hover:bg-[#F5F0FB] transition shadow-2xs">
              <div className="w-10 h-10 rounded-full bg-[#EFE9F7] flex items-center justify-center text-[#6D3FC0] mx-auto mb-2 group-hover:scale-105 transition-transform">
                <Upload className="w-4 h-4" />
              </div>
              <p className="text-sm font-semibold text-[#151121]">
                {isProcessing ? 'Inspecting media...' : 'Upload from device'}
              </p>
              <p className="text-xs text-[#8C8694] mt-0.5">
                MP4, MOV, WebM, MP3, M4A, WAV • up to 500 MB
              </p>
            </div>
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={isProcessing}
              accept="video/*,audio/*,.mp4,.mov,.webm,.mp3,.m4a,.wav"
              className="hidden"
            />
          </label>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3 rounded-[12px] bg-red-50 text-red-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="p-3 rounded-[12px] bg-[#F5F1FA] text-[#69636E] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#8061C9]" />
              <span>{infoMsg}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
