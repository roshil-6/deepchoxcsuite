'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FileUp, Loader2, Mic, Sparkles, AlertCircle } from 'lucide-react';

export type VentureExtracted = {
  projectName: string;
  industry: string;
  problemStatement: string;
  targetAudience: string;
  primaryGoal: string;
  timeline: string;
  resources: string;
  valueProposition: string;
  challenges: string;
};

type Props = {
  onExtracted: (data: VentureExtracted) => void;
};

export function VentureAiAssist({ onExtracted }: Props) {
  const [brief, setBrief] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<{ stop: () => void; start: () => void } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { SpeechRecognition?: new () => { stop: () => void; start: () => void }; webkitSpeechRecognition?: new () => { stop: () => void; start: () => void } };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    setVoiceSupported(Boolean(SR));
  }, []);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* noop */
    }
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        continuous: boolean;
        onresult: ((e: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; [0]: { transcript: string } } } }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        continuous: boolean;
        onresult: ((e: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; [0]: { transcript: string } } } }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;

    stopListening();
    const rec = new SR();
    rec.lang = 'en-US';
    // Interim updates must NOT be appended — only final segments, or each partial
    // re-fire duplicates the same phrase ("I am" + "I am planning" + …).
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (event) => {
      let chunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          chunk += r[0].transcript;
        }
      }
      const t = chunk.trim();
      if (t) {
        setBrief((prev) => (prev ? `${prev.trim()} ${t}` : t));
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, [stopListening]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileLabel(file.name);
    setError(null);
    const name = file.name.toLowerCase();
    const ok =
      file.type === 'text/plain' ||
      name.endsWith('.md') ||
      name.endsWith('.txt') ||
      name.endsWith('.csv') ||
      name.endsWith('.json');

    if (!ok) {
      setError('Use .txt, .md, .csv, .json — or paste below.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setBrief((prev) => (prev ? `${prev.trim()}\n\n---\n${text}` : text));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const runExtract = async () => {
    const text = brief.trim();
    if (!text) {
      setError('Add a brief, file, or voice first.');
      return;
    }
    setError(null);
    setExtracting(true);
    try {
      const res = await fetch('/api/onboarding-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Extraction failed');
        return;
      }
      onExtracted(json.data as VentureExtracted);
    } catch {
      setError('Network error. Try again.');
    } finally {
      setExtracting(false);
    }
  };

  const inputClass =
    'w-full min-h-[7rem] resize-y bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 text-xl text-zinc-100 placeholder-zinc-800 focus:outline-none focus:border-zinc-500 transition-all font-medium shadow-inner';

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#0D9488]" aria-hidden />
        AI assist
      </label>

      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="Short pitch or notes…"
        className={inputClass}
        disabled={extracting}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <input ref={fileInputRef} type="file" accept=".txt,.md,.csv,.json,text/plain" className="hidden" onChange={handleFile} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={extracting}
            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 transition-colors hover:text-zinc-200 disabled:opacity-50"
          >
            <FileUp className="h-3.5 w-3.5 opacity-80" aria-hidden />
            File
          </button>
          {voiceSupported ? (
            <>
              <button
                type="button"
                onClick={() => (listening ? stopListening() : startListening())}
                disabled={extracting}
                className={`inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50 ${
                  listening ? 'text-[#0D9488]' : 'text-zinc-500 hover:text-zinc-200'
                }`}
                aria-pressed={listening}
              >
                <Mic className={`h-3.5 w-3.5 opacity-90 ${listening ? 'animate-pulse' : ''}`} aria-hidden />
                {listening ? 'Stop' : 'Voice'}
              </button>
              {listening ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#0D9488]" aria-live="polite">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0D9488] opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0D9488]" />
                  </span>
                  Listening
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Voice (Chrome / Edge)</span>
          )}
          {fileLabel ? <span className="text-[10px] text-zinc-600">{fileLabel}</span> : null}
        </div>

        <button
          type="button"
          onClick={runExtract}
          disabled={extracting || !brief.trim()}
          className="inline-flex shrink-0 items-center gap-2 self-start py-1 text-[10px] font-bold uppercase tracking-widest text-[#0D9488] transition-colors hover:text-[#5eead4] disabled:cursor-not-allowed disabled:opacity-30 sm:self-auto"
        >
          {extracting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-3.5 w-3.5" aria-hidden />}
          {extracting ? 'Extracting…' : 'Extract & fill'}
        </button>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-2xl border border-red-900/35 bg-red-950/15 px-4 py-3 text-sm text-red-300/90 shadow-inner">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 opacity-90" aria-hidden />
          {error}
        </div>
      ) : null}
    </div>
  );
}
