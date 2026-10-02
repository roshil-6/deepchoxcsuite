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

  // Audio & export states
  const [audioFormat, setAudioFormat] = useState<'mp3' | 'wav'>('mp3');
  const [ringtoneTarget, setRingtoneTarget] = useState<'iphone' | 'android'>('iphone');
  const [compressQuality, setCompressQuality] = useState<'smaller' | 'balanced' | 'higher'>('balanced');
  const [showAdvancedCompress, setShowAdvancedCompress] = useState(false);
  const [compressResolution, setCompressResolution] = useState('original');
  const [muteAudio, setMuteAudio] = useState(false);

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
      el.play();
      setIsPlaying(true);
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
      startProcessingJob('cut', { startMs, endMs, outputFormat: 'mp4' });
    } else if (activeTool === 'audio_extract') {
      startProcessingJob('audio_extract', { format: audioFormat, bitrate: 320 });
    } else if (activeTool === 'ringtone') {
      startProcessingJob('ringtone', {
        startMs,
        endMs: Math.min(startMs + (ringtoneTarget === 'iphone' ? 30000 : 40000), endMs),
        target: ringtoneTarget,
        fadeIn: true,
        fadeOut: true,
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
      startProcessingJob('frame_grab', { timestampMs: Math.round(currentTime * 1000), format: 'jpg' });
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
      <div className="relative rounded-[22px] overflow-hidden bg-[#18161D] aspect-video max-h-[440px] mx-auto mb-6 flex items-center justify-center">
        {!isAudioOnly ? (
          <video
            ref={videoRef}
            src={media.url}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            onClick={togglePlay}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-white py-12">
            <audio
              ref={audioRef}
              src={media.url}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
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
            <div className="flex gap-2">
              {[
                { id: 'trim', label: 'Trim' },
                { id: 'crop', label: 'Crop 9:16' },
                { id: 'compress', label: 'Compress' },
                { id: 'mute', label: 'Mute' },
                { id: 'frame', label: 'Frame Grab' },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setActiveTool(sub.id as WorkspaceTool)}
                  className={`px-3 py-1.5 rounded-[10px] text-xs font-medium transition ${
                    activeTool === sub.id
                      ? 'bg-[#6D3FC0] text-white'
                      : 'bg-[#F5F1FA] text-[#69636E] hover:text-[#211D25]'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {activeTool === 'trim' && (
              <div className="space-y-4">
                <p className="text-sm text-[#69636E]">
                  Cut between <span className="font-mono text-[#211D25]">{formatTime(selectionStart)}</span> and{' '}
                  <span className="font-mono text-[#211D25]">{formatTime(selectionEnd)}</span> ({Math.round(selectionEnd - selectionStart)}s total).
                </p>
              </div>
            )}

            {activeTool === 'crop' && (
              <div className="space-y-3">
                <p className="text-xs text-[#69636E]">Aspect ratio preset:</p>
                <div className="flex gap-2">
                  {(['9:16', '1:1', '16:9', 'original'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setCrop({ ...crop, aspectRatio: r })}
                      className={`px-4 py-2 rounded-[12px] text-xs font-medium border ${
                        crop.aspectRatio === r
                          ? 'border-[#6D3FC0] bg-[#F0EAF8] text-[#6D3FC0]'
                          : 'border-[#E9E4EF] bg-white text-[#69636E]'
                      }`}
                    >
                      {r === '9:16' ? '9:16 Reel / Short' : r === '1:1' ? '1:1 Square' : r === '16:9' ? '16:9 Widescreen' : 'Original'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTool === 'compress' && (
              <div className="space-y-4">
                <p className="text-xs text-[#69636E]">Target quality:</p>
                <div className="flex gap-2">
                  {(['smaller', 'balanced', 'higher'] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => setCompressQuality(q)}
                      className={`px-4 py-2 rounded-[12px] text-xs font-medium border capitalize ${
                        compressQuality === q
                          ? 'border-[#6D3FC0] bg-[#F0EAF8] text-[#6D3FC0]'
                          : 'border-[#E9E4EF] bg-white text-[#69636E]'
                      }`}
                    >
                      {q === 'smaller' ? 'Smaller file' : q === 'balanced' ? 'Balanced' : 'Higher quality'}
                    </button>
                  ))}
                </div>

                <div>
                  <button
                    onClick={() => setShowAdvancedCompress(!showAdvancedCompress)}
                    className="text-xs text-[#8061C9] hover:underline"
                  >
                    {showAdvancedCompress ? 'Hide advanced settings' : 'Advanced settings'}
                  </button>

                  {showAdvancedCompress && (
                    <div className="mt-3 p-4 rounded-[14px] bg-[#FAF8FD] border border-[#E9E4EF] flex items-center gap-4 text-xs">
                      <span>Resolution:</span>
                      <select
                        value={compressResolution}
                        onChange={(e) => setCompressResolution(e.target.value)}
                        className="px-3 py-1.5 rounded-[10px] border border-[#DDD6E2] bg-white"
                      >
                        <option value="original">Original ({media.width ? `${media.width}×${media.height}` : 'Auto'})</option>
                        <option value="1280x720">720p HD (1280×720)</option>
                        <option value="854x480">480p SD (854×480)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTool === 'mute' && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="muteToggle"
                  checked={muteAudio}
                  onChange={(e) => setMuteAudio(e.target.checked)}
                  className="rounded text-[#6D3FC0]"
                />
                <label htmlFor="muteToggle" className="text-sm text-[#211D25]">
                  Remove audio track entirely from exported video
                </label>
              </div>
            )}

            {activeTool === 'frame' && (
              <div className="space-y-3">
                <p className="text-sm text-[#69636E]">
                  Capture a crisp, full-resolution JPEG frame from the video at playhead position{' '}
                  <span className="font-mono font-medium text-[#211D25]">{formatTime(currentTime)}</span>.
                </p>
                <p className="text-xs text-[#918B95]">
                  Use the timeline scrubber above to scrub to the exact frame you want to extract, then click Export Frame.
                </p>
              </div>
            )}
          </div>
        )}

        {/* GROUP 2: AUDIO UTILITIES */}
        {activeGroup === 'audio' && (
          <div className="space-y-6">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTool('audio_extract')}
                className={`px-3 py-1.5 rounded-[10px] text-xs font-medium transition ${
                  activeTool === 'audio_extract'
                    ? 'bg-[#6D3FC0] text-white'
                    : 'bg-[#F5F1FA] text-[#69636E]'
                }`}
              >
                Extract Audio
              </button>
              <button
                onClick={() => setActiveTool('ringtone')}
                className={`px-3 py-1.5 rounded-[10px] text-xs font-medium transition ${
                  activeTool === 'ringtone'
                    ? 'bg-[#6D3FC0] text-white'
                    : 'bg-[#F5F1FA] text-[#69636E]'
                }`}
              >
                Make Ringtone
              </button>
            </div>

            {activeTool === 'audio_extract' && (
              <div className="space-y-3">
                <p className="text-xs text-[#69636E]">Select audio format:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAudioFormat('mp3')}
                    className={`px-4 py-2 rounded-[12px] text-xs font-medium border ${
                      audioFormat === 'mp3'
                        ? 'border-[#6D3FC0] bg-[#F0EAF8] text-[#6D3FC0]'
                        : 'border-[#E9E4EF] bg-white text-[#69636E]'
                    }`}
                  >
                    MP3 (320 kbps Crisp)
                  </button>
                  <button
                    onClick={() => setAudioFormat('wav')}
                    className={`px-4 py-2 rounded-[12px] text-xs font-medium border ${
                      audioFormat === 'wav'
                        ? 'border-[#6D3FC0] bg-[#F0EAF8] text-[#6D3FC0]'
                        : 'border-[#E9E4EF] bg-white text-[#69636E]'
                    }`}
                  >
                    WAV (Lossless 1411 kbps)
                  </button>
                </div>
              </div>
            )}

            {activeTool === 'ringtone' && (
              <div className="space-y-3">
                <p className="text-xs text-[#69636E]">Phone format:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRingtoneTarget('iphone')}
                    className={`px-4 py-2 rounded-[12px] text-xs font-medium border ${
                      ringtoneTarget === 'iphone'
                        ? 'border-[#6D3FC0] bg-[#F0EAF8] text-[#6D3FC0]'
                        : 'border-[#E9E4EF] bg-white text-[#69636E]'
                    }`}
                  >
                    iPhone (M4R · max 30s)
                  </button>
                  <button
                    onClick={() => setRingtoneTarget('android')}
                    className={`px-4 py-2 rounded-[12px] text-xs font-medium border ${
                      ringtoneTarget === 'android'
                        ? 'border-[#6D3FC0] bg-[#F0EAF8] text-[#6D3FC0]'
                        : 'border-[#E9E4EF] bg-white text-[#69636E]'
                    }`}
                  >
                    Android (MP3 · max 40s)
                  </button>
                </div>
                <p className="text-[11px] text-[#918B95]">
                  Automatically trimmed to fit ringtone length limit with gentle fade in/out.
                </p>
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
