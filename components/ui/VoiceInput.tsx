'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { speechFriendlyText } from '@/lib/speechFriendly';
import { pickEnglishPlaybackVoice, resumeSpeechSynthIfNeeded } from '@/lib/voiceEngine';

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    placeholder?: string;
    className?: string;
    buttonPosition?: 'left' | 'right' | 'standalone';
}

export function VoiceInput({
    onTranscript,
    placeholder = 'Speak to input...',
    className = '',
    buttonPosition = 'right',
}: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [interimTranscript, setInterimTranscript] = useState('');
    const recognitionRef = useRef<SpeechRecognition | null>(null);

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
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += transcript;
                } else {
                    interim += transcript;
                }
            }

            if (interim) {
                setInterimTranscript(interim);
            }

            if (final) {
                onTranscript(final);
                setInterimTranscript('');
            }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                setError('Microphone access denied');
            } else if (event.error === 'no-speech') {
                // Ignore no-speech errors
            } else {
                setError(`Error: ${event.error}`);
            }
            setIsListening(false);
        };

        recognition.onend = () => {
            if (isListening) {
                // Restart if still listening (continuous mode)
                try {
                    recognition.start();
                } catch {
                    setIsListening(false);
                }
            }
        };

        recognitionRef.current = recognition;

        return () => {
            recognition.stop();
        };
    }, [onTranscript]);

    const toggleListening = useCallback(() => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
            setInterimTranscript('');
        } else {
            setError(null);
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (err) {
                setError('Could not start listening');
            }
        }
    }, [isListening]);

    if (!isSupported) {
        return null;
    }

    // Standalone floating button variant
    if (buttonPosition === 'standalone') {
        return (
            <VoiceButtonStandalone
                isListening={isListening}
                error={error}
                onClick={toggleListening}
                interimTranscript={interimTranscript}
            />
        );
    }

    return (
        <div className={`relative flex items-center gap-2 ${className}`}>
            <AnimatePresence>
                {interimTranscript && (
                    <motion.span
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute -top-8 left-0 right-0 text-xs text-[#A1A1AA] truncate"
                    >
                        {interimTranscript}
                    </motion.span>
                )}
            </AnimatePresence>

            <button
                type="button"
                onClick={toggleListening}
                disabled={!!error}
                className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                    isListening
                        ? 'bg-[#F43F5E]/20 text-[#F43F5E] animate-pulse'
                        : error
                        ? 'bg-[#27272A] text-[#52525B] cursor-not-allowed'
                        : 'bg-white/[0.04] text-[#A1A1AA] hover:bg-white/[0.08] hover:text-[#FAFAFA]'
                }`}
                title={isListening ? 'Stop listening' : error || 'Start voice input'}
            >
                {isListening ? (
                    <Mic className="h-4 w-4" />
                ) : error ? (
                    <MicOff className="h-4 w-4" />
                ) : (
                    <Mic className="h-4 w-4" />
                )}

                {/* Ripple effect when listening */}
                {isListening && (
                    <span className="absolute inset-0 rounded-lg animate-ping bg-[#F43F5E]/20" />
                )}
            </button>
        </div>
    );
}

// Standalone floating voice button with waveform animation
function VoiceButtonStandalone({
    isListening,
    error,
    onClick,
    interimTranscript,
}: {
    isListening: boolean;
    error: string | null;
    onClick: () => void;
    interimTranscript: string;
}) {
    return (
        <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end gap-2">
            {/* Transcript preview */}
            <AnimatePresence>
                {interimTranscript && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="max-w-[280px] rounded-xl border border-white/[0.06] px-4 py-3 shadow-lg"
                        style={{
                            background: 'linear-gradient(180deg, rgba(28,28,31,0.98), rgba(24,24,27,0.98))',
                        }}
                    >
                        <p className="text-xs text-[#71717A] mb-1">Listening...</p>
                        <p className="text-sm text-[#FAFAFA]">{interimTranscript}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main button */}
            <motion.button
                type="button"
                onClick={onClick}
                disabled={!!error}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all ${
                    isListening
                        ? 'bg-[#F43F5E] text-white'
                        : error
                        ? 'bg-[#27272A] text-[#52525B] cursor-not-allowed'
                        : 'bg-[#1C1C1F] text-[#FAFAFA] border border-white/[0.08] hover:bg-[#27272A]'
                }`}
                title={isListening ? 'Stop listening' : error || 'Start voice input'}
            >
                {isListening ? (
                    <>
                        <Mic className="h-6 w-6 relative z-10" />
                        {/* Waveform animation */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            {[...Array(3)].map((_, i) => (
                                <motion.span
                                    key={i}
                                    className="absolute rounded-full border border-white/30"
                                    animate={{
                                        width: [56, 80, 56],
                                        height: [56, 80, 56],
                                        opacity: [0.5, 0, 0.5],
                                    }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        delay: i * 0.3,
                                    }}
                                />
                            ))}
                        </div>
                    </>
                ) : error ? (
                    <MicOff className="h-5 w-5" />
                ) : (
                    <Mic className="h-5 w-5" />
                )}
            </motion.button>

            {/* Label */}
            <span className="text-[10px] text-[#71717A]">
                {isListening ? 'Listening...' : error || 'Voice input'}
            </span>
        </div>
    );
}

