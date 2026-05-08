/**
 * Deepchox Conversational Voice System
 * 
 * Human-like voice for DexoRoom with:
 * - Streaming LLM responses (500-800ms to first speech)
 * - Instant acknowledgment phrases
 * - Interrupt/barge-in detection
 * - Memory-aware context
 * - Pause simulation for natural speech
 */

import type { MutableRefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { speechFriendlyText } from '@/lib/speechFriendly';
import {
    mergeTtsChunksForPlayback,
    pickEnglishPlaybackVoice,
    resumeSpeechSynthIfNeeded,
    type TtsChunk,
} from '@/lib/voiceEngine';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'interrupted';

interface ConversationMemory {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Natural acknowledgment phrases (play instantly)
const ACKNOWLEDGMENTS = [
  "Hmm, interesting...",
  "Okay, let me think...",
  "Got it, one second...",
  "I see where you're going...",
  "Wait, that's a key point...",
  "Let me process that...",
  "Right, let me unpack that...",
  "You know what, that's worth exploring...",
];

// Short gaps — long setTimeouts between utterances feel like lag in browser TTS
function calculatePause(text: string): number {
  const trimmed = text.trim();
  if (trimmed.endsWith('...')) return 220;
  if (trimmed.endsWith('?')) return 140;
  if (trimmed.endsWith('!')) return 110;
  if (trimmed.endsWith('.')) return 85;
  if (trimmed.endsWith(',')) return 55;
  if (trimmed.endsWith(';')) return 65;
  if (trimmed.endsWith(':')) return 75;
  return 45;
}

function addStrategicPauses(text: string): TtsChunk[] {
  const chunks: TtsChunk[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    if (!sentence) continue;
    
    const isKeyPoint = /\b(here's the thing|but wait|actually|the key is|critical|risk|challenge|question)\b/i.test(sentence);
    const isQuestion = sentence.endsWith('?');
    
    let pauseAfter = calculatePause(sentence);
    if (isKeyPoint && i > 0) pauseAfter += 90;
    if (isQuestion) pauseAfter += 55;
    
    chunks.push({ text: sentence, pauseAfter });
  }
  
  return chunks;
}

// Memory manager for conversation context
class ConversationMemoryManager {
  private memories: ConversationMemory[] = [];
  private maxItems = 20;

  add(role: 'user' | 'assistant', content: string) {
    this.memories.push({
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role,
      content,
      timestamp: Date.now(),
    });
    
    if (this.memories.length > this.maxItems) {
      this.memories = this.memories.slice(-this.maxItems);
    }
  }

  getRecentContext(count: number = 10): string {
    const recent = this.memories.slice(-count);
    return recent.map(m => `${m.role}: ${m.content.slice(0, 200)}`).join('\n');
  }

  getAll(): ConversationMemory[] {
    return [...this.memories];
  }

  clear() {
    this.memories = [];
  }
}

interface UseDexoConversationalVoiceOptions {
  onTranscript: (text: string) => void;
  onInterrupt?: () => void;
  onInterimRef?: MutableRefObject<((text: string) => void) | undefined>;
  projectContext?: { name: string; strategy?: string };
  /** When true, Deepchox “live talk” mode: recover mic after no-speech / accidental end where safe. */
  talkLiveModeRef?: MutableRefObject<boolean>;
  /** While true, do not auto-restart recognition (e.g. during API round-trip). */
  suspendAutoMicRestartRef?: MutableRefObject<boolean>;
}

export function useDexoConversationalVoice({
  onTranscript,
  onInterrupt,
  onInterimRef,
  projectContext,
  talkLiveModeRef,
  suspendAutoMicRestartRef,
}: UseDexoConversationalVoiceOptions) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [currentChunk, setCurrentChunk] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  
  // Stable callback refs — keeps the recognition useEffect from re-mounting on every render
  // when callers pass inline functions (which would change reference every render).
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const onInterruptRef = useRef(onInterrupt);
  onInterruptRef.current = onInterrupt;

  const memoryManager = useRef(new ConversationMemoryManager());
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const userPausedMicRef = useRef(false);
  /** True while the user has the mic intentionally active (chat or talk mode). */
  const micUserActiveRef = useRef(false);
  const isSpeakingRef = useRef(false);
  /** Timestamp until which mic results are suppressed (post-TTS echo cooldown). */
  const echoCooldownUntilRef = useRef(0);
  /** Accumulated final text across multiple Chrome partial-final segments. */
  const accumulatedSpeechRef = useRef('');
  /** Timer that fires after 900ms of silence to commit the accumulated speech. */
  const sendPauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ttsQueueRef = useRef<TtsChunk[]>([]);
  const streamingContentRef = useRef('');
  /** One speech chain — never overlap utterances (Chrome stutters / doubles audio). */
  const ttsChainRef = useRef(Promise.resolve());
  const didStreamSpeakRef = useRef(false);

  const speakWithPauses = useCallback(async (chunks: TtsChunk[], isAcknowledgment = false) => {
    if (typeof window === 'undefined' || !chunks.length) return;
    
    resumeSpeechSynthIfNeeded();
    const merged = mergeTtsChunksForPlayback(chunks);
    isSpeakingRef.current = true;
    
    for (const chunk of merged) {
      if (abortControllerRef.current?.signal.aborted) break;
      
      setCurrentChunk(chunk.text);
      const line = speechFriendlyText(chunk.text);
      if (!line) continue;

      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(line);
        const voice = pickEnglishPlaybackVoice();
        if (voice) utterance.voice = voice;
        
        utterance.rate = isAcknowledgment ? 1.02 : 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        const gap = Math.min(chunk.pauseAfter, 85);
        utterance.onend = () => setTimeout(resolve, gap);
        utterance.onerror = () => resolve();
        
        window.speechSynthesis.speak(utterance);
      });
      
      if (abortControllerRef.current?.signal.aborted) break;
    }
    
    isSpeakingRef.current = false;
    setCurrentChunk('');
  }, []);

  /** Drain queued streaming chunks in order after the current chain step. */
  const drainSpeechQueue = useCallback(async () => {
    while (ttsQueueRef.current.length > 0) {
      if (abortControllerRef.current?.signal.aborted) {
        ttsQueueRef.current = [];
        return;
      }
      const batch = [...ttsQueueRef.current];
      ttsQueueRef.current = [];
      await speakWithPauses(batch, false);
    }
  }, [speakWithPauses]);

  const enqueueTts = useCallback(
    (run: () => Promise<void>) => {
      ttsChainRef.current = ttsChainRef.current.then(run).catch(() => {});
    },
    [],
  );

  // Interrupt handler
  const interrupt = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
    }
    ttsChainRef.current = Promise.resolve();
    abortControllerRef.current?.abort();
    setVoiceState('interrupted');
    isSpeakingRef.current = false;
    ttsQueueRef.current = [];
    streamingContentRef.current = '';
    didStreamSpeakRef.current = false;
    // Discard any pending speech accumulation on interrupt
    if (sendPauseTimerRef.current) { clearTimeout(sendPauseTimerRef.current); sendPauseTimerRef.current = null; }
    accumulatedSpeechRef.current = '';
    onInterruptRef.current?.();
  }, []);

  /** Deepchox orb uses browser TTS outside this hook — keep barge-in / UI in sync. */
  const markAssistantSpeaking = useCallback((speaking: boolean) => {
    isSpeakingRef.current = speaking;
    if (!speaking) {
      // Give speaker echo 850ms to dissipate before accepting mic input.
      // Without this, the mic immediately picks up residual TTS audio as "user speech".
      echoCooldownUntilRef.current = Date.now() + 850;
    }
    setVoiceState((prev) => {
      if (speaking) return 'speaking';
      if (prev === 'speaking' || prev === 'interrupted') return 'idle';
      return prev;
    });
  }, []);

  // Process user input with streaming
  const processInput = useCallback(async (input: string) => {
    setVoiceState('thinking');
    abortControllerRef.current = new AbortController();
    didStreamSpeakRef.current = false;
    
    memoryManager.current.add('user', input);
    
    try {
      const recentContext = memoryManager.current.getRecentContext(8);
      
      const response = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...(recentContext ? [{ role: 'system', content: `Recent context:\n${recentContext}` }] : []),
            { role: 'user', content: input },
          ],
          provider: 'groq',
          projectContext: {
            ventureName: projectContext?.name || 'Unknown',
            strategy: projectContext?.strategy,
          },
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('Stream failed');
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');
      
      const decoder = new TextDecoder();
      let buffer = '';
      let hasPlayedAck = false;
      let fullResponse = '';
      
      setVoiceState('speaking');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (abortControllerRef.current.signal.aborted) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          
          try {
            const chunk = JSON.parse(trimmed.slice(6));
            
            if (chunk.type === 'ack' && !hasPlayedAck) {
              hasPlayedAck = true;
              const ackChunks = addStrategicPauses(speechFriendlyText(chunk.data));
              enqueueTts(() => speakWithPauses(ackChunks, true));
            }
            
            if (chunk.type === 'content') {
              fullResponse += chunk.data;
              streamingContentRef.current = fullResponse;
              
              const sentences = fullResponse.split(/(?<=[.!?])\s+/);
              const lastSentence = sentences[sentences.length - 1];
              
              if (sentences.length > 1 && lastSentence.length > 20) {
                const completeSentences = speechFriendlyText(sentences.slice(0, -1).join(' '));
                const speakChunks = addStrategicPauses(completeSentences);
                
                for (const c of speakChunks) {
                  if (!ttsQueueRef.current.find((q) => q.text === c.text)) {
                    ttsQueueRef.current.push(c);
                  }
                }
                didStreamSpeakRef.current = true;
                enqueueTts(() => drainSpeechQueue());
              }
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
      
      const remaining = streamingContentRef.current.trim();
      if (remaining && !abortControllerRef.current.signal.aborted) {
        if (!didStreamSpeakRef.current) {
          enqueueTts(() => speakWithPauses(addStrategicPauses(speechFriendlyText(remaining)), false));
        } else {
          const parts = remaining.split(/(?<=[.!?])\s+/);
          const tail = (parts[parts.length - 1] ?? '').trim();
          if (tail) {
            enqueueTts(() => speakWithPauses(addStrategicPauses(speechFriendlyText(tail)), false));
          }
        }
      }
      
      await ttsChainRef.current;
      
      if (fullResponse) {
        memoryManager.current.add('assistant', fullResponse);
      }
      
      didStreamSpeakRef.current = false;
      setVoiceState('idle');
      
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Voice processing error:', error);
        const fallback = "I'm having trouble connecting. Let's try again.";
        enqueueTts(() => speakWithPauses([{ text: fallback, pauseAfter: 120 }], true));
        await ttsChainRef.current;
        setVoiceState('idle');
      }
    }
  }, [projectContext, speakWithPauses, drainSpeechQueue, enqueueTts]);

  // Speech recognition setup
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }

      // Discard while Deepchox's TTS is playing — mic is picking up speaker output.
      if (isSpeakingRef.current && (interim || finalText)) {
        interrupt();
        setInterimTranscript('');
        onInterimRef?.current?.('');
        return;
      }

      // Discard during post-TTS echo cooldown (residual speaker audio dissipating).
      if (Date.now() < echoCooldownUntilRef.current) {
        return;
      }

      // Show live interim while user is still speaking
      setInterimTranscript(interim || (finalText ? '' : ''));
      onInterimRef?.current?.(interim);

      if (finalText) {
        // Accumulate — Chrome fires isFinal mid-sentence on short pauses.
        // We wait 900ms of silence before committing so the full sentence is captured.
        accumulatedSpeechRef.current = (
          accumulatedSpeechRef.current
            ? accumulatedSpeechRef.current + ' ' + finalText.trim()
            : finalText.trim()
        );
        setInterimTranscript('');
        onInterimRef?.current?.('');

        if (sendPauseTimerRef.current) clearTimeout(sendPauseTimerRef.current);
        sendPauseTimerRef.current = setTimeout(() => {
          sendPauseTimerRef.current = null;
          const fullText = accumulatedSpeechRef.current.trim();
          accumulatedSpeechRef.current = '';
          if (!fullText) return;
          onTranscriptRef.current(fullText);
          setVoiceState('thinking');
          try { recognition.stop(); } catch { /* noop */ }
        }, 900);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const err = event.error;
      if (err === 'aborted') {
        return;
      }
      if (err === 'no-speech') {
        // Restart on no-speech as long as the user has the mic active (chat or talk mode)
        if (
          micUserActiveRef.current &&
          !userPausedMicRef.current &&
          !isSpeakingRef.current &&
          !suspendAutoMicRestartRef?.current
        ) {
          window.setTimeout(() => {
            try {
              if (
                micUserActiveRef.current &&
                !userPausedMicRef.current &&
                !isSpeakingRef.current &&
                !suspendAutoMicRestartRef?.current &&
                recognitionRef.current
              ) {
                recognitionRef.current.start();
              }
            } catch {
              /* already running */
            }
          }, 200);
        } else {
          setVoiceState((s) => (s === 'listening' ? 'idle' : s));
        }
        return;
      }
      if (err === 'not-allowed') {
        setVoiceError('Microphone permission denied');
      }
      setVoiceState((s) => (s === 'listening' ? 'idle' : s));
    };

    recognition.onend = () => {
      setVoiceState((s) => (s === 'listening' ? 'idle' : s));
      if (userPausedMicRef.current) return;
      // Never auto-restart while TTS is playing — Chrome kills the mic immediately.
      if (isSpeakingRef.current) return;
      // Restart whenever the user has the mic intentionally active (chat OR talk mode).
      // Chrome fires onend unexpectedly even with continuous:true — we must recover.
      if (micUserActiveRef.current && !suspendAutoMicRestartRef?.current) {
        window.setTimeout(() => {
          try {
            if (
              micUserActiveRef.current &&
              !userPausedMicRef.current &&
              !isSpeakingRef.current &&
              !suspendAutoMicRestartRef?.current &&
              recognitionRef.current
            ) {
              recognitionRef.current.start();
            }
          } catch {
            /* already running */
          }
        }, 280);
      }
    };

    recognitionRef.current = recognition;
    
    return () => recognition.stop();
  // onTranscript and interrupt are accessed via stable refs — no need to list them here.
  // Listing them would cause recognition to be torn down and rebuilt on every render,
  // killing any active listening session whenever state changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onInterimRef, talkLiveModeRef, suspendAutoMicRestartRef]);

  // Controls
  const startListening = useCallback(() => {
    userPausedMicRef.current = false;
    micUserActiveRef.current = true;
    try {
      recognitionRef.current?.start();
      setVoiceState('listening');
    } catch (e) {
      // InvalidStateError = already running — just reflect that in state, don't restart
      if (e instanceof DOMException && e.name === 'InvalidStateError') {
        setVoiceState('listening');
        return;
      }
      // Chrome rejected start() (TTS audio conflict). Stop cleanly, retry once after gap.
      // Never show a false "listening" state before the retry succeeds.
      try { recognitionRef.current?.stop(); } catch { /* noop */ }
      window.setTimeout(() => {
        if (!userPausedMicRef.current && micUserActiveRef.current) {
          try {
            recognitionRef.current?.start();
            setVoiceState('listening');
          } catch { /* noop */ }
        }
      }, 250);
    }
  }, []);

  const stopListening = useCallback(() => {
    userPausedMicRef.current = true;
    micUserActiveRef.current = false;
    if (sendPauseTimerRef.current) { clearTimeout(sendPauseTimerRef.current); sendPauseTimerRef.current = null; }
    accumulatedSpeechRef.current = '';
    try {
      recognitionRef.current?.stop();
    } catch {}
    setVoiceState('idle');
    window.setTimeout(() => {
      userPausedMicRef.current = false;
    }, 600);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
    }
    ttsChainRef.current = Promise.resolve();
    ttsQueueRef.current = [];
    abortControllerRef.current?.abort();
    isSpeakingRef.current = false;
    didStreamSpeakRef.current = false;
    setVoiceState('idle');
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    if (muted) {
      stopSpeaking();
    }
  }, [stopSpeaking]);

  return {
    voiceState,
    voiceError,
    interimTranscript,
    currentChunk,
    isListening: voiceState === 'listening',
    isSpeaking: voiceState === 'speaking',
    isProcessing: voiceState === 'thinking',
    startListening,
    stopListening,
    stopSpeaking,
    setMuted,
    interrupt,
    markAssistantSpeaking,
    getMemory: () => memoryManager.current.getAll(),
  };
}
