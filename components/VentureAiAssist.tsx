'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FileUp, Loader2, Mic, MicOff, Sparkles, AlertCircle } from 'lucide-react';

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
        onresult: ((e: { resultIndex: number; results: { length: number; [i: number]: { [0]: { transcript: string } } } }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        continuous: boolean;
        onresult: ((e: { resultIndex: number; results: { length: number; [i: number]: { [0]: { transcript: string } } } }) => void) | null;
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
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (event) => {
      let chunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        chunk += event.results[i][0].transcript;
      }
      if (chunk) {
        setBrief((prev) => (prev ? `${prev.trim()} ${chunk}` : chunk));
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
      setError('Use a text-based file (.txt, .md, .csv, .json) or paste content below.');
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
      setError('Add a description, upload a file, or use voice first.');
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

  return (
    <div className="mb-10 rounded-2xl border border-[#0D9488]/30 bg-[#0D9488]/[0.06] p-6 shadow-inner">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[#0D9488]" aria-hidden />
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#0D9488]">AI venture setup</h3>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-zinc-400">
        Speak, type a rough brief, or upload a text file — we&apos;ll fill the form so you don&apos;t have to type everything.
      </p>

      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="Example: We’re building a B2B tool for indie retailers to forecast inventory using on-device AI. Targeting EU shops under 50 employees. Goal: pilot in Q2…"
        className="mb-3 min-h-[120px] w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 text-base text-zinc-100 placeholder-zinc-600 focus:border-[#0D9488]/50 focus:outline-none"
        disabled={extracting}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input ref={fileInputRef} type="file" accept=".txt,.md,.csv,.json,text/plain" className="hidden" onChange={handleFile} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={extracting}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-200 transition hover:border-zinc-500 disabled:opacity-50"
        >
          <FileUp className="h-4 w-4" aria-hidden />
          Upload file
        </button>
        {voiceSupported ? (
          <button
            type="button"
            onClick={() => (listening ? stopListening() : startListening())}
            disabled={extracting}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition disabled:opacity-50 ${
              listening
                ? 'border-red-500/50 bg-red-950/40 text-red-200'
                : 'border-zinc-700 bg-zinc-900/80 text-zinc-200 hover:border-zinc-500'
            }`}
          >
            {listening ? <MicOff className="h-4 w-4" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
            {listening ? 'Stop' : 'Voice'}
          </button>
        ) : (
          <span className="text-[10px] text-zinc-600">Voice needs Chrome / Edge</span>
        )}
        {fileLabel ? <span className="text-xs text-zinc-500">Added: {fileLabel}</span> : null}
      </div>

      {error ? (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={runExtract}
        disabled={extracting || !brief.trim()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0D9488] py-3.5 text-sm font-extrabold uppercase tracking-wider text-zinc-950 shadow-lg transition hover:bg-[#14b8a6] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-8"
      >
        {extracting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Sparkles className="h-5 w-5" aria-hidden />}
        {extracting ? 'Extracting…' : 'Extract & fill form'}
      </button>
    </div>
  );
}
