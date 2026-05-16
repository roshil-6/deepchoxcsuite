'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface UseZepVoiceOptions {
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  onStateChange?: (state: VoiceState) => void;
}

// Natural speech patterns
const NATURAL_PAUSES = [200, 350, 500, 750]; // ms between sentences
const SENTENCE_ENDERS = /[.!?]+/g;

export function useZepConversationalVoice({ onTranscript, onInterim, onStateChange }: UseZepVoiceOptions) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Update parent when state changes
  useEffect(() => {
    onStateChange?.(voiceState);
  }, [voiceState, onStateChange]);

  // Load preferred voice on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      // Prefer more natural-sounding voices
      const preferredVoice = 
        voices.find(v => v.name.includes('Google US English')) ||
        voices.find(v => v.name.includes('Samantha')) ||
        voices.find(v => v.name.includes('Karen') && v.lang === 'en-AU') ||
        voices.find(v => v.name.includes('Google UK English Female')) ||
        voices.find(v => v.lang === 'en-US' && !v.name.includes('Microsoft')) ||
        voices[0];
      
      if (preferredVoice) {
        voiceRef.current = preferredVoice;
      }
    };

    loadVoice();
    
    // Some browsers load voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoice;
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    // Confidence threshold
    const CONFIDENCE_THRESHOLD = 0.6;

    recognition.onstart = () => {
      setVoiceState('listening');
    };
    
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interim = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        
        // Check confidence for final results
        if (result.isFinal && result[0].confidence >= CONFIDENCE_THRESHOLD) {
          finalTranscript += transcript;
        } else if (!result.isFinal) {
          interim += transcript;
        }
      }
      
      if (interim) {
        setInterimTranscript(interim);
        onInterim?.(interim);
      }
      
      if (finalTranscript.trim()) {
        setInterimTranscript('');
        onTranscript(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      // Don't treat no-speech as an error
      if (event.error === 'no-speech') {
        return;
      }
      console.error('Speech recognition error:', event.error);
      setVoiceState('idle');
    };

    recognition.onend = () => {
      // Only restart if we're still in listening mode
      if (voiceState === 'listening') {
        try {
          recognition.start();
        } catch {
          setVoiceState('idle');
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // Ignore stop errors
      }
    };
  }, [onTranscript, onInterim]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Already started
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
    setVoiceState('idle');
    setInterimTranscript('');
  }, []);

  // Split text into sentences for more natural speech
  const splitIntoSentences = (text: string): string[] => {
    // Split but keep the delimiters
    const parts = text.split(/([.!?]+\s*)/);
    const sentences: string[] = [];
    
    for (let i = 0; i < parts.length; i += 2) {
      const sentence = (parts[i] || '') + (parts[i + 1] || '');
      if (sentence.trim()) {
        sentences.push(sentence.trim());
      }
    }
    
    // If no sentences found, return whole text
    if (sentences.length === 0) {
      return [text];
    }
    
    return sentences;
  };

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const sentences = splitIntoSentences(text);
    let currentIndex = 0;

    const speakNext = () => {
      if (currentIndex >= sentences.length) {
        setVoiceState('idle');
        return;
      }

      const sentence = sentences[currentIndex];
      currentIndex++;

      const utterance = new SpeechSynthesisUtterance(sentence);
      
      // Natural speech rate - slightly slower for clarity
      utterance.rate = 1.0;
      // Slightly higher pitch for more engaging voice
      utterance.pitch = 1.05;
      // Slight volume boost
      utterance.volume = 1.0;
      
      // Use preferred voice
      if (voiceRef.current) {
        utterance.voice = voiceRef.current;
      }

      utterance.onstart = () => setVoiceState('speaking');
      
      utterance.onend = () => {
        // Add natural pause between sentences
        if (currentIndex < sentences.length) {
          const pause = NATURAL_PAUSES[Math.floor(Math.random() * NATURAL_PAUSES.length)];
          setTimeout(speakNext, pause);
        } else {
          setVoiceState('idle');
        }
      };
      
      utterance.onerror = (event) => {
        if (event.error !== 'canceled' && event.error !== 'interrupted') {
          console.error('Speech error:', event.error);
        }
        setVoiceState('idle');
      };

      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };

    speakNext();
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setVoiceState('idle');
  }, []);

  return {
    voiceState,
    interimTranscript,
    isListening: voiceState === 'listening',
    isSpeaking: voiceState === 'speaking',
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
