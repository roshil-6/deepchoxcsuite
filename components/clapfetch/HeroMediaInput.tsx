'use client';

import React, { useState } from 'react';
import {
  Link2,
  ArrowRight,
  Upload,
  AlertCircle,
  Download,
  Play,
  Sliders,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Music,
  Video,
  Loader2,
} from 'lucide-react';
import { WorkspaceMedia } from '@/lib/media/types';

interface MediaFormat {
  id: string;
  label: string;
  ext: 'mp4' | 'mp3' | 'wav';
  resolution?: string;
  quality: string;
  filesize: string;
  type: 'video' | 'audio';
  downloadUrl: string;
}

interface DownloaderData {
  url: string;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'vimeo' | 'generic';
  title: string;
  author: string;
  authorHandle: string;
  duration: string;
  durationSeconds: number;
  thumbnail: string;
  videoUrl?: string;
  youtubeId?: string;
  viewCount: string;
  formats: MediaFormat[];
  suggestedClipTimes: { start: string; end: string; label: string }[];
}

interface HeroMediaInputProps {
  onMediaLoaded: (media: WorkspaceMedia) => void;
}

export function HeroMediaInput({ onMediaLoaded }: HeroMediaInputProps) {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [previewData, setPreviewData] = useState<DownloaderData | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>('mp4-1080p');

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setPreviewData(null);

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
        setPreviewData(json.data);
        if (json.data.formats && json.data.formats.length > 0) {
          setSelectedFormat(json.data.formats[0].id);
        }
      } else {
        setErrorMsg(json.error || 'Unable to fetch video details from link.');
      }
    } catch {
      setErrorMsg('Failed to process link. Please check your internet connection.');
    } finally {
      setIsProcessing(false);
    }
  };

  const [preparing, setPreparing] = useState<string | null>(null);
  const [dlProgress, setDlProgress] = useState<string>('');

  const handleDownload = async (fmt: MediaFormat) => {
    setErrorMsg('');
    setPreparing(fmt.id);
    setDlProgress('Getting the file from the source…');
    try {
      // ONE request: the server fetches the real media and streams it back.
      const res = await fetch(fmt.downloadUrl);
      const ctype = res.headers.get('content-type') || '';
      if (!res.ok || ctype.includes('application/json')) {
        const json = await res.json().catch(() => ({ error: `Download failed (HTTP ${res.status})` }));
        throw new Error(json.error || `Download failed (HTTP ${res.status})`);
      }
      const total = Number(res.headers.get('content-length') || 0);
      const disp = res.headers.get('content-disposition') || '';
      const nameMatch = /filename\*=UTF-8''([^;]+)/i.exec(disp) || /filename="([^"]+)"/i.exec(disp);
      const filename = nameMatch ? decodeURIComponent(nameMatch[1]) : `clapfetch.${fmt.ext}`;

      let blob: Blob;
      if (res.body) {
        const reader = res.body.getReader();
        const chunks: BlobPart[] = [];
        let received = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value as BlobPart);
          received += value.length;
          const mb = (received / 1048576).toFixed(1);
          setDlProgress(total ? `Downloading… ${Math.round((received / total) * 100)}% (${mb} MB)` : `Downloading… ${mb} MB`);
        }
        blob = new Blob(chunks, { type: ctype || 'application/octet-stream' });
      } else {
        blob = await res.blob();
      }
      if (!blob.size) throw new Error('The server returned an empty file. Please try again.');

      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objUrl), 60_000);
      setInfoMsg(`Saved “${filename}”.`);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Download failed');
    } finally {
      setPreparing(null);
      setDlProgress('');
    }
  };

  const handleOpenInWorkspace = async () => {
    if (!previewData) return;
    setErrorMsg('');
    setPreparing('studio');
    try {
      const res = await fetch('/api/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: previewData.url }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Could not import this video');
      onMediaLoaded({ ...json.media, title: previewData.title || json.media.title });
    } catch (e: any) {
      setErrorMsg(e?.message || 'Could not import this video');
    } finally {
      setPreparing(null);
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
      <div className="max-w-3xl mx-auto">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F1FA] border border-[#E9E4EF] mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
          <span className="text-[11px] font-semibold tracking-wider text-[#7C3AED] uppercase">
            ONLINE VIDEO DOWNLOADER & MEDIA STUDIO
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold text-[#110E1B] tracking-tight leading-[1.12]">
          Paste Link. Preview.{' '}
          <span className="bg-gradient-to-r from-[#6D3FC0] via-[#9333EA] to-[#D946EF] bg-clip-text text-transparent">
            Download or Edit.
          </span>
        </h1>

        {/* Subtitle */}
        <div className="mt-3 text-[#69636E] text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
          <p>Download full videos, extract crisp MP3 music, or trim & customize directly in browser.</p>
          <p className="text-xs sm:text-sm text-[#918B95] mt-1">Works with YouTube, Instagram, TikTok, Twitter/X, and direct media URLs.</p>
        </div>

        {/* Universal Input Area */}
        <div className="mt-8 space-y-4 max-w-2xl mx-auto text-left">
          {/* Row 1: Direct Link Input Bar */}
          <form
            onSubmit={handleUrlSubmit}
            className="flex items-center rounded-[20px] border-2 border-[#DDD6E2] bg-white p-1.5 shadow-sm focus-within:border-[#6D3FC0] transition"
          >
            <div className="pl-4 pr-2 text-[#918B95]">
              <Link2 className="w-5 h-5 text-[#6D3FC0]" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste any YouTube, TikTok, Reels, or video link here..."
              disabled={isProcessing}
              className="flex-1 h-[48px] bg-transparent text-sm sm:text-base text-[#211D25] placeholder:text-[#918B95] outline-none"
            />
            <button
              type="submit"
              disabled={isProcessing || !url.trim()}
              className="h-[48px] px-6 sm:px-8 rounded-[14px] bg-[#6D3FC0] text-white text-sm font-semibold hover:bg-[#5C35A3] transition disabled:opacity-40 flex items-center gap-2 shrink-0 cursor-pointer shadow-xs"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Video</span>
                </>
              )}
            </button>
          </form>

          {/* ─── LIVE PREVIEW & DOWNLOAD CARD (When link is fetched) ─── */}
          {previewData && (
            <div className="p-5 sm:p-6 rounded-[22px] bg-white border-2 border-[#8061C9]/30 shadow-md space-y-5 animate-in fade-in slide-in-from-top-3 duration-300">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                {/* Poster / Thumbnail */}
                <div className="relative w-full sm:w-[220px] aspect-video rounded-[14px] overflow-hidden bg-black shrink-0 border border-[#E9E4EF]">
                  <img
                    src={previewData.thumbnail || '/clapfetch-ui-ref.png'}
                    alt={previewData.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-[6px] bg-black/80 text-white font-mono text-[11px]">
                    {previewData.duration}
                  </div>
                </div>

                {/* Metadata Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-[6px] bg-[#F5F1FA] text-[#6D3FC0] text-[11px] font-semibold uppercase tracking-wider">
                      {previewData.platform}
                    </span>
                    <span className="text-xs text-[#918B95] truncate">{previewData.author}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#110E1B] leading-snug line-clamp-2">
                    {previewData.title}
                  </h3>
                  <p className="text-xs text-[#69636E] mt-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Media streams ready for immediate download or studio editing.</span>
                  </p>
                </div>
              </div>

              {/* Format Selection Grid */}
              <div className="space-y-2 pt-2 border-t border-[#F0EAF8]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#211D25]">Select Download Format & Quality:</span>
                  <span className="text-[#918B95]">Direct Browser Stream</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {previewData.formats.map((fmt) => (
                    <button
                      key={fmt.id}
                      onClick={() => setSelectedFormat(fmt.id)}
                      className={`p-3 rounded-[12px] text-left border transition cursor-pointer ${
                        selectedFormat === fmt.id
                          ? 'border-[#6D3FC0] bg-[#F5F1FA]'
                          : 'border-[#E9E4EF] bg-white hover:border-[#DDD6E2]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${selectedFormat === fmt.id ? 'text-[#6D3FC0]' : 'text-[#211D25]'}`}>
                          {fmt.ext.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono text-[#918B95]">{fmt.filesize}</span>
                      </div>
                      <p className="text-[11px] text-[#69636E] mt-1 leading-tight font-medium">
                        {fmt.quality}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Direct Download + Edit in Studio */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {(() => {
                  const currentFmt = previewData.formats.find((f) => f.id === selectedFormat) || previewData.formats[0];
                  const isPreparing = preparing === currentFmt?.id;
                  return (
                    <button
                      onClick={() => currentFmt && handleDownload(currentFmt)}
                      disabled={!!preparing || !currentFmt}
                      className="flex-1 h-[46px] rounded-[12px] bg-[#6D3FC0] text-white text-sm font-semibold hover:bg-[#5C35A3] transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isPreparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      <span>{isPreparing ? 'Preparing download…' : `Download ${currentFmt?.label || 'Video'}`}</span>
                    </button>
                  );
                })()}

                <button
                  onClick={handleOpenInWorkspace}
                  disabled={!!preparing}
                  className="h-[46px] px-6 rounded-[12px] bg-[#FAF8FD] border border-[#DDD6E2] text-[#211D25] text-sm font-semibold hover:border-[#6D3FC0] hover:text-[#6D3FC0] hover:bg-[#F5F1FA] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {preparing === 'studio' ? <Loader2 className="w-4 h-4 animate-spin text-[#6D3FC0]" /> : <Sliders className="w-4 h-4 text-[#6D3FC0]" />}
                  <span>{preparing === 'studio' ? 'Loading video…' : 'Edit in Studio'}</span>
                </button>
              </div>
              {preparing && (
                <p className="text-[11px] text-[#918B95] text-center">
                  {dlProgress || 'Getting the real video from the source. Long videos can take a minute.'}
                </p>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-4 py-1">
            <div className="flex-1 h-[1px] bg-[#E9E4EF]" />
            <span className="text-[11px] font-semibold text-[#918B95] uppercase tracking-wider">OR UPLOAD LOCAL MEDIA</span>
            <div className="flex-1 h-[1px] bg-[#E9E4EF]" />
          </div>

          {/* Row 2: Upload Box */}
          <label className="cursor-pointer block group">
            <div className="rounded-[20px] border border-[#DDD6E2] bg-[#FAF8FD]/90 p-5 text-center group-hover:border-[#8061C9] group-hover:bg-[#F5F0FB] transition shadow-2xs">
              <div className="w-9 h-9 rounded-full bg-[#EFE9F7] flex items-center justify-center text-[#6D3FC0] mx-auto mb-2 group-hover:scale-105 transition-transform">
                <Upload className="w-4 h-4" />
              </div>
              <p className="text-sm font-semibold text-[#151121]">
                {isProcessing ? 'Inspecting media...' : 'Upload local video or audio'}
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
            <div className="p-3.5 rounded-[12px] bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="p-3.5 rounded-[12px] bg-[#F5F1FA] border border-[#E9E4EF] text-[#69636E] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#8061C9]" />
              <span>{infoMsg}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

