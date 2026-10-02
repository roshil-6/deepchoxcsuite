'use client';

import React, { useEffect, useRef, useState } from 'react';
import { WorkspaceMedia, WorkspaceTool, ClipFinderResult } from '@/lib/media/types';
import { useWorkspaceState } from '@/hooks/useWorkspaceState';
import { SubtitleEditor } from './SubtitleEditor';
import {
  Scissors,
  Crop as CropIcon,
  Smartphone,
  ArrowDownToLine,
  VolumeX,
  Music,
  Bell,
  Captions,
  Search,
  Download,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  Sliders,
  ShieldCheck,
  Waves,
  Sparkles,
  FileAudio,
  Gauge,
} from 'lucide-react';

interface WorkspaceProps {
  media: WorkspaceMedia;
  initialTool?: WorkspaceTool;
  onCloseWorkspace: () => void;
}

export function Workspace({ media, initialTool = 'trim', onCloseWorkspace }: WorkspaceProps) {
  const {
    setMedia,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    selectionStart,
    selectionEnd,
    setSelection,
    activeTool,
    setActiveTool,
    subtitleTracks,
    activeSubtitleTrackId,
    setActiveSubtitleTrackId,
    addSubtitleTrack,
    updateSubtitleTrack,
    crop,
    setCrop,
  } = useWorkspaceState();

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  // Tool-specific UI states
  const [activeGroup, setActiveGroup] = useState<'video' | 'audio' | 'subtitles' | 'find'>('video');
  const [findQuery, setFindQuery] = useState('');
  const [isSearchingMoment, setIsSearchingMoment] = useState(false);
  const [foundMoments, setFoundMoments] = useState<ClipFinderResult[]>([]);
  const [findError, setFindError] = useState<string | null>(null);

  // Audio studio states
  const [audioFormat, setAudioFormat] = useState<'mp3' | 'wav' | 'flac' | 'm4a'>('mp3');
  const [audioBitrate, setAudioBitrate] = useState<320 | 256 | 192 | 128>(320);
  const [audioScope, setAudioScope] = useState<'full' | 'selection'>('full');
  const [audioNormalize, setAudioNormalize] = useState(true);

  // Ringtone studio states
  const [ringtoneTarget, setRingtoneTarget] = useState<'iphone' | 'android'>('iphone');
  const [ringtoneFadeIn, setRingtoneFadeIn] = useState(true);
  const [ringtoneFadeOut, setRingtoneFadeOut] = useState(true);

  // Video cut & compress states
  const [cutFormat, setCutFormat] = useState<'mp4' | 'webm'>('mp4');
  const [compressPreset, setCompressPreset] = useState<'discord' | 'whatsapp' | 'email' | 'custom'>('custom');
  const [compressQuality, setCompressQuality] = useState<'smaller' | 'balanced' | 'higher'>('balanced');
  const [showAdvancedCompress, setShowAdvancedCompress] = useState(false);
  const [compressResolution, setCompressResolution] = useState('original');
  const [muteAudio, setMuteAudio] = useState(false);
  const [frameFormat, setFrameFormat] = useState<'jpg' | 'png'>('jpg');
  const [playerMode, setPlayerMode] = useState<'embed' | 'poster'>('poster');

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localBlobUrl = URL.createObjectURL(file);
    const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|flac)$/i.test(file.name);

    let duration = 60;
    try {
      const mediaEl = document.createElement(isAudio ? 'audio' : 'video');
      mediaEl.src = localBlobUrl;
      await new Promise<void>((res) => {
        mediaEl.onloadedmetadata = () => {
          if (mediaEl.duration && !isNaN(mediaEl.duration)) duration = Math.round(mediaEl.duration);
          res();
        };
        setTimeout(res, 1200);
      });
    } catch {}

    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.ok && data.media) {
        setMedia({
          ...data.media,
          url: localBlobUrl,
          title: file.name.replace(/\.[^/.]+$/, ''),
        });
      } else {
        setMedia({
          id: `media-${Date.now()}`,
          filename: file.name,
          url: localBlobUrl,
          title: file.name.replace(/\.[^/.]+$/, ''),
          mimeType: file.type || (isAudio ? 'audio/mpeg' : 'video/mp4'),
          fileSize: file.size,
          durationSeconds: duration,
          source: 'upload',
        });
      }
    } catch {
      setMedia({
        id: `media-${Date.now()}`,
        filename: file.name,
        url: localBlobUrl,
        title: file.name.replace(/\.[^/.]+$/, ''),
        mimeType: file.type || (isAudio ? 'audio/mpeg' : 'video/mp4'),
        fileSize: file.size,
        durationSeconds: duration,
        source: 'upload',
      });
    }
  };

  // Processing job execution state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [jobStatus, setJobStatus] = useState<'idle' | 'queued' | 'processing' | 'completed' | 'failed'>('idle');
  const [jobDownloadUrl, setJobDownloadUrl] = useState<string | null>(null);
  const [jobOutputFilename, setJobOutputFilename] = useState<string | null>(null);
  const [jobErrorMessage, setJobErrorMessage] = useState<string | null>(null);

  const isAudioOnly =
    media.mimeType?.startsWith('audio/') ||
    /\.(mp3|wav|m4a|aac|flac)$/i.test(media.filename || '');

  // Initialize media
  useEffect(() => {
    setMedia(media);
    if (initialTool) {
      setActiveTool(initialTool);
      if (['audio_extract', 'audio_trim', 'ringtone'].includes(initialTool)) {
        setActiveGroup('audio');
      } else if (['subtitle_generate', 'subtitle_edit', 'subtitle_translate', 'subtitle_export'].includes(initialTool)) {
        setActiveGroup('subtitles');
      } else if (initialTool === 'find_clip') {
        setActiveGroup('find');
      } else {
        setActiveGroup('video');
      }
    }
  }, [media, initialTool, setMedia, setActiveTool]);

  // Sync activeGroup when tool changes
  const selectTool = (tool: WorkspaceTool, group: 'video' | 'audio' | 'subtitles' | 'find') => {
    setActiveTool(tool);
    setActiveGroup(group);
  };

  const togglePlay = () => {
    const el = isAudioOnly ? audioRef.current : videoRef.current;
    if (!el) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('Playback prevented or unsupported source:', err);
            setIsPlaying(false);
          });
      } else {
        setIsPlaying(true);
      }
    }
  };

  const handleTimeUpdate = () => {
    const el = isAudioOnly ? audioRef.current : videoRef.current;
    if (el) {
      setCurrentTime(el.currentTime);
    }
  };

  const seekTo = (sec: number) => {
    const el = isAudioOnly ? audioRef.current : videoRef.current;
    if (el) {
      el.currentTime = sec;
      setCurrentTime(sec);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 MB';
    return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
  };

  // Subtitle cue for current time
  const activeTrack = subtitleTracks.find((t) => t.id === activeSubtitleTrackId) || subtitleTracks[0];
  const currentCue = activeTrack?.cues.find(
    (c) => currentTime >= c.startTime && currentTime <= c.endTime
  );

  // ─── AI Clip Finder Action ───
  const handleFindMoment = async (customQuery?: string) => {
    const q = (customQuery || findQuery).trim();
    if (!q) return;

    setIsSearchingMoment(true);
    setFindError(null);
    setFoundMoments([]);

    try {
      const res = await fetch('/api/clip-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          durationSeconds: media.durationSeconds,
          videoTitle: media.title,
          maxResults: 3,
        }),
      });

      const data = await res.json();
      if (data.ok && Array.isArray(data.results) && data.results.length > 0) {
        setFoundMoments(data.results);
      } else {
        setFindError(data.error || 'No matching moments found');
      }
    } catch {
      setFindError('Search request failed');
    } finally {
      setIsSearchingMoment(false);
    }
  };

  const applyMomentToTimeline = (start: number, end: number) => {
    setSelection(start, end);
    seekTo(start);
  };

  // ─── Processing Job Execution & Polling ───
  const startProcessingJob = async (type: string, params: Record<string, unknown>) => {
    setJobStatus('queued');
    setJobProgress(5);
    setJobErrorMessage(null);
    setJobDownloadUrl(null);

    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: media.id,
          storagePath: media.storagePath,
          type,
          params,
        }),
      });

      const data = await res.json();
      if (!data.ok || !data.jobId) {
        throw new Error(data.error || 'Failed to queue processing job');
      }

      setActiveJobId(data.jobId);
      pollJobStatus(data.jobId);
    } catch (err: any) {
      setJobStatus('failed');
      setJobErrorMessage(err?.message || 'Processing failed');
    }
  };

  const pollJobStatus = (jobId: string) => {
    // Clear any existing poll before starting a new one
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/process/${jobId}`);
        const data = await res.json();

        if (data.ok && data.job) {
          setJobProgress(data.job.progress || 0);

          if (data.job.status === 'completed') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setJobStatus('completed');
            setJobProgress(100);
            setJobDownloadUrl(data.job.outputUrl || `/api/download/${jobId}`);
            setJobOutputFilename(data.job.outputFilename || 'export');
          } else if (data.job.status === 'failed') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setJobStatus('failed');
            setJobErrorMessage(data.job.errorMessage || 'Job failed during encoding');
          } else {
            setJobStatus('processing');
          }
        }
      } catch {
        // network retry
      }
    }, 1200);
  };

  const handleExport = () => {
    const duration = media.durationSeconds || 1;
    const clampedStart = Math.max(0, Math.min(selectionStart, duration));
    const clampedEnd = Math.max(clampedStart + 0.1, Math.min(selectionEnd, duration));
    const startMs = Math.round(clampedStart * 1000);
    const endMs = Math.round(clampedEnd * 1000);

    if (activeTool === 'trim') {
      startProcessingJob('cut', { startMs, endMs, outputFormat: cutFormat });
    } else if (activeTool === 'audio_extract') {
      startProcessingJob('audio_extract', {
        format: audioFormat,
        bitrate: audioBitrate,
        startMs: audioScope === 'selection' ? startMs : 0,
        endMs: audioScope === 'selection' ? endMs : Math.round(duration * 1000),
      });
    } else if (activeTool === 'ringtone') {
      const maxDurationMs = ringtoneTarget === 'iphone' ? 30000 : 40000;
      startProcessingJob('ringtone', {
        startMs,
        endMs: Math.min(startMs + maxDurationMs, endMs),
        target: ringtoneTarget,
        fadeIn: ringtoneFadeIn,
        fadeOut: ringtoneFadeOut,
      });
    } else if (activeTool === 'reel' || activeTool === 'crop') {
      startProcessingJob('reel', {
        startMs,
        endMs,
        aspectRatio: crop.aspectRatio === 'original' ? '9:16' : crop.aspectRatio,
      });
    } else if (activeTool === 'compress') {
      startProcessingJob('compress', {
        quality: compressQuality,
        resolution: compressResolution !== 'original' ? compressResolution : undefined,
      });
    } else if (activeTool === 'mute') {
      startProcessingJob('mute', { startMs: 0, endMs: Math.round(duration * 1000) });
    } else if (activeTool === 'frame') {
      startProcessingJob('frame_grab', {
        timestampMs: Math.round(currentTime * 1000),
        format: frameFormat,
      });
    } else if (activeTool.startsWith('subtitle_')) {
      // Subtitle tools — user should export from the SubtitleEditor panel
      // But if they click the main Export, burn subtitles into the video
      startProcessingJob('subtitle_burn', { srtPath: '', fontSize: 24, position: 'bottom' });
    } else {
      startProcessingJob('cut', { startMs, endMs });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* ─── Header Row with Back Button ─── */}
      <div className="flex items-center justify-between pb-5 mb-6 border-b border-[#E9E4EF]">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onCloseWorkspace}
            className="flex items-center gap-1.5 h-[38px] px-3.5 rounded-[12px] bg-white border border-[#E9E4EF] text-xs sm:text-sm font-semibold text-[#211D25] hover:text-[#6D3FC0] hover:border-[#DDD6E2] hover:bg-[#FAF8FD] transition shadow-2xs cursor-pointer shrink-0"
            title="Back to home"
          >
            <ArrowLeft className="w-4 h-4 text-[#6D3FC0]" />
            <span>Back</span>
          </button>

          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-[#211D25] truncate max-w-[200px] sm:max-w-md lg:max-w-xl">
              {media.title}
            </h2>
            <p className="text-xs text-[#918B95] mt-0.5">
              {formatTime(media.durationSeconds)} • {media.mimeType || 'video/mp4'} • {formatBytes(media.fileSize)}
              {media.width && media.height ? ` • ${media.width}×${media.height}` : ''}
            </p>
          </div>
        </div>

        <button
          onClick={onCloseWorkspace}
          className="text-xs font-medium text-[#69636E] hover:text-[#6D3FC0] px-3 py-1.5 rounded-[10px] hover:bg-[#F5F1FA] transition cursor-pointer"
        >
          Replace media
        </button>
      </div>

      {/* ─── Media Preview ─── */}
      <div className="relative rounded-[22px] overflow-hidden bg-[#18161D] aspect-video max-h-[440px] mx-auto mb-3 flex items-center justify-center">
        {media.youtubeId ? (
          playerMode === 'embed' ? (
            <iframe
              src={`https://www.youtube.com/embed/${media.youtubeId}?autoplay=0&rel=0`}
              className="w-full h-full border-0"
              title={media.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              {/* Poster image */}
              <img
                src={media.thumbnailUrl || `https://i.ytimg.com/vi/${media.youtubeId}/hqdefault.jpg`}
                alt={media.title}
                className="w-full h-full object-contain opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-6 pointer-events-none">
                <div className="flex justify-end">
                  <span className="px-3 py-1 rounded-[8px] bg-black/60 backdrop-blur-md text-white/90 text-xs font-medium">
                    Poster View
                  </span>
                </div>
                <div>
                  <h3 className="text-white text-base sm:text-lg font-semibold drop-shadow max-w-xl line-clamp-2">
                    {media.title}
                  </h3>
                  <p className="text-white/70 text-xs mt-1">
                    Timeline scrubber active below. Use start/end bounds to cut, extract audio, or create clips.
                  </p>
                </div>
              </div>
            </div>
          )
        ) : !isAudioOnly ? (
          <video
            ref={videoRef}
            src={media.url}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            onError={() => {
              console.warn('Video failed to load source:', media.url);
              setIsPlaying(false);
            }}
            onClick={togglePlay}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-white py-12">
            <audio
              ref={audioRef}
              src={media.url}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              onError={() => {
                console.warn('Audio failed to load source:', media.url);
                setIsPlaying(false);
              }}
            />
            <div className="w-16 h-16 rounded-full bg-[#6D3FC0]/20 flex items-center justify-center mb-3">
              <Music className="w-8 h-8 text-[#8061C9]" />
            </div>
            <p className="text-sm font-medium text-white/90">{media.title}</p>
            <p className="text-xs text-white/60 mt-1">Audio playback</p>
          </div>
        )}

        {/* Clean Subtitle Overlay centered bottom */}
        {currentCue && (
          <div className="absolute bottom-6 left-0 right-0 px-6 text-center pointer-events-none">
            <span className="inline-block bg-[#211D25]/85 text-white text-sm sm:text-base px-4 py-1.5 rounded-[8px] max-w-lg leading-snug">
              {currentCue.text}
            </span>
          </div>
        )}
      </div>

      {/* ─── Link / YouTube Helper Bar with Options ─── */}
      {media.youtubeId && (
        <div className="mb-6 px-4 py-3 rounded-[16px] bg-[#FAF8FD] border border-[#E9E4EF] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#4A4453]">
            <AlertCircle className="w-4 h-4 text-[#8061C9] shrink-0" />
            <span>
              {playerMode === 'poster'
                ? 'Previewing video card & timeline. Embed restrictions (e.g. Formula 1) bypassed.'
                : 'If YouTube shows "Video unavailable", switch back to Poster View.'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPlayerMode(playerMode === 'embed' ? 'poster' : 'embed')}
              className="px-3 py-1.5 rounded-[10px] bg-white border border-[#DDD6E2] text-[#211D25] hover:border-[#8061C9] font-medium transition cursor-pointer flex items-center gap-1.5"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#6D3FC0]" />
              <span>{playerMode === 'embed' ? 'Switch to Poster' : 'Try Embedded Player'}</span>
            </button>

            {media.sourceUrl && (
              <a
                href={media.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-[10px] bg-[#F5F1FA] text-[#6D3FC0] hover:bg-[#EFE7FA] font-medium flex items-center gap-1.5 transition"
              >
                <span>Watch on YouTube</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <label className="px-3 py-1.5 rounded-[10px] bg-[#6D3FC0] text-white hover:bg-[#5C35A3] font-medium flex items-center gap-1.5 cursor-pointer transition">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload local file</span>
              <input type="file" accept="video/*,audio/*" onChange={handleReplaceFile} className="hidden" />
            </label>
          </div>
        </div>
      )}

      {/* ─── Precision Timeline Scrubber ─── */}
      <div className="mb-8">
        {/* Safe duration to prevent division by zero */}
        {(() => {
          const safeDuration = Math.max(media.durationSeconds, 0.01);
          return (
            <>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-[#6D3FC0] text-white flex items-center justify-center hover:bg-[#5C35A3] transition shrink-0"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <span className="font-mono text-xs text-[#211D25]">
              {formatTime(currentTime)} / {formatTime(media.durationSeconds)}
            </span>
          </div>

          <div className="text-xs text-[#69636E] font-medium">
            {formatTime(selectionStart)} — {formatTime(selectionEnd)} ·{' '}
            <span className="text-[#6D3FC0]">{Math.max(0, Math.round(selectionEnd - selectionStart))}s</span> selected
          </div>
        </div>

        {/* Interactive Scrub Bar */}
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            seekTo(Math.max(0, Math.min(media.durationSeconds, pos * media.durationSeconds)));
          }}
          className="h-3 rounded-full bg-[#E9E4EF] relative cursor-pointer overflow-hidden"
        >
          {/* Selected Region */}
          <div
            className="absolute top-0 bottom-0 bg-[#8061C9]/25"
            style={{
              left: `${(selectionStart / safeDuration) * 100}%`,
              width: `${((selectionEnd - selectionStart) / safeDuration) * 100}%`,
            }}
          />
          {/* Playhead Progress */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-[#6D3FC0]"
            style={{
              width: `${(currentTime / safeDuration) * 100}%`,
            }}
          />
        </div>

        {/* Start / End Boundary Adjusters */}
        <div className="flex justify-between items-center text-[11px] text-[#918B95] mt-1.5">
          <button
            onClick={() => setSelection(currentTime, selectionEnd)}
            className="hover:text-[#6D3FC0] transition"
          >
            Set start to now ({formatTime(currentTime)})
          </button>
          <button
            onClick={() => setSelection(selectionStart, currentTime)}
            className="hover:text-[#6D3FC0] transition"
          >
            Set end to now ({formatTime(currentTime)})
          </button>
        </div>
            </>
          );
        })()}
      </div>

      {/* ─── Restrained Tool Selector (Progressive Disclosure) ─── */}
      <div className="flex items-center gap-6 border-b border-[#E9E4EF] mb-8 overflow-x-auto pb-1">
        <button
          onClick={() => selectTool('trim', 'video')}
          className={`pb-2.5 text-sm font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
            activeGroup === 'video'
              ? 'text-[#6D3FC0] border-b-2 border-[#6D3FC0]'
              : 'text-[#69636E] hover:text-[#211D25]'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>Video</span>
        </button>

        <button
          onClick={() => selectTool('audio_extract', 'audio')}
          className={`pb-2.5 text-sm font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
            activeGroup === 'audio'
              ? 'text-[#6D3FC0] border-b-2 border-[#6D3FC0]'
              : 'text-[#69636E] hover:text-[#211D25]'
          }`}
        >
          <Music className="w-4 h-4" />
          <span>Audio</span>
        </button>

        <button
          onClick={() => selectTool('subtitle_edit', 'subtitles')}
          className={`pb-2.5 text-sm font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
            activeGroup === 'subtitles'
              ? 'text-[#6D3FC0] border-b-2 border-[#6D3FC0]'
              : 'text-[#69636E] hover:text-[#211D25]'
          }`}
        >
          <Captions className="w-4 h-4" />
          <span>Subtitles</span>
        </button>

        <button
          onClick={() => selectTool('find_clip', 'find')}
          className={`pb-2.5 text-sm font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
            activeGroup === 'find'
              ? 'text-[#6D3FC0] border-b-2 border-[#6D3FC0]'
              : 'text-[#69636E] hover:text-[#211D25]'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Find moment</span>
        </button>
      </div>

      {/* ─── Active Tool Settings Panel (Spacious, No Cards-In-Cards) ─── */}
      <div className="mb-8">
        {/* GROUP 1: VIDEO UTILITIES */}
        {activeGroup === 'video' && (
          <div className="space-y-6">
            {/* Sub-tool tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'trim', label: 'Precision Trim' },
                { id: 'crop', label: 'Aspect Crop (9:16 / 1:1)' },
                { id: 'compress', label: 'Smart Compression' },
                { id: 'mute', label: 'Strip Audio' },
                { id: 'frame', label: 'Frame Grabber' },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setActiveTool(sub.id as WorkspaceTool)}
                  className={`px-3.5 py-1.5 rounded-[10px] text-xs font-medium transition cursor-pointer ${
                    activeTool === sub.id
                      ? 'bg-[#6D3FC0] text-white shadow-2xs'
                      : 'bg-[#F5F1FA] text-[#69636E] hover:text-[#211D25] hover:bg-[#EAE4F5]'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* PRECISION TRIM PANEL */}
            {activeTool === 'trim' && (
              <div className="p-5 rounded-[18px] bg-white border border-[#E9E4EF] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#F0EAF8]">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-[#6D3FC0]" />
                    <span className="text-sm font-semibold text-[#211D25]">High-Speed Lossless Stream Trimming</span>
                  </div>
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-[6px] bg-[#F5F1FA] text-[#6D3FC0] font-semibold border border-[#E9E4EF]">
                    Stream-Copy (0ms Re-encode Loss)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Start Point Input with Nudge */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#69636E] flex justify-between">
                      <span>In-Point Timecode</span>
                      <span className="font-mono text-[#211D25]">{selectionStart.toFixed(2)}s</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelection(Math.max(0, selectionStart - 1), selectionEnd)}
                        className="h-[36px] px-2.5 rounded-[8px] border border-[#DDD6E2] bg-[#FAF8FD] text-xs font-mono font-medium hover:bg-[#F0EAF8] text-[#211D25]"
                        title="Step backward 1 second"
                      >
                        -1s
                      </button>
                      <button
                        onClick={() => setSelection(Math.max(0, selectionStart - 0.1), selectionEnd)}
                        className="h-[36px] px-2 rounded-[8px] border border-[#DDD6E2] bg-[#FAF8FD] text-xs font-mono font-medium hover:bg-[#F0EAF8] text-[#211D25]"
                        title="Step backward 100ms"
                      >
                        -0.1s
                      </button>
                      <div className="flex-1 h-[36px] px-3 rounded-[8px] border border-[#DDD6E2] bg-white flex items-center justify-center font-mono text-sm font-semibold text-[#211D25]">
                        {formatTime(selectionStart)}
                      </div>
                      <button
                        onClick={() => setSelection(Math.min(selectionEnd - 0.1, selectionStart + 0.1), selectionEnd)}
                        className="h-[36px] px-2 rounded-[8px] border border-[#DDD6E2] bg-[#FAF8FD] text-xs font-mono font-medium hover:bg-[#F0EAF8] text-[#211D25]"
                        title="Step forward 100ms"
                      >
                        +0.1s
                      </button>
                      <button
                        onClick={() => setSelection(Math.min(selectionEnd - 1, selectionStart + 1), selectionEnd)}
                        className="h-[36px] px-2.5 rounded-[8px] border border-[#DDD6E2] bg-[#FAF8FD] text-xs font-mono font-medium hover:bg-[#F0EAF8] text-[#211D25]"
                        title="Step forward 1 second"
                      >
                        +1s
                      </button>
                    </div>
                  </div>

                  {/* End Point Input with Nudge */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#69636E] flex justify-between">
                      <span>Out-Point Timecode</span>
                      <span className="font-mono text-[#211D25]">{selectionEnd.toFixed(2)}s</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelection(selectionStart, Math.max(selectionStart + 1, selectionEnd - 1))}
                        className="h-[36px] px-2.5 rounded-[8px] border border-[#DDD6E2] bg-[#FAF8FD] text-xs font-mono font-medium hover:bg-[#F0EAF8] text-[#211D25]"
                        title="Step backward 1 second"
                      >
                        -1s
                      </button>
                      <button
                        onClick={() => setSelection(selectionStart, Math.max(selectionStart + 0.1, selectionEnd - 0.1))}
                        className="h-[36px] px-2 rounded-[8px] border border-[#DDD6E2] bg-[#FAF8FD] text-xs font-mono font-medium hover:bg-[#F0EAF8] text-[#211D25]"
                        title="Step backward 100ms"
                      >
                        -0.1s
                      </button>
                      <div className="flex-1 h-[36px] px-3 rounded-[8px] border border-[#DDD6E2] bg-white flex items-center justify-center font-mono text-sm font-semibold text-[#211D25]">
                        {formatTime(selectionEnd)}
                      </div>
                      <button
                        onClick={() => setSelection(selectionStart, Math.min(media.durationSeconds, selectionEnd + 0.1))}
                        className="h-[36px] px-2 rounded-[8px] border border-[#DDD6E2] bg-[#FAF8FD] text-xs font-mono font-medium hover:bg-[#F0EAF8] text-[#211D25]"
                        title="Step forward 100ms"
                      >
                        +0.1s
                      </button>
                      <button
                        onClick={() => setSelection(selectionStart, Math.min(media.durationSeconds, selectionEnd + 1))}
                        className="h-[36px] px-2.5 rounded-[8px] border border-[#DDD6E2] bg-[#FAF8FD] text-xs font-mono font-medium hover:bg-[#F0EAF8] text-[#211D25]"
                        title="Step forward 1 second"
                      >
                        +1s
                      </button>
                    </div>
                  </div>
                </div>

                {/* Output Container Choice */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[#69636E]">Target Container:</span>
                    <div className="inline-flex rounded-[8px] p-0.5 bg-[#FAF8FD] border border-[#E9E4EF]">
                      <button
                        onClick={() => setCutFormat('mp4')}
                        className={`px-3 py-1 rounded-[6px] text-xs font-semibold cursor-pointer ${
                          cutFormat === 'mp4' ? 'bg-[#6D3FC0] text-white shadow-2xs' : 'text-[#69636E]'
                        }`}
                      >
                        MP4 (H.264/AAC)
                      </button>
                      <button
                        onClick={() => setCutFormat('webm')}
                        className={`px-3 py-1 rounded-[6px] text-xs font-semibold cursor-pointer ${
                          cutFormat === 'webm' ? 'bg-[#6D3FC0] text-white shadow-2xs' : 'text-[#69636E]'
                        }`}
                      >
                        WebM (VP9/Opus)
                      </button>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-[#69636E]">
                    Duration: <span className="font-semibold text-[#6D3FC0]">{Math.max(0, Math.round(selectionEnd - selectionStart))}s</span>
                  </div>
                </div>
              </div>
            )}

            {activeTool === 'crop' && (
              <div className="p-5 rounded-[18px] bg-white border border-[#E9E4EF] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#211D25]">Smart Aspect Cropping</span>
                  <span className="text-xs text-[#918B95]">Auto-centered viewport with zero stretch</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: '9:16', title: '9:16 Vertical', desc: 'TikTok, Shorts, IG Reels' },
                    { id: '1:1', title: '1:1 Square', desc: 'Instagram Feed, LinkedIn' },
                    { id: '16:9', title: '16:9 Landscape', desc: 'YouTube Standard, Web' },
                    { id: 'original', title: 'Original Ratio', desc: 'Preserve source bounds' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setCrop({ ...crop, aspectRatio: r.id as any })}
                      className={`p-3 rounded-[14px] text-left border transition cursor-pointer ${
                        crop.aspectRatio === r.id
                          ? 'border-[#6D3FC0] bg-[#F5F1FA]'
                          : 'border-[#E9E4EF] bg-white hover:border-[#DDD6E2]'
                      }`}
                    >
                      <p className={`text-xs font-bold ${crop.aspectRatio === r.id ? 'text-[#6D3FC0]' : 'text-[#211D25]'}`}>
                        {r.title}
                      </p>
                      <p className="text-[11px] text-[#918B95] mt-0.5">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SMART COMPRESSION PANEL */}
            {activeTool === 'compress' && (
              <div className="p-5 rounded-[18px] bg-white border border-[#E9E4EF] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-[#6D3FC0]" />
                    <span className="text-sm font-semibold text-[#211D25]">Two-Pass H.264 Rate Control</span>
                  </div>
                  <span className="text-xs text-[#69636E]">
                    Source: <span className="font-mono text-[#211D25]">{formatBytes(media.fileSize)}</span>
                  </span>
                </div>

                {/* Target presets */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#69636E]">Platform & Size Targets:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'discord', name: 'Discord Share', target: '< 25 MB', crf: 'smaller', res: '1280x720' },
                      { id: 'whatsapp', name: 'WhatsApp Web', target: '< 16 MB', crf: 'smaller', res: '854x480' },
                      { id: 'email', name: 'Email Attachment', target: '< 10 MB', crf: 'smaller', res: '854x480' },
                      { id: 'custom', name: 'Studio CRF Preset', target: 'Auto-rate', crf: 'balanced', res: 'original' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setCompressPreset(p.id as any);
                          setCompressQuality(p.crf as any);
                          setCompressResolution(p.res);
                        }}
                        className={`p-3 rounded-[12px] text-left border transition cursor-pointer ${
                          compressPreset === p.id
                            ? 'border-[#6D3FC0] bg-[#F5F1FA]'
                            : 'border-[#E9E4EF] bg-white hover:border-[#DDD6E2]'
                        }`}
                      >
                        <p className={`text-xs font-semibold ${compressPreset === p.id ? 'text-[#6D3FC0]' : 'text-[#211D25]'}`}>
                          {p.name}
                        </p>
                        <p className="text-[11px] font-mono text-[#918B95] mt-0.5">{p.target}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#69636E]">Encoding Quality Constant (CRF):</p>
                  <div className="flex gap-2">
                    {[
                      { id: 'smaller', label: 'High Compression (CRF 32)', est: '~70% savings' },
                      { id: 'balanced', label: 'Balanced Quality (CRF 26)', est: '~45% savings' },
                      { id: 'higher', label: 'Visual Lossless (CRF 20)', est: '~20% savings' },
                    ].map((q) => (
                      <button
                        key={q.id}
                        onClick={() => {
                          setCompressQuality(q.id as any);
                          setCompressPreset('custom');
                        }}
                        className={`flex-1 p-2.5 rounded-[12px] text-left border transition cursor-pointer ${
                          compressQuality === q.id
                            ? 'border-[#6D3FC0] bg-[#F5F1FA]'
                            : 'border-[#E9E4EF] bg-white'
                        }`}
                      >
                        <p className={`text-xs font-semibold ${compressQuality === q.id ? 'text-[#6D3FC0]' : 'text-[#211D25]'}`}>
                          {q.label}
                        </p>
                        <p className="text-[10px] text-emerald-600 font-medium mt-0.5">{q.est}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => setShowAdvancedCompress(!showAdvancedCompress)}
                    className="text-xs text-[#8061C9] hover:underline font-medium"
                  >
                    {showAdvancedCompress ? 'Hide advanced resolution scaling' : 'Show advanced resolution scaling'}
                  </button>

                  {showAdvancedCompress && (
                    <div className="mt-3 p-3.5 rounded-[12px] bg-[#FAF8FD] border border-[#E9E4EF] flex items-center justify-between text-xs">
                      <span className="text-[#69636E]">Target Resolution:</span>
                      <select
                        value={compressResolution}
                        onChange={(e) => {
                          setCompressResolution(e.target.value);
                          setCompressPreset('custom');
                        }}
                        className="px-3 py-1.5 rounded-[8px] border border-[#DDD6E2] bg-white font-mono text-xs text-[#211D25]"
                      >
                        <option value="original">Original ({media.width ? `${media.width}×${media.height}` : 'Auto'})</option>
                        <option value="1920x1080">1080p FHD (1920×1080)</option>
                        <option value="1280x720">720p HD (1280×720)</option>
                        <option value="854x480">480p SD (854×480)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MUTE VIDEO PANEL */}
            {activeTool === 'mute' && (
              <div className="p-5 rounded-[18px] bg-white border border-[#E9E4EF] flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-[#211D25]">Direct Audio Stream Deplexing</h4>
                  <p className="text-xs text-[#69636E] mt-0.5">
                    Strips the audio track cleanly without re-encoding video frames, completing instantly with 100% quality retention.
                  </p>
                </div>
                <div className="px-3.5 py-1.5 rounded-[10px] bg-[#F5F1FA] text-[#6D3FC0] text-xs font-semibold shrink-0">
                  Zero Loss Copy
                </div>
              </div>
            )}

            {/* FRAME GRABBER PANEL */}
            {activeTool === 'frame' && (
              <div className="p-5 rounded-[18px] bg-white border border-[#E9E4EF] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#6D3FC0]" />
                    <span className="text-sm font-semibold text-[#211D25]">Exact Video Frame Extraction</span>
                  </div>
                  <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-[6px] bg-[#F5F1FA] text-[#6D3FC0]">
                    At {formatTime(currentTime)} ({currentTime.toFixed(2)}s)
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="text-xs text-[#69636E] max-w-md">
                    Scrub the timeline to the desired frame. Antigravity extracts the pristine frame directly from the video stream without compression artifacts.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#69636E]">Image Container:</span>
                    <div className="inline-flex rounded-[8px] p-0.5 bg-[#FAF8FD] border border-[#E9E4EF]">
                      <button
                        onClick={() => setFrameFormat('jpg')}
                        className={`px-3 py-1 rounded-[6px] text-xs font-semibold cursor-pointer ${
                          frameFormat === 'jpg' ? 'bg-[#6D3FC0] text-white shadow-2xs' : 'text-[#69636E]'
                        }`}
                      >
                        JPEG (High Quality)
                      </button>
                      <button
                        onClick={() => setFrameFormat('png')}
                        className={`px-3 py-1 rounded-[6px] text-xs font-semibold cursor-pointer ${
                          frameFormat === 'png' ? 'bg-[#6D3FC0] text-white shadow-2xs' : 'text-[#69636E]'
                        }`}
                      >
                        PNG (Lossless 24-bit)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GROUP 2: AUDIO UTILITIES — HIGH TECHNICAL DEPTH */}
        {activeGroup === 'audio' && (
          <div className="space-y-6">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTool('audio_extract')}
                className={`px-3.5 py-1.5 rounded-[10px] text-xs font-medium transition cursor-pointer ${
                  activeTool === 'audio_extract'
                    ? 'bg-[#6D3FC0] text-white shadow-2xs'
                    : 'bg-[#F5F1FA] text-[#69636E] hover:text-[#211D25]'
                }`}
              >
                Studio Audio Extractor
              </button>
              <button
                onClick={() => setActiveTool('ringtone')}
                className={`px-3.5 py-1.5 rounded-[10px] text-xs font-medium transition cursor-pointer ${
                  activeTool === 'ringtone'
                    ? 'bg-[#6D3FC0] text-white shadow-2xs'
                    : 'bg-[#F5F1FA] text-[#69636E] hover:text-[#211D25]'
                }`}
              >
                Ringtone Architect
              </button>
            </div>

            {/* AUDIO EXTRACTOR STUDIO */}
            {activeTool === 'audio_extract' && (
              <div className="p-5 rounded-[18px] bg-white border border-[#E9E4EF] space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#F0EAF8]">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-[#6D3FC0]" />
                    <h3 className="text-sm font-semibold text-[#211D25]">Master Audio Demuxer & Transcoder</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#6D3FC0] bg-[#F5F1FA] px-2.5 py-1 rounded-[6px]">
                    <Waves className="w-3.5 h-3.5" />
                    <span>Est. Size: {Math.max(0.5, Math.round(((audioScope === 'selection' ? Math.max(1, selectionEnd - selectionStart) : (media.durationSeconds || 60)) * (audioFormat === 'wav' || audioFormat === 'flac' ? 1411 : audioBitrate)) / 8192 * 10) / 10)} MB</span>
                  </div>
                </div>

                {/* Scope selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#69636E]">Extraction Range:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => setAudioScope('full')}
                      className={`p-3 rounded-[12px] text-left border transition cursor-pointer ${
                        audioScope === 'full'
                          ? 'border-[#6D3FC0] bg-[#F5F1FA]'
                          : 'border-[#E9E4EF] bg-white hover:border-[#DDD6E2]'
                      }`}
                    >
                      <p className={`text-xs font-semibold ${audioScope === 'full' ? 'text-[#6D3FC0]' : 'text-[#211D25]'}`}>
                        Full Audio Track
                      </p>
                      <p className="text-[11px] text-[#918B95] mt-0.5">
                        Export complete track (0:00 — {formatTime(media.durationSeconds)})
                      </p>
                    </button>
                    <button
                      onClick={() => setAudioScope('selection')}
                      className={`p-3 rounded-[12px] text-left border transition cursor-pointer ${
                        audioScope === 'selection'
                          ? 'border-[#6D3FC0] bg-[#F5F1FA]'
                          : 'border-[#E9E4EF] bg-white hover:border-[#DDD6E2]'
                      }`}
                    >
                      <p className={`text-xs font-semibold ${audioScope === 'selection' ? 'text-[#6D3FC0]' : 'text-[#211D25]'}`}>
                        Timeline Selection Only
                      </p>
                      <p className="text-[11px] text-[#918B95] mt-0.5">
                        Bounded: {formatTime(selectionStart)} — {formatTime(selectionEnd)} ({Math.round(selectionEnd - selectionStart)}s)
                      </p>
                    </button>
                  </div>
                </div>

                {/* Format selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#69636E]">Target Audio Codec & Container:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: 'mp3', name: 'MP3 (MPEG Audio)', desc: 'LAME VBR/CBR · Universal Compatibility' },
                      { id: 'm4a', name: 'M4A / AAC', desc: 'Apple Core Audio · High Efficiency' },
                      { id: 'wav', name: 'WAV (PCM Uncompressed)', desc: 'Broadcast 1411 kbps · 16/24-bit' },
                      { id: 'flac', name: 'FLAC (Lossless)', desc: 'Free Lossless Audio Codec · Bit-perfect' },
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        onClick={() => setAudioFormat(fmt.id as any)}
                        className={`p-3 rounded-[14px] text-left border transition cursor-pointer ${
                          audioFormat === fmt.id
                            ? 'border-[#6D3FC0] bg-[#F5F1FA]'
                            : 'border-[#E9E4EF] bg-white hover:border-[#DDD6E2]'
                        }`}
                      >
                        <p className={`text-xs font-bold ${audioFormat === fmt.id ? 'text-[#6D3FC0]' : 'text-[#211D25]'}`}>
                          {fmt.name}
                        </p>
                        <p className="text-[10px] text-[#918B95] mt-0.5 leading-snug">{fmt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bitrate selection (for lossy formats) */}
                {(audioFormat === 'mp3' || audioFormat === 'm4a') && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#69636E]">Constant Bitrate (CBR):</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { rate: 320, label: '320 kbps', grade: 'Studio Master' },
                        { rate: 256, label: '256 kbps', grade: 'Audiophile HQ' },
                        { rate: 192, label: '192 kbps', grade: 'Standard Music' },
                        { rate: 128, label: '128 kbps', grade: 'Podcast / Voice' },
                      ].map((b) => (
                        <button
                          key={b.rate}
                          onClick={() => setAudioBitrate(b.rate as any)}
                          className={`p-2.5 rounded-[12px] text-left border transition cursor-pointer ${
                            audioBitrate === b.rate
                              ? 'border-[#6D3FC0] bg-[#F5F1FA]'
                              : 'border-[#E9E4EF] bg-white hover:border-[#DDD6E2]'
                          }`}
                        >
                          <p className={`text-xs font-semibold ${audioBitrate === b.rate ? 'text-[#6D3FC0]' : 'text-[#211D25]'}`}>
                            {b.label}
                          </p>
                          <p className="text-[10px] text-[#918B95] mt-0.5">{b.grade}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audio Master enhancements */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-[#69636E]">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={audioNormalize}
                      onChange={(e) => setAudioNormalize(e.target.checked)}
                      className="rounded text-[#6D3FC0] focus:ring-[#6D3FC0]"
                    />
                    <span>EBU R128 Loudness Normalization (-16 LUFS target)</span>
                  </label>
                  <span className="text-[11px] text-[#918B95]">Sample Rate: 44.1 kHz Stereo</span>
                </div>
              </div>
            )}

            {/* RINGTONE ARCHITECT */}
            {activeTool === 'ringtone' && (
              <div className="p-5 rounded-[18px] bg-white border border-[#E9E4EF] space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#F0EAF8]">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#6D3FC0]" />
                    <h3 className="text-sm font-semibold text-[#211D25]">Smartphone Ringtone Architect</h3>
                  </div>
                  {/* Duration Gauge Meter */}
                  {(() => {
                    const selDur = Math.max(0, selectionEnd - selectionStart);
                    const maxAllowed = ringtoneTarget === 'iphone' ? 30 : 40;
                    const isOver = selDur > maxAllowed;
                    return (
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-[6px] ${
                          isOver ? 'bg-amber-100 text-amber-700' : 'bg-[#F5F1FA] text-[#6D3FC0]'
                        }`}>
                          Length: {Math.round(selDur)}s / {maxAllowed}s max
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#69636E]">Target Operating System & Container:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => setRingtoneTarget('iphone')}
                      className={`p-3.5 rounded-[14px] text-left border transition cursor-pointer ${
                        ringtoneTarget === 'iphone'
                          ? 'border-[#6D3FC0] bg-[#F5F1FA]'
                          : 'border-[#E9E4EF] bg-white hover:border-[#DDD6E2]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-bold ${ringtoneTarget === 'iphone' ? 'text-[#6D3FC0]' : 'text-[#211D25]'}`}>
                          Apple iPhone (iOS)
                        </p>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-[#6D3FC0] border border-[#E9E4EF]">
                          .M4R (AAC)
                        </span>
                      </div>
                      <p className="text-[11px] text-[#918B95] mt-1">
                        Formatted strictly to Apple's 30-second hard limit. Imports directly into iTunes / GarageBand / iOS Sounds.
                      </p>
                    </button>

                    <button
                      onClick={() => setRingtoneTarget('android')}
                      className={`p-3.5 rounded-[14px] text-left border transition cursor-pointer ${
                        ringtoneTarget === 'android'
                          ? 'border-[#6D3FC0] bg-[#F5F1FA]'
                          : 'border-[#E9E4EF] bg-white hover:border-[#DDD6E2]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-bold ${ringtoneTarget === 'android' ? 'text-[#6D3FC0]' : 'text-[#211D25]'}`}>
                          Google Android & Others
                        </p>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-[#6D3FC0] border border-[#E9E4EF]">
                          .MP3 (320k)
                        </span>
                      </div>
                      <p className="text-[11px] text-[#918B95] mt-1">
                        High-bitrate MP3 tuned for Android sound settings with up to 40-second playback buffer.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Acoustic Smoothing / Fade Controls */}
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-medium text-[#69636E]">Acoustic Smoothing Filters:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className="p-3 rounded-[12px] bg-[#FAF8FD] border border-[#E9E4EF] flex items-center justify-between cursor-pointer select-none">
                      <div>
                        <p className="font-semibold text-[#211D25]">Soft Fade-In</p>
                        <p className="text-[11px] text-[#918B95]">Gradual 1.5s volume swell</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={ringtoneFadeIn}
                        onChange={(e) => setRingtoneFadeIn(e.target.checked)}
                        className="rounded text-[#6D3FC0] focus:ring-[#6D3FC0]"
                      />
                    </label>

                    <label className="p-3 rounded-[12px] bg-[#FAF8FD] border border-[#E9E4EF] flex items-center justify-between cursor-pointer select-none">
                      <div>
                        <p className="font-semibold text-[#211D25]">Seamless Fade-Out</p>
                        <p className="text-[11px] text-[#918B95]">Prevents harsh cutoffs (2.0s tail)</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={ringtoneFadeOut}
                        onChange={(e) => setRingtoneFadeOut(e.target.checked)}
                        className="rounded text-[#6D3FC0] focus:ring-[#6D3FC0]"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GROUP 3: SUBTITLE EDITOR */}
        {activeGroup === 'subtitles' && (
          <SubtitleEditor
            subtitleTracks={subtitleTracks}
            activeTrackId={activeSubtitleTrackId}
            onSetActiveTrack={setActiveSubtitleTrackId}
            onUpdateTrack={updateSubtitleTrack}
            onAddTrack={addSubtitleTrack}
            currentTime={currentTime}
            onSeek={seekTo}
            mediaDurationSeconds={media.durationSeconds}
            mediaId={media.id}
          />
        )}

        {/* GROUP 4: FIND A MOMENT (FOCUSED AI) */}
        {activeGroup === 'find' && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <h3 className="text-base font-semibold text-[#211D25]">Find a moment</h3>
              <p className="text-xs text-[#69636E] mt-0.5">Describe what you are looking for in the video.</p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={findQuery}
                onChange={(e) => setFindQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFindMoment()}
                placeholder="Find where they explain why the engine failed"
                className="flex-1 h-[46px] rounded-[12px] border border-[#E9E4EF] bg-white px-4 text-sm text-[#211D25] outline-none focus:border-[#8061C9]"
              />
              <button
                onClick={() => handleFindMoment()}
                disabled={isSearchingMoment || !findQuery.trim()}
                className="h-[46px] px-6 rounded-[12px] bg-[#6D3FC0] text-white text-xs font-medium hover:bg-[#5C35A3] transition disabled:opacity-40 shrink-0"
              >
                {isSearchingMoment ? 'Searching...' : 'Find'}
              </button>
            </div>

            {/* Suggestion Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {['Best moment', 'Strong opening', 'Funny moment', 'Key explanation'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => {
                    setFindQuery(chip);
                    handleFindMoment(chip);
                  }}
                  className="px-3 py-1.5 rounded-[10px] bg-[#F5F1FA] text-[#69636E] text-xs hover:text-[#211D25] hover:bg-[#E9E4EF] transition"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Error notice */}
            {findError && (
              <p className="text-xs text-red-500 flex items-center gap-1.5 pt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {findError}
              </p>
            )}

            {/* Found Moments Cards (Clean, 5–30s limit strictly enforced) */}
            {foundMoments.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-semibold text-[#211D25] uppercase tracking-wider">
                  Found this moment
                </h4>
                {foundMoments.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-[16px] bg-white border border-[#E9E4EF] flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-[#211D25]">
                          {formatTime(m.start)} — {formatTime(m.end)}
                        </span>
                        <span className="text-xs text-[#8061C9] font-medium bg-[#F0EAF8] px-2 py-0.5 rounded-[6px]">
                          {Math.round(m.end - m.start)} sec
                        </span>
                      </div>
                      <p className="text-xs text-[#69636E] mt-1">{m.reason}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => seekTo(m.start)}
                        className="px-3 py-1.5 rounded-[10px] text-xs font-medium text-[#69636E] hover:text-[#211D25] hover:bg-[#F5F1FA] transition"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => applyMomentToTimeline(m.start, m.end)}
                        className="px-3.5 py-1.5 rounded-[10px] text-xs font-medium bg-[#6D3FC0] text-white hover:bg-[#5C35A3] transition"
                      >
                        Use this section
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Processing Progress / Completed Status ─── */}
      {jobStatus !== 'idle' && (
        <div className="mb-6 p-4 rounded-[16px] bg-[#FAF8FD] border border-[#DDD6E2]">
          <div className="flex items-center justify-between text-xs font-medium mb-2">
            <span className="text-[#211D25] flex items-center gap-2">
              {jobStatus === 'processing' || jobStatus === 'queued' ? (
                <>
                  <Loader2 className="w-4 h-4 text-[#6D3FC0] animate-spin" />
                  <span>Processing {activeTool.replace('_', ' ')}...</span>
                </>
              ) : jobStatus === 'completed' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Ready to download</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>{jobErrorMessage || 'Processing error'}</span>
                </>
              )}
            </span>
            <span className="font-mono text-[#8061C9]">{jobProgress}%</span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-[#E9E4EF] overflow-hidden">
            <div
              className="h-full bg-[#6D3FC0] transition-all duration-300"
              style={{ width: `${jobProgress}%` }}
            />
          </div>

          {/* Download button once completed */}
          {jobStatus === 'completed' && jobDownloadUrl && (
            <div className="mt-3 flex justify-end">
              <a
                href={jobDownloadUrl}
                download={jobOutputFilename || 'export'}
                className="h-[38px] px-5 rounded-[10px] bg-[#6D3FC0] text-white text-xs font-medium hover:bg-[#5C35A3] transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download file</span>
              </a>
            </div>
          )}
        </div>
      )}

      {/* ─── Primary Action Bar ─── */}
      <div className="flex justify-end pt-4 border-t border-[#E9E4EF]">
        <button
          onClick={handleExport}
          disabled={jobStatus === 'processing' || jobStatus === 'queued'}
          className="h-[48px] px-8 rounded-[12px] bg-[#6D3FC0] text-white text-sm font-medium hover:bg-[#5C35A3] transition disabled:opacity-40 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>
            Export{' '}
            {activeTool === 'trim'
              ? 'Clip'
              : activeTool === 'audio_extract'
              ? `${audioFormat.toUpperCase()}`
              : activeTool === 'ringtone'
              ? 'Ringtone'
              : activeTool === 'crop' || activeTool === 'reel'
              ? 'Reel'
              : activeTool === 'compress'
              ? 'Compressed Video'
              : activeTool === 'mute'
              ? 'Muted Video'
              : activeTool === 'frame'
              ? 'Frame'
              : activeTool.startsWith('subtitle_')
              ? 'Subtitled Video'
              : 'Media'}
          </span>
        </button>
      </div>
    </div>
  );
}
