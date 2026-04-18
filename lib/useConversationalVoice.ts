/**
 * Human-Like Conversational Voice System
 * 
 * Features:
 * - Low latency streaming TTS (starts speaking within 500-800ms)
 * - Instant acknowledgment phrases
 * - Interrupt/barge-in support
 * - Active co-founder behavior (always challenges/asks/proposes)
 * - Human pause simulation
 * - Speaking states UI
 * - Memory context (last 20 interactions)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useOffice } from './OfficeContext';
import { speechFriendlyText } from '@/lib/speechFriendly';
import {
    mergeTtsChunksForPlayback,
    pickEnglishPlaybackVoice,
    resumeSpeechSynthIfNeeded,
} from '@/lib/voiceEngine';

// Speaking states
type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'interrupted';

// Memory item
interface ConversationMemory {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  type?: 'acknowledgment' | 'main_response';
}

// TTS chunk with pause timing
interface TTSChunk {
  text: string;
  pauseAfter: number; // ms
  priority: 'high' | 'normal'; // acknowledgments are high priority
}

// Acknowledgment phrases (instant response)
const ACKNOWLEDGMENTS = [
  "Hmm, interesting...",
  "Okay, let me think...",
  "Got it, one second...",
  "I see where you're going...",
  "Wait, that's a key point...",
  "Let me process that...",
  "Okay, here's my take...",
  "You know what, that's worth exploring...",
  "Right, let me unpack that...",
  "Hmm, challenge accepted...",
];

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

// Strategic pauses before key content
function addStrategicPauses(text: string): TTSChunk[] {
  const chunks: TTSChunk[] = [];
  
  // Split at sentence boundaries but keep strategic phrases together
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    if (!sentence) continue;
    
    // Detect strategic markers for longer pauses
    const isKeyPoint = /\b(here's the thing|but wait|actually|the key is|critical|risk|challenge|question)\b/i.test(sentence);
    const isQuestion = sentence.endsWith('?');
    
    let pauseAfter = calculatePause(sentence);
    
    // Add extra pause before important points
    if (isKeyPoint && i > 0) {
      pauseAfter += 90;
    }
    if (isQuestion) {
      pauseAfter += 55;
    }
    
    chunks.push({
      text: sentence,
      pauseAfter,
      priority: i === 0 ? 'high' : 'normal',
    });
  }
  
  return chunks;
}

// Memory management
class ConversationMemoryManager {
  private memories: ConversationMemory[] = [];
  private maxItems = 20;

  add(role: 'user' | 'assistant', content: string, type?: 'acknowledgment' | 'main_response') {
    this.memories.push({
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role,
      content,
      timestamp: Date.now(),
      type,
    });
    
    // Keep only recent items
    if (this.memories.length > this.maxItems) {
      this.memories = this.memories.slice(-this.maxItems);
    }
  }

  getRecentContext(count: number = 10): string {
    const recent = this.memories.slice(-count);
    return recent.map(m => `${m.role}: ${m.content.slice(0, 200)}`).join('\n');
  }

  findRelatedTopics(currentInput: string): string[] {
    const keywords = currentInput.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const related = this.memories.filter(m => 
      keywords.some(kw => m.content.toLowerCase().includes(kw))
    );
    return related.slice(-3).map(m => m.content.slice(0, 100));
  }

  clear() {
    this.memories = [];
  }

  getAll(): ConversationMemory[] {
    return [...this.memories];
  }
}

// Speech recognition with barge-in detection
function useSpeechRecognitionWithBargeIn(
  onResult: (text: string, isFinal: boolean) => void,
  onBargeIn: () => void
) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isAISpeakingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // BARGE-IN DETECTION
      // If user starts speaking while AI is speaking, trigger interruption
      if (isAISpeakingRef.current && (interimTranscript || finalTranscript)) {
        onBargeIn();
      }

      if (finalTranscript) {
        onResult(finalTranscript, true);
      } else if (interimTranscript) {
        onResult(interimTranscript, false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') {
        // Auto-restart on no-speech
        try { recognition.start(); } catch {}
      }
    };

    recognition.onend = () => {
      // Auto-restart if we should still be listening
      if (isListening) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, []);

  const startListening = useCallback(() => {
    setIsListening(true);
    try {
      recognitionRef.current?.start();
    } catch {}
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
    try {
      recognitionRef.current?.stop();
    } catch {}
  }, []);

  const setAISpeaking = useCallback((speaking: boolean) => {
    isAISpeakingRef.current = speaking;
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    setAISpeaking,
  };
}

// Main conversational voice hook
export function useConversationalVoice() {
  const { activeProject } = useOffice();
  
  // State
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChunk, setCurrentChunk] = useState('');
  
  // Refs
  const memoryManager = useRef(new ConversationMemoryManager());
  const abortControllerRef = useRef<AbortController | null>(null);
  const ttsQueueRef = useRef<TTSChunk[]>([]);
  const isProcessingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamingContentRef = useRef('');
  const ttsChainRef = useRef(Promise.resolve());
  const didStreamSpeakRef = useRef(false);
  
  // Initialize audio context for visualization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const speakWithPauses = useCallback(async (chunks: TTSChunk[], isAcknowledgment = false) => {
    if (typeof window === 'undefined' || !chunks.length) return;
    
    resumeSpeechSynthIfNeeded();
    const merged = mergeTtsChunksForPlayback(
      chunks.map(({ text, pauseAfter }) => ({ text, pauseAfter })),
    );
    setIsPlaying(true);
    
    for (const chunk of merged) {
      if (abortControllerRef.current?.signal.aborted) {
        break;
      }
      
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
      
      if (abortControllerRef.current?.signal.aborted) {
        break;
      }
    }
    
    setIsPlaying(false);
    setCurrentChunk('');
  }, []);

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

  const enqueueTts = useCallback((run: () => Promise<void>) => {
    ttsChainRef.current = ttsChainRef.current.then(run).catch(() => {});
  }, []);

  // Barge-in / interrupt handler
  const handleBargeIn = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
    }
    ttsChainRef.current = Promise.resolve();
    
    abortControllerRef.current?.abort();
    
    setState('interrupted');
    setIsPlaying(false);
    
    ttsQueueRef.current = [];
    streamingContentRef.current = '';
    didStreamSpeakRef.current = false;
    
    // Brief pause then start listening again
    setTimeout(() => {
      setState('listening');
    }, 200);
  }, []);

  // Speech recognition
  const { isListening, isSupported, startListening, stopListening, setAISpeaking } = useSpeechRecognitionWithBargeIn(
    useCallback((text: string, isFinal: boolean) => {
      if (isFinal) {
        setTranscript(text);
        setInterimTranscript('');
        memoryManager.current.add('user', text);
        processInput(text);
      } else {
        setInterimTranscript(text);
      }
    }, []),
    handleBargeIn
  );

  // Process user input with streaming
  const processInput = useCallback(async (input: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    setState('thinking');
    didStreamSpeakRef.current = false;
    
    abortControllerRef.current = new AbortController();
    
    try {
      // Get recent context
      const recentContext = memoryManager.current.getRecentContext(8);
      
      // Stream from API
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
            ventureName: activeProject?.name || 'Unknown',
            strategy: activeProject?.strategy,
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
      
      setState('speaking');
      setAISpeaking(true);
      
      // Process stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Check for interruption
        if (abortControllerRef.current.signal.aborted) {
          break;
        }
        
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
        memoryManager.current.add('assistant', fullResponse, 'main_response');
      }
      didStreamSpeakRef.current = false;
      
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Voice processing error:', error);
        const fallback = "I'm having trouble connecting. Let's try again.";
        enqueueTts(() => speakWithPauses([{ text: fallback, pauseAfter: 120, priority: 'high' }]));
        await ttsChainRef.current;
      }
    } finally {
      isProcessingRef.current = false;
      setAISpeaking(false);
      setState('idle');
      setTranscript('');
      streamingContentRef.current = '';
    }
  }, [activeProject, speakWithPauses, drainSpeechQueue, enqueueTts, setAISpeaking]);

  // Public controls
  const startConversation = useCallback(() => {
    setState('listening');
    startListening();
  }, [startListening]);

  const stopConversation = useCallback(() => {
    stopListening();
    window.speechSynthesis.cancel();
    ttsChainRef.current = Promise.resolve();
    ttsQueueRef.current = [];
    didStreamSpeakRef.current = false;
    abortControllerRef.current?.abort();
    setState('idle');
    setIsPlaying(false);
  }, [stopListening]);

  const interrupt = useCallback(() => {
    handleBargeIn();
  }, [handleBargeIn]);

  const clearMemory = useCallback(() => {
    memoryManager.current.clear();
  }, []);

  return {
    // State
    state,
    transcript,
    interimTranscript,
    isListening,
    isSpeaking: isPlaying || state === 'speaking',
    isSupported,
    currentChunk,
    
    // Controls
    startConversation,
    stopConversation,
    interrupt,
    clearMemory,
    
    // Memory access
    getMemory: () => memoryManager.current.getAll(),
  };
}

export type { VoiceState, ConversationMemory };
