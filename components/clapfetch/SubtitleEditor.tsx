'use client';

import React, { useRef, useState, useEffect } from 'react';
import { SubtitleTrack, SubtitleCue } from '@/lib/media/types';
import { Languages, Plus, Trash2, Split, Merge, Download, Upload, Check } from 'lucide-react';

interface SubtitleEditorProps {
  subtitleTracks: SubtitleTrack[];
  activeTrackId: string | null;
  onSetActiveTrack: (id: string) => void;
  onUpdateTrack: (trackId: string, updater: (t: SubtitleTrack) => SubtitleTrack) => void;
  onAddTrack: (track: SubtitleTrack) => void;
  currentTime: number;
  onSeek: (time: number) => void;
  mediaDurationSeconds: number;
  mediaId?: string;
}

const SUPPORTED_LANGUAGES = [
  { code: 'es', label: 'Spanish' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'hi', label: 'Hindi' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'en', label: 'English' },
];

export function SubtitleEditor({
  subtitleTracks,
  activeTrackId,
  onSetActiveTrack,
  onUpdateTrack,
  onAddTrack,
  currentTime,
  onSeek,
  mediaDurationSeconds,
  mediaId = 'media-session',
}: SubtitleEditorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [targetLang, setTargetLang] = useState('es');
  const [showTranslatePanel, setShowTranslatePanel] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const activeTrack = subtitleTracks.find((t) => t.id === activeTrackId) || subtitleTracks[0];

  const notify = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const formatTimecode = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Auto-scroll to active cue during playback (only when not actively editing)
  useEffect(() => {
    if (isEditingText || !scrollRef.current || !activeTrack) return;
    const activeEl = scrollRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentTime, isEditingText, activeTrack]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          mediaId,
          durationSeconds: mediaDurationSeconds,
          language: 'en',
        }),
      });
      const data = await res.json();
      if (data.ok && data.track) {
        onAddTrack(data.track);
        onSetActiveTrack(data.track.id);
        notify('Subtitles generated');
      } else {
        notify(data.error || 'Failed to generate');
      }
    } catch {
      notify('Generation error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTranslate = async () => {
    if (!activeTrack) return;
    setIsTranslating(true);
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang) || { label: 'Translation' };

    try {
      const res = await fetch('/api/subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'translate',
          track: activeTrack,
          targetLanguage: targetLang,
          targetLanguageLabel: langObj.label,
        }),
      });
      const data = await res.json();
      if (data.ok && data.track) {
        onAddTrack(data.track);
        onSetActiveTrack(data.track.id);
        setShowTranslatePanel(false);
        notify(`Translated to ${langObj.label}`);
      } else {
        notify(data.error || 'Translation failed');
      }
    } catch {
      notify('Translation network error');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleExport = async (format: 'srt' | 'vtt' | 'txt') => {
    if (!activeTrack) return;
    try {
      const res = await fetch('/api/subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export',
          cues: activeTrack.cues,
          format,
          filename: `${activeTrack.label.replace(/\s+/g, '_').toLowerCase()}`,
        }),
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTrack.label.replace(/[^a-z0-9]/gi, '_')}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify(`Exported as .${format}`);
    } catch {
      notify('Export failed');
    }
  };

  const handleImportSrt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const trackId = `track-imported-${Date.now()}`;
      const rawBlocks = content.split(/\r?\n\r?\n/).filter(Boolean);
      const cues: SubtitleCue[] = [];

      rawBlocks.forEach((block, index) => {
        const lines = block.split(/\r?\n/).filter(Boolean);
        if (lines.length >= 2) {
          const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
          if (timeMatch) {
            const startSec = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000;
            const endSec = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000;
            const text = lines.slice(2).join(' ').trim();
            cues.push({
              id: `cue-${index + 1}`,
              trackId,
              startTime: Math.round(startSec * 100) / 100,
              endTime: Math.round(endSec * 100) / 100,
              text,
              order: index,
            });
          }
        }
      });

      if (cues.length > 0) {
        const newTrack: SubtitleTrack = {
          id: trackId,
          mediaId,
          language: 'en',
          label: file.name.replace(/\.[^/.]+$/, '') + ' — Imported',
          isOriginal: true,
          createdAt: new Date().toISOString(),
          cues,
        };
        onAddTrack(newTrack);
        onSetActiveTrack(newTrack.id);
        notify(`Imported ${cues.length} subtitles`);
      } else {
        notify('No valid cues found in SRT');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSplitCue = (cue: SubtitleCue) => {
    if (!activeTrack) return;
    const mid = Math.round(((cue.startTime + cue.endTime) / 2) * 100) / 100;
    const words = cue.text.split(' ');
    const half = Math.ceil(words.length / 2);
    const text1 = words.slice(0, half).join(' ');
    const text2 = words.slice(half).join(' ');

    const cue1: SubtitleCue = { ...cue, endTime: mid, text: text1 || cue.text };
    const cue2: SubtitleCue = {
      id: `cue-${Date.now()}`,
      trackId: activeTrack.id,
      startTime: mid,
      endTime: cue.endTime,
      text: text2 || '...',
      order: cue.order + 1,
    };

    onUpdateTrack(activeTrack.id, (t) => {
      const idx = t.cues.findIndex((c) => c.id === cue.id);
      const newCues = [...t.cues];
      newCues.splice(idx, 1, cue1, cue2);
      return { ...t, cues: newCues.map((c, i) => ({ ...c, order: i })) };
    });
  };

  const handleMergeCue = (cue: SubtitleCue, index: number) => {
    if (!activeTrack || index >= activeTrack.cues.length - 1) return;
    const nextCue = activeTrack.cues[index + 1];

    const mergedCue: SubtitleCue = {
      ...cue,
      endTime: nextCue.endTime,
      text: `${cue.text} ${nextCue.text}`.trim(),
    };

    onUpdateTrack(activeTrack.id, (t) => {
      const newCues = t.cues.filter((c) => c.id !== nextCue.id);
      const idx = newCues.findIndex((c) => c.id === cue.id);
      newCues[idx] = mergedCue;
      return { ...t, cues: newCues.map((c, i) => ({ ...c, order: i })) };
    });
  };

  const handleDeleteCue = (cueId: string) => {
    if (!activeTrack) return;
    onUpdateTrack(activeTrack.id, (t) => ({
      ...t,
      cues: t.cues.filter((c) => c.id !== cueId).map((c, i) => ({ ...c, order: i })),
    }));
  };

  if (subtitleTracks.length === 0) {
    return (
      <div className="py-12 px-6 text-center bg-white rounded-[20px] border border-[#E9E4EF]">
        <h3 className="text-lg font-medium text-[#211D25] mb-2">Add subtitles</h3>
        <p className="text-sm text-[#69636E] mb-6 max-w-md mx-auto">
          Transcribe dialogue automatically or bring an existing subtitle file.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="h-[44px] px-6 rounded-[12px] bg-[#6D3FC0] text-white text-sm font-medium hover:bg-[#5C35A3] transition disabled:opacity-50"
          >
            {isGenerating ? 'Transcribing...' : 'Generate'}
          </button>
          <label className="h-[44px] px-5 rounded-[12px] bg-[#F5F1FA] text-[#211D25] text-sm font-medium hover:bg-[#E9E4EF] transition flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4 text-[#69636E]" />
            <span>Import subtitle file</span>
            <input type="file" accept=".srt,.vtt" onChange={handleImportSrt} className="hidden" />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[20px] border border-[#E9E4EF] p-5">
      {/* Track selector header & actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E9E4EF] pb-4 mb-4">
        {/* Track tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {subtitleTracks.map((track) => (
            <button
              key={track.id}
              onClick={() => onSetActiveTrack(track.id)}
              className={`px-3.5 py-1.5 rounded-[10px] text-xs font-medium transition shrink-0 ${
                activeTrack?.id === track.id
                  ? 'bg-[#F0EAF8] text-[#6D3FC0] border border-[#DDD6E2]'
                  : 'text-[#69636E] hover:text-[#211D25] hover:bg-[#F5F1FA]'
              }`}
            >
              {track.label}
            </button>
          ))}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTranslatePanel(!showTranslatePanel)}
            className="h-[36px] px-3 rounded-[10px] bg-[#F5F1FA] text-[#211D25] text-xs font-medium hover:bg-[#E9E4EF] transition flex items-center gap-1.5"
          >
            <Languages className="w-3.5 h-3.5 text-[#6D3FC0]" />
            <span>Translate</span>
          </button>

          <div className="flex items-center gap-1 border-l border-[#E9E4EF] pl-2">
            <button
              onClick={() => handleExport('srt')}
              className="h-[36px] px-2.5 rounded-[10px] text-xs text-[#69636E] hover:text-[#211D25] hover:bg-[#F5F1FA] transition"
              title="Export as SRT"
            >
              SRT
            </button>
            <button
              onClick={() => handleExport('vtt')}
              className="h-[36px] px-2.5 rounded-[10px] text-xs text-[#69636E] hover:text-[#211D25] hover:bg-[#F5F1FA] transition"
              title="Export as VTT"
            >
              VTT
            </button>
          </div>
        </div>
      </div>

      {/* Optional Translate dropdown panel */}
      {showTranslatePanel && (
        <div className="mb-4 p-4 rounded-[14px] bg-[#F5F1FA] border border-[#E9E4EF] flex flex-wrap items-center gap-3">
          <span className="text-xs text-[#69636E]">Translate into:</span>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="h-[36px] px-3 rounded-[10px] border border-[#DDD6E2] bg-white text-xs text-[#211D25]"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleTranslate}
            disabled={isTranslating}
            className="h-[36px] px-4 rounded-[10px] bg-[#6D3FC0] text-white text-xs font-medium hover:bg-[#5C35A3] transition disabled:opacity-50"
          >
            {isTranslating ? 'Translating...' : 'Translate subtitles'}
          </button>
          <button
            onClick={() => setShowTranslatePanel(false)}
            className="h-[36px] px-3 text-xs text-[#69636E] hover:text-[#211D25]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Subtitle Cue List */}
      <div ref={scrollRef} className="max-h-[380px] overflow-y-auto space-y-2.5 pr-1.5">
        {activeTrack?.cues.map((cue, index) => {
          const isActive = currentTime >= cue.startTime && currentTime <= cue.endTime;

          return (
            <div
              key={cue.id}
              data-active={isActive ? 'true' : 'false'}
              className={`p-3.5 rounded-[14px] border transition ${
                isActive
                  ? 'border-[#8061C9] bg-[#FAF8FD]'
                  : 'border-[#E9E4EF] bg-white hover:border-[#DDD6E2]'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Timecode clickable to seek */}
                <button
                  type="button"
                  onClick={() => onSeek(cue.startTime)}
                  className="shrink-0 text-left font-mono text-[11px] text-[#8061C9] hover:underline pt-0.5"
                  title="Click to seek"
                >
                  {formatTimecode(cue.startTime)} → {formatTimecode(cue.endTime)}
                </button>

                {/* Editable text */}
                <div className="flex-1">
                  <textarea
                    value={cue.text}
                    onFocus={() => setIsEditingText(true)}
                    onBlur={() => setIsEditingText(false)}
                    onChange={(e) => {
                      onUpdateTrack(activeTrack.id, (t) => ({
                        ...t,
                        cues: t.cues.map((c) => (c.id === cue.id ? { ...c, text: e.target.value } : c)),
                      }));
                    }}
                    rows={1}
                    className="w-full bg-transparent resize-none outline-none text-sm text-[#211D25] leading-relaxed"
                  />
                </div>

                {/* Quick actions: split, merge, delete */}
                <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition shrink-0">
                  <button
                    onClick={() => handleSplitCue(cue)}
                    title="Split cue"
                    className="p-1 hover:bg-[#F5F1FA] rounded text-[#69636E]"
                  >
                    <Split className="w-3.5 h-3.5" />
                  </button>
                  {index < activeTrack.cues.length - 1 && (
                    <button
                      onClick={() => handleMergeCue(cue, index)}
                      title="Merge with next"
                      className="p-1 hover:bg-[#F5F1FA] rounded text-[#69636E]"
                    >
                      <Merge className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteCue(cue.id)}
                    title="Delete cue"
                    className="p-1 hover:bg-[#F5F1FA] rounded text-[#918B95] hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom bar: Add cue + status feedback */}
      <div className="mt-4 pt-3 border-t border-[#E9E4EF] flex items-center justify-between">
        <button
          onClick={() => {
            if (activeTrack) {
              const lastCue = activeTrack.cues[activeTrack.cues.length - 1];
              const startTime = lastCue ? lastCue.endTime : 0;
              const endTime = Math.min(startTime + 3, mediaDurationSeconds);
              const newCue: SubtitleCue = {
                id: `cue-${Date.now()}`,
                trackId: activeTrack.id,
                startTime: Math.round(startTime * 100) / 100,
                endTime: Math.round(endTime * 100) / 100,
                text: 'New phrase',
                order: activeTrack.cues.length,
              };
              onUpdateTrack(activeTrack.id, (t) => ({
                ...t,
                cues: [...t.cues, newCue],
              }));
            }
          }}
          className="text-xs font-medium text-[#6D3FC0] hover:text-[#5C35A3] flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add cue</span>
        </button>

        {statusMsg && (
          <span className="text-xs text-[#8061C9] flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            {statusMsg}
          </span>
        )}
      </div>
    </div>
  );
}
