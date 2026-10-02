'use client';

import { useState, useEffect } from 'react';
import { 
  WorkspaceMedia, 
  WorkspaceTool, 
  SubtitleTrack, 
  CropSettings, 
  ProcessingJob 
} from '@/lib/media/types';

export function useWorkspaceState() {
  const [media, setMedia] = useState<WorkspaceMedia | null>(null);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  
  const [activeTool, setActiveTool] = useState<WorkspaceTool>('trim');
  
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [activeSubtitleTrackId, setActiveSubtitleTrackId] = useState<string | null>(null);
  
  const [crop, setCrop] = useState<CropSettings>({ aspectRatio: 'original', x: 0, y: 0, width: 1, height: 1 });
  
  const [processingJobs, setProcessingJobs] = useState<ProcessingJob[]>([]);

  useEffect(() => {
    if (media) {
      setSelectionStart(0);
      setSelectionEnd(media.durationSeconds);
      setSubtitleTracks([]);
      setActiveTool('trim');
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [media]);

  const setSelection = (start: number, end: number) => {
    setSelectionStart(start);
    setSelectionEnd(end);
  };

  const addSubtitleTrack = (track: SubtitleTrack) => {
    setSubtitleTracks((prev) => [...prev, track]);
    if (!activeSubtitleTrackId) {
      setActiveSubtitleTrackId(track.id);
    }
  };

  const updateSubtitleTrack = (trackId: string, updater: (t: SubtitleTrack) => SubtitleTrack) => {
    setSubtitleTracks((prev) => prev.map((t) => (t.id === trackId ? updater(t) : t)));
  };

  const addJob = (job: ProcessingJob) => {
    setProcessingJobs((prev) => [...prev, job]);
  };

  const updateJob = (jobId: string, updates: Partial<ProcessingJob>) => {
    setProcessingJobs((prev) =>
      prev.map((job) => (job.id === jobId ? { ...job, ...updates } : job))
    );
  };

  const resetWorkspace = () => {
    setMedia(null);
    setCurrentTime(0);
    setIsPlaying(false);
    setSelectionStart(0);
    setSelectionEnd(0);
    setActiveTool('trim');
    setSubtitleTracks([]);
    setActiveSubtitleTrackId(null);
    setCrop({ aspectRatio: 'original', x: 0, y: 0, width: 1, height: 1 });
    setProcessingJobs([]);
  };

  return {
    media, setMedia,
    currentTime, setCurrentTime,
    isPlaying, setIsPlaying,
    selectionStart, selectionEnd, setSelection,
    activeTool, setActiveTool,
    subtitleTracks, activeSubtitleTrackId, setActiveSubtitleTrackId, addSubtitleTrack, updateSubtitleTrack,
    crop, setCrop,
    processingJobs, addJob, updateJob,
    resetWorkspace,
  };
}