// Voice-enabled textarea component
interface VoiceTextareaProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
    className?: string;
}

export function VoiceTextarea({
    value,
    onChange,
    placeholder = 'Type or speak...',
    rows = 4,
    className = '',
}: VoiceTextareaProps) {
    const [isListening, setIsListening] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                }
            }

            if (final) {
                onChange(value + (value ? ' ' : '') + final);
            }
        };

        recognition.onend = () => {
            if (isListening) {
                try {
                    recognition.start();
                } catch {
                    setIsListening(false);
                }
            }
        };

        recognitionRef.current = recognition;

        return () => {
            recognition.stop();
        };
    }, [value, onChange, isListening]);

    const toggleListening = useCallback(() => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    }, [isListening]);

    return (
        <div className={`relative ${className}`}>
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className="w-full resize-y rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 pr-12 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:border-white/[0.12] focus:outline-none focus:ring-1 focus:ring-white/[0.08]"
            />

            {/* Voice button */}
            <button
                type="button"
                onClick={toggleListening}
                className={`absolute right-3 bottom-3 flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                    isListening
                        ? 'bg-[#F43F5E]/20 text-[#F43F5E] animate-pulse'
                        : 'bg-white/[0.04] text-[#71717A] hover:bg-white/[0.08] hover:text-[#FAFAFA]'
                }`}
                title={isListening ? 'Stop listening' : 'Start voice input'}
            >
                {isListening ? (
                    <Mic className="h-4 w-4" />
                ) : (
                    <Mic className="h-4 w-4" />
                )}
            </button>

            {/* Listening indicator */}
            {isListening && (
                <div className="absolute right-14 bottom-3 flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-[#1C1C1F] px-2 py-1">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-[#F43F5E] animate-pulse" />
                    <span className="text-[9px] text-[#A1A1AA]">Listening</span>
                </div>
            )}
        </div>
    );
}

// Text-to-speech hook for reading responses
export function useTextToSpeech() {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isSupported, setIsSupported] = useState(true);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            setIsSupported(false);
        }
    }, []);

    const speak = useCallback((text: string) => {
        if (!window.speechSynthesis || !text) return;
        const line = speechFriendlyText(text);
        if (!line) return;

        window.speechSynthesis.cancel();
        resumeSpeechSynthIfNeeded();
        const utterance = new SpeechSynthesisUtterance(line);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        const v = pickEnglishPlaybackVoice();
        if (v) utterance.voice = v;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    }, []);

    const stop = useCallback(() => {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    }, []);

    return { speak, stop, isSpeaking, isSupported };
}

// Speak button component
interface SpeakButtonProps {
    text: string;
    className?: string;
}

export function SpeakButton({ text, className = '' }: SpeakButtonProps) {
    const { speak, stop, isSpeaking, isSupported } = useTextToSpeech();

    if (!isSupported) return null;

    return (
        <button
            type="button"
            onClick={() => (isSpeaking ? stop() : speak(text))}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                isSpeaking
                    ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] animate-pulse'
                    : 'bg-white/[0.04] text-[#71717A] hover:bg-white/[0.08] hover:text-[#FAFAFA]'
            } ${className}`}
            title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
        >
            {isSpeaking ? (
                <VolumeX className="h-4 w-4" />
            ) : (
                <Volume2 className="h-4 w-4" />
            )}
        </button>
    );
}
