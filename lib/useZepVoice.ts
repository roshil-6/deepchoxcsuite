'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface UseZepVoiceOptions {
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
}

export function useZepConversationalVoice({ onTranscript, onInterim }: UseZepVoiceOptions) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

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

    recognition.onstart = () => setVoiceState('listening');
    
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interim = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }
      
      if (interim) {
        setInterimTranscript(interim);
        onInterim?.(interim);
      }
      
      if (finalTranscript) {
        setInterimTranscript('');
        onTranscript(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setVoiceState('idle');
    };

    recognition.onend = () => {
      // Restart if still in listening mode
      if (voiceState === 'listening') {
        recognition.start();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [onTranscript, onInterim, voiceState]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setVoiceState('idle');
    setInterimTranscript('');
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    
    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google US English'))
      || voices.find(v => v.name.includes('Samantha'))
      || voices.find(v => v.lang === 'en-US' && !v.name.includes('Microsoft'))
      || voices[0];
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setVoiceState('speaking');
    utterance.onend = () => setVoiceState('idle');
    utterance.onerror = () => setVoiceState('idle');

    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
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
