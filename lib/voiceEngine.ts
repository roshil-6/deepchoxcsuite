/**
 * Voice Engine - Enhanced TTS for Jarvis/Deepchox experience
 * Features: voice presets, chunked speech, emphasis parsing, voice caching
 */

import { speechFriendlyText } from './speechFriendly';

export type VoicePreset = 'jarvis' | 'natural' | 'fast' | 'slow' | 'warm' | 'dramatic';

export interface VoiceSettings {
    rate: number;
    pitch: number;
    volume: number;
    voicePreference: string[];
}

export const PRESETS: Record<VoicePreset, VoiceSettings> = {
    /** Slightly faster, neutral pitch — low pitch + slow rate sounds muddy in browser TTS */
    jarvis: {
        rate: 0.98,
        pitch: 0.98,
        volume: 1,
        voicePreference: ['microsoft aria', 'microsoft jenny', 'google us english', 'samantha', 'alex', 'daniel'],
    },
    natural: {
        rate: 1,
        pitch: 1,
        volume: 1,
        voicePreference: ['microsoft aria', 'samantha', 'alex', 'daniel', 'karen', 'moira'],
    },
    fast: {
        rate: 1.15,
        pitch: 1.02,
        volume: 1,
        voicePreference: ['alex', 'samantha', 'daniel'],
    },
    slow: {
        rate: 0.78,
        pitch: 0.95,
        volume: 1,
        voicePreference: ['moira', 'karen', 'daniel', 'samantha'],
    },
    warm: {
        rate: 0.95,
        pitch: 0.92,
        volume: 0.95,
        voicePreference: ['karen', 'moira', 'samantha', 'tessa'],
    },
    dramatic: {
        rate: 0.85,
        pitch: 0.75,
        volume: 1,
        voicePreference: ['fred', 'vicki', 'princess', 'google uk english male'],
    },
};

let cachedVoices: SpeechSynthesisVoice[] | null = null;

export function initVoiceCache(): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    const loadVoices = () => {
        cachedVoices = window.speechSynthesis.getVoices();
    };
    
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
}

export function getVoices(): SpeechSynthesisVoice[] {
    if (cachedVoices) return cachedVoices;
    if (typeof window === 'undefined' || !window.speechSynthesis) return [];
    return window.speechSynthesis.getVoices();
}

function scoreVoiceMatch(voice: SpeechSynthesisVoice, preference: string): number {
    const name = voice.name.toLowerCase();
    const pref = preference.toLowerCase();
    
    // Exact match
    if (name === pref) return 100;
    // Starts with
    if (name.startsWith(pref)) return 80;
    // Contains as whole word
    if (new RegExp(`\\b${pref}\\b`).test(name)) return 70;
    // Contains anywhere
    if (name.includes(pref)) return 50;
    
    return 0;
}

export function selectBestVoice(preferences: string[]): SpeechSynthesisVoice | null {
    const voices = getVoices();
    if (!voices.length) return null;
    
    // Score all voices against all preferences
    let bestVoice: SpeechSynthesisVoice | null = null;
    let bestScore = -1;
    
    for (const voice of voices) {
        for (const pref of preferences) {
            const score = scoreVoiceMatch(voice, pref);
            if (score > bestScore) {
                bestScore = score;
                bestVoice = voice;
            }
        }
    }
    
    // Fallback to English voice if no match
    if (!bestVoice) {
        bestVoice = voices.find(v => v.lang.startsWith('en')) ?? voices[0];
    }
    
    return bestVoice;
}

/** Ordered hints for clear en-* system voices (Windows Neural, Google, macOS). */
const PLAYBACK_VOICE_PREFS = [
    'microsoft aria',
    'microsoft jenny',
    'microsoft guy',
    'microsoft davis',
    'microsoft natasha',
    'microsoft sonia',
    'google us english',
    'google uk english',
    'samantha',
    'alex',
    'karen',
    'daniel',
    'victoria',
    'moira',
    'tessa',
    'aaron',
];

/**
 * Best-effort pick for listenable browser speech: English, skip Translate/compact voices.
 */
export function pickEnglishPlaybackVoice(): SpeechSynthesisVoice | null {
    initVoiceCache();
    const voices = getVoices();
    if (!voices.length) return null;
    const pool = voices.filter(
        (v) =>
            v.lang.toLowerCase().startsWith('en') &&
            !/translate|compact|debug/i.test(v.name),
    );
    if (!pool.length) {
        return voices.find((v) => v.lang.toLowerCase().startsWith('en')) ?? voices[0];
    }
    let best: SpeechSynthesisVoice | null = null;
    let bestScore = -1;
    for (const voice of pool) {
        for (const pref of PLAYBACK_VOICE_PREFS) {
            const score = scoreVoiceMatch(voice, pref);
            if (score > bestScore) {
                bestScore = score;
                best = voice;
            }
        }
    }
    return bestScore > 0 ? best : pool[0];
}

export type TtsChunk = { text: string; pauseAfter: number };

/**
 * Fewer, longer utterances = less Chrome lag between queue items; capped pauses avoid dead air.
 */
