/**
 * Dexo Conversational Voice System
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
  /** When true, Dexo “live talk” mode: recover mic after no-speech / accidental end where safe. */
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
  
  const memoryManager = useRef(new ConversationMemoryManager());
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const userPausedMicRef = useRef(false);
  const isSpeakingRef = useRef(false);
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
    onInterrupt?.();
  }, [onInterrupt]);

  /** Dexo orb uses browser TTS outside this hook — keep barge-in / UI in sync. */
  const markAssistantSpeaking = useCallback((speaking: boolean) => {
    isSpeakingRef.current = speaking;
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
      
      // Barge-in: user speaking while AI speaking
      if (isSpeakingRef.current && (interim || finalText)) {
        interrupt();
      }
      
      setInterimTranscript(interim);
      onInterimRef?.current?.(interim);
      
      if (finalText) {
        setInterimTranscript('');
        onInterimRef?.current?.('');
        onTranscript(finalText.trim());
        setVoiceState('thinking');
        recognition.stop();
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const err = event.error;
      if (err === 'aborted') {
        return;
      }
      if (err === 'no-speech') {
        if (
          !userPausedMicRef.current &&
          talkLiveModeRef?.current &&
          !suspendAutoMicRestartRef?.current
        ) {
          window.setTimeout(() => {
            try {
              if (
                !userPausedMicRef.current &&
                talkLiveModeRef?.current &&
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
      if (
        talkLiveModeRef?.current &&
        !suspendAutoMicRestartRef?.current
      ) {
        window.setTimeout(() => {
          try {
            if (
              !userPausedMicRef.current &&
              talkLiveModeRef?.current &&
              !suspendAutoMicRestartRef?.current &&
              recognitionRef.current
            ) {
              recognitionRef.current.start();
            }
          } catch {
            /* already running */
          }
        }, 140);
      }
    };

    recognitionRef.current = recognition;
    
    return () => recognition.stop();
  }, [onTranscript, onInterimRef, interrupt, talkLiveModeRef, suspendAutoMicRestartRef]);

  // Controls
  const startListening = useCallback(() => {
    userPausedMicRef.current = false;
    setVoiceState('listening');
    try {
      recognitionRef.current?.start();
    } catch {}
  }, []);

  const stopListening = useCallback(() => {
    userPausedMicRef.current = true;
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