export function mergeTtsChunksForPlayback(chunks: TtsChunk[], maxChars = 420): TtsChunk[] {
    const cleaned = chunks
        .map((c) => ({ text: c.text.trim(), pauseAfter: c.pauseAfter }))
        .filter((c) => c.text.length > 0);
    if (cleaned.length <= 1) return cleaned;
    const out: TtsChunk[] = [];
    let buf = '';
    let pause = 0;
    for (const c of cleaned) {
        const sep = buf ? ' ' : '';
        const next = `${buf}${sep}${c.text}`;
        if (next.length > maxChars && buf) {
            out.push({ text: buf, pauseAfter: Math.min(pause, 140) });
            buf = c.text;
            pause = c.pauseAfter;
        } else {
            buf = next;
            pause = Math.max(pause, c.pauseAfter);
        }
    }
    if (buf) out.push({ text: buf, pauseAfter: Math.min(pause, 140) });
    return out;
}

/** Chrome sometimes suspends synthesis until resumed (tab focus / autoplay policy). */
export function resumeSpeechSynthIfNeeded(): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
        window.speechSynthesis.resume();
    } catch {
        /* ignore */
    }
}

/**
 * Parse emphasis markers from text:
 * **bold** -> slight emphasis
 * *italic* -> slight pause
 * ... -> pause
 * ! -> emphasis
 */
function applyProsody(text: string, utt: SpeechSynthesisUtterance): string {
    // Clean up markdown but keep structure hints
    let clean = text
        .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold markers but keep text
        .replace(/\*(.+?)\*/g, '$1')    // Remove italic markers but keep text
        .replace(/`{1,3}[^`]*`{1,3}/g, ' ') // Remove code
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // Links -> text only
        .replace(/^#{1,6}\s+/gm, ''); // Remove heading markers
    
    return clean;
}

/**
 * Chunk long text to avoid TTS limits and allow interruption at sentence boundaries
 */
function chunkText(text: string, maxChunkLength: number = 260): string[] {
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [text];
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxChunkLength && currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
        } else {
            currentChunk += sentence;
        }
    }
    
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks.length ? chunks : [text.slice(0, maxChunkLength)];
}

export interface SpeakOptions {
    preset?: VoicePreset;
    rate?: number;
    pitch?: number;
    volume?: number;
    onStart?: () => void;
    onChunk?: (chunkIndex: number, totalChunks: number) => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
}

class SpeechQueue {
    private queue: string[] = [];
    private isSpeaking = false;
    private currentUtt: SpeechSynthesisUtterance | null = null;
    private abortController: AbortController | null = null;
    
    speak(text: string, options: SpeakOptions = {}): Promise<void> {
        return new Promise((resolve, reject) => {
            if (typeof window === 'undefined' || !window.speechSynthesis) {
                reject(new Error('Speech synthesis not available'));
                return;
            }
            
            const settings = PRESETS[options.preset ?? 'jarvis'];
            const prepared = speechFriendlyText(text);
            if (!prepared) {
                resolve();
                return;
            }
            const chunks = chunkText(prepared);
            let currentIndex = 0;
            
            const abortCtrl = new AbortController();
            this.abortController = abortCtrl;
            
            const speakNext = () => {
                resumeSpeechSynthIfNeeded();
                if (abortCtrl.signal.aborted) {
                    this.isSpeaking = false;
                    resolve();
                    return;
                }
                
                if (currentIndex >= chunks.length) {
                    this.isSpeaking = false;
                    options.onEnd?.();
                    resolve();
                    return;
                }
                
                const chunk = chunks[currentIndex];
                const utt = new SpeechSynthesisUtterance(chunk);
                
                utt.rate = options.rate ?? settings.rate;
                utt.pitch = options.pitch ?? settings.pitch;
                utt.volume = options.volume ?? settings.volume;
                
                const voice = selectBestVoice(settings.voicePreference) ?? pickEnglishPlaybackVoice();
                if (voice) utt.voice = voice;
                
                if (currentIndex === 0) {
                    utt.onstart = () => {
                        this.isSpeaking = true;
                        options.onStart?.();
                    };
                }
                
                utt.onend = () => {
                    currentIndex++;
                    options.onChunk?.(currentIndex, chunks.length);
                    speakNext();
                };
                
                utt.onerror = (event) => {
                    if (event.error === 'interrupted' || event.error === 'canceled') {
                        // Normal interruption, not an error
                        this.isSpeaking = false;
                        resolve();
                    } else {
                        this.isSpeaking = false;
                        const err = new Error(`Speech error: ${event.error}`);
                        options.onError?.(err);
                        reject(err);
                    }
                };
                
                this.currentUtt = utt;
                window.speechSynthesis.speak(utt);
            };
            
            speakNext();
        });
    }
    
    cancel(): void {
        this.abortController?.abort();
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        this.isSpeaking = false;
    }
    
    isActive(): boolean {
        return this.isSpeaking;
    }
}

// Global speech queue instance
const globalQueue = new SpeechQueue();

export function speak(text: string, options?: SpeakOptions): Promise<void> {
    return globalQueue.speak(text, options);
}

export function stopSpeaking(): void {
    globalQueue.cancel();
}

export function isSpeaking(): boolean {
    return globalQueue.isActive();
}

/**
 * Create a new isolated speech queue (for independent voice streams)
 */
export function createSpeechQueue(): SpeechQueue {
    return new SpeechQueue();
}

// Auto-init on module load
if (typeof window !== 'undefined') {
    initVoiceCache();
}
